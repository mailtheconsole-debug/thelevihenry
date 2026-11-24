// Read-only visibility + test send for the Black Friday broadcast. Regular function, so it
// returns JSON right away. Auth with FOLLOWUP_KEY (?key= or x-followup-key header).
//
//   GET .../blackfriday-report                         store summary + per-step sent counts
//   GET .../blackfriday-report?dry=1&step=1&audience=warm   eligible count, sends nothing
//   GET .../blackfriday-report?test=levi@x.com&step=1  send ONLY email 1 to that address now
//
// The dry/summary numbers merge the live free-training leads in memory (same rule the sender
// uses) without writing anything, so they match what a real send would target.

const { listLeads } = require("./lib/leadstore.cjs");
const { sendEmail } = require("./lib/mailer.cjs");
const { SITE, SUPPRESS, getStep, renderEmail } = require("./lib/blackfriday-content.cjs");
const { loadDoc, normEmail } = require("./lib/blackfriday-store.cjs");

function json(obj, code = 200) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) };
}

// Merge active leads into the doc's map IN MEMORY (no save), so counts reflect a real send.
async function mergedMap(doc) {
  const map = {};
  for (const [email, rec] of Object.entries(doc.byEmail)) map[email] = { ...rec };
  let leads = [];
  try {
    leads = await listLeads();
  } catch (e) {
    /* counts just omit leads if the store is unreachable */
  }
  for (const l of leads) {
    if (!l || !l.email) continue;
    const email = normEmail(l.email);
    // Buyers are excluded from sends, so mirror that in the counts: mark them "bought".
    if (l.status === "bought") {
      if (map[email]) map[email].status = "bought";
      continue;
    }
    if (l.status !== "active") continue;
    if (map[email]) map[email].source = "lead";
    else map[email] = { first: "", source: "lead", status: "active", bfSent: [] };
  }
  return map;
}

exports.handler = async (event) => {
  const q = (event && event.queryStringParameters) || {};
  const h = (event && event.headers) || {};
  const key = q.key || h["x-followup-key"] || h["X-Followup-Key"];
  if (!process.env.FOLLOWUP_KEY || key !== process.env.FOLLOWUP_KEY) {
    return { statusCode: 401, body: "nope" };
  }

  const doc = await loadDoc();

  // Test send: one email, now, to the given address. Does not touch the store.
  if (q.test) {
    const step = getStep(q.step);
    if (!step) return json({ error: "test needs step=1..4" }, 400);
    const to = normEmail(q.test);
    const unsubUrl = `${SITE}/.netlify/functions/blackfriday-unsub?token=TEST`;
    const { subject, html } = renderEmail(step, { first: q.first || "Levi" }, unsubUrl);
    const ok = await sendEmail({ to, subject, html });
    return json({ test: to, step: step.step, subject, sent: ok });
  }

  const map = await mergedMap(doc);
  const entries = Object.entries(map);

  // Live buyer-check verifier (?check=1): ask the Academy endpoint which of the full active
  // list have bought, and return counts only (no PII). Confirms the endpoint and the shared
  // key work before a real send. audience defaults to all; buyersFound ~10 expected. A 401
  // means the Netlify key does not match the Vercel one.
  if (q.check) {
    const audience = (q.audience || "all").toLowerCase();
    const wantSource = (src) =>
      audience === "all" ? true : audience === "warm" ? src === "lead" : src === "mailchimp";
    const candidates = [];
    for (const [email, rec] of entries) {
      if (rec.status !== "active") continue;
      if (SUPPRESS.has(email)) continue;
      if (!wantSource(rec.source)) continue;
      candidates.push(email);
    }
    const buyersKey = process.env.BUYERS_CHECK_KEY;
    if (!buyersKey) return json({ check: true, candidates: candidates.length, error: "BUYERS_CHECK_KEY not set in Netlify" });
    const ACADEMY = "https://learn.thelevihenry.com/api/buyers/check";
    let buyersFound = 0;
    for (let i = 0; i < candidates.length; i += 1000) {
      const batch = candidates.slice(i, i + 1000);
      let res;
      try {
        res = await fetch(ACADEMY, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-buyers-key": buyersKey },
          body: JSON.stringify({ emails: batch, course: "remote-sdr-training" }),
        });
      } catch (e) {
        return json({ check: true, candidates: candidates.length, error: "endpoint unreachable" });
      }
      if (!res.ok) {
        return json({
          check: true,
          candidates: candidates.length,
          status: res.status,
          error: res.status === 401 ? "401: Netlify key does not match Vercel" : `HTTP ${res.status}`,
        });
      }
      let data;
      try {
        data = await res.json();
      } catch (e) {
        return json({ check: true, candidates: candidates.length, error: "bad JSON from endpoint" });
      }
      buyersFound += ((data && data.bought) || []).length;
    }
    return json({ check: true, candidates: candidates.length, buyersFound });
  }

  // Dry run: eligible count for a step + audience, sends nothing.
  if (q.dry) {
    const step = getStep(q.step);
    if (!step) return json({ error: "dry needs step=1..4" }, 400);
    const audience = (q.audience || "warm").toLowerCase();
    const wantSource = (src) =>
      audience === "all" ? true : audience === "warm" ? src === "lead" : src === "mailchimp";
    let eligible = 0;
    for (const [email, rec] of entries) {
      if (rec.status !== "active") continue;
      if (SUPPRESS.has(email)) continue;
      if (!wantSource(rec.source)) continue;
      if (Array.isArray(rec.bfSent) && rec.bfSent.includes(step.step)) continue;
      eligible++;
    }
    return json({ dry: true, step: step.step, audience, eligible });
  }

  // Default: summary of the store.
  const summary = {
    total: entries.length,
    bySource: { lead: 0, mailchimp: 0 },
    byStatus: { active: 0, unsubscribed: 0 },
    sentPerStep: { 1: 0, 2: 0, 3: 0, 4: 0 },
    suppressedPresent: 0,
  };
  for (const [email, rec] of entries) {
    summary.bySource[rec.source] = (summary.bySource[rec.source] || 0) + 1;
    summary.byStatus[rec.status] = (summary.byStatus[rec.status] || 0) + 1;
    if (SUPPRESS.has(email)) summary.suppressedPresent++;
    for (const n of rec.bfSent || []) summary.sentPerStep[n] = (summary.sentPerStep[n] || 0) + 1;
  }
  return json(summary);
};
