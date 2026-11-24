// Sends ONE Black Friday email (by step) to a chosen audience. A BACKGROUND function, so
// Netlify answers 202 and runs up to 15 minutes while it throttles through the list. Fired
// manually, once per email, so a cold list goes out under control. Check results afterwards
// with blackfriday-report (it reads the same store).
//
//   POST/GET https://thelevihenry.com/.netlify/functions/blackfriday-send-background
//   auth:   ?key=<FOLLOWUP_KEY> or header x-followup-key
//   params: step=1..4                 which email (required)
//           audience=warm|cold|all    warm = free-training leads, cold = Mailchimp import,
//                                      all = both (default warm)
//           delay=<ms>                 gap between sends (default 600, ~<2/sec for Resend)
//           limit=<n>                  cap this run (optional; re-fire to continue)
//
// Each recipient is stamped in bfSent, so re-firing the same step never sends twice. Blocked
// by SUPPRESS and by status "unsubscribed". Never sends to the SDR nurture store directly.

const { listLeads } = require("./lib/leadstore.cjs");
const { sendEmail } = require("./lib/mailer.cjs");
const { SITE, SUPPRESS, getStep, renderEmail } = require("./lib/blackfriday-content.cjs");
const { loadDoc, saveDoc, normEmail, mkToken } = require("./lib/blackfriday-store.cjs");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

exports.handler = async (event) => {
  const q = (event && event.queryStringParameters) || {};
  const h = (event && event.headers) || {};
  const key = q.key || h["x-followup-key"] || h["X-Followup-Key"];
  if (!process.env.FOLLOWUP_KEY || key !== process.env.FOLLOWUP_KEY) {
    console.error("blackfriday-send: bad or missing key");
    return { statusCode: 401, body: "nope" };
  }

  const step = getStep(q.step);
  if (!step) {
    console.error("blackfriday-send: bad step", q.step);
    return { statusCode: 400, body: "step must be 1..4" };
  }
  const audience = (q.audience || "warm").toLowerCase();
  if (!["warm", "cold", "all"].includes(audience)) {
    return { statusCode: 400, body: "audience must be warm|cold|all" };
  }
  const delay = Math.max(0, Number(q.delay) || 600);
  const limit = q.limit ? Math.max(1, Number(q.limit)) : Infinity;

  const doc = await loadDoc();

  // Sync active free-training leads into the store as source "lead" (idempotent). A person
  // who is in both the Mailchimp import and the leads is treated as a lead (warm).
  let leads = [];
  try {
    leads = await listLeads();
  } catch (e) {
    console.error("blackfriday-send: could not list leads", e);
  }
  for (const l of leads) {
    if (!l || l.status !== "active" || !l.email) continue;
    const email = normEmail(l.email);
    const existing = doc.byEmail[email];
    if (existing) {
      existing.source = "lead";
      if (!existing.first && l.name) existing.first = String(l.name).split(/\s+/)[0];
    } else {
      doc.byEmail[email] = {
        first: String(l.name || "").split(/\s+/)[0],
        source: "lead",
        status: "active",
        bfSent: [],
        unsubToken: mkToken(),
      };
    }
  }
  await saveDoc(doc);

  // Exclude anyone who has already bought the course. stop-on-buy marks their training lead
  // "bought"; a buyer should never get another sale email.
  const bought = new Set(
    (leads || [])
      .filter((l) => l && l.status === "bought" && l.email)
      .map((l) => normEmail(l.email))
  );

  // Build the eligible pool.
  const wantSource = (src) =>
    audience === "all" ? true : audience === "warm" ? src === "lead" : src === "mailchimp";
  const pool = [];
  for (const [email, rec] of Object.entries(doc.byEmail)) {
    if (rec.status !== "active") continue;
    if (SUPPRESS.has(email)) continue;
    if (bought.has(email)) continue;
    if (!wantSource(rec.source)) continue;
    if (Array.isArray(rec.bfSent) && rec.bfSent.includes(step.step)) continue;
    pool.push({ email, rec });
  }

  // Durable buyer exclusion. Ask the Academy which of these recipients have bought the course.
  // This catches buyers the local lead store never recorded (most purchases go straight through
  // Paystack) and anyone who buys mid-campaign. One batched call per 1,000 recipients. Levi's
  // own accounts are never returned as buyers, so they stay on the list. Per the endpoint
  // contract: if the check is enabled (BUYERS_CHECK_KEY set) but any call does not return 200,
  // SKIP the whole run rather than risk emailing buyers. If the key is unset, fall back to the
  // lead-store "bought" filter above and send normally.
  const buyersKey = process.env.BUYERS_CHECK_KEY;
  if (buyersKey && pool.length) {
    const ACADEMY = "https://learn.thelevihenry.com/api/buyers/check";
    const emails = pool.map((p) => p.email);
    const boughtLive = new Set();
    for (let i = 0; i < emails.length; i += 1000) {
      const batch = emails.slice(i, i + 1000);
      let res;
      try {
        res = await fetch(ACADEMY, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-buyers-key": buyersKey },
          body: JSON.stringify({ emails: batch, course: "remote-sdr-training" }),
        });
      } catch (e) {
        console.error("blackfriday-send: buyer-check unreachable", e);
        return { statusCode: 200, body: "aborted: buyer-check unreachable, no emails sent" };
      }
      if (!res.ok) {
        console.error("blackfriday-send: buyer-check HTTP", res.status);
        return { statusCode: 200, body: `aborted: buyer-check HTTP ${res.status}, no emails sent` };
      }
      let data;
      try {
        data = await res.json();
      } catch (e) {
        console.error("blackfriday-send: buyer-check bad JSON", e);
        return { statusCode: 200, body: "aborted: buyer-check bad response, no emails sent" };
      }
      for (const b of (data && data.bought) || []) boughtLive.add(normEmail(b));
    }
    if (boughtLive.size) {
      for (let i = pool.length - 1; i >= 0; i--) {
        if (boughtLive.has(pool[i].email)) pool.splice(i, 1);
      }
    }
    console.log(`blackfriday-send: buyer-check excluded ${boughtLive.size}, pool now ${pool.length}`);
  }

  let sent = 0,
    failed = 0,
    done = 0;
  for (const { email, rec } of pool) {
    if (done >= limit) break;
    done++;
    const unsubUrl = `${SITE}/.netlify/functions/blackfriday-unsub?token=${rec.unsubToken}`;
    const { subject, html } = renderEmail(step, rec, unsubUrl);
    let ok = false;
    try {
      ok = await sendEmail({ to: email, subject, html });
    } catch (e) {
      console.error("blackfriday-send: send error", email, e);
    }
    if (ok) {
      rec.bfSent = Array.isArray(rec.bfSent) ? rec.bfSent : [];
      rec.bfSent.push(step.step);
      sent++;
      if (sent % 25 === 0) await saveDoc(doc); // checkpoint so a crash loses little
    } else {
      failed++;
    }
    if (delay) await sleep(delay);
  }
  await saveDoc(doc);

  const msg = `blackfriday-send step ${step.step} audience ${audience}: eligible ${pool.length}, sent ${sent}, failed ${failed}`;
  console.log(msg);
  return { statusCode: 200, body: msg };
};
