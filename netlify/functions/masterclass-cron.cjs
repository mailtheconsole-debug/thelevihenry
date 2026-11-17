// Control + diagnostics for the masterclass email sequence. For people, not the scheduler
// (the daily automated send rides followup-send-background). Key-gated with FOLLOWUP_KEY.
//
//   ?report=1          read-only JSON: who is due which step today, and whether it is live.
//   ?preview=<step>    renders that step's email in the browser (a sample lead). Sends nothing.
//   ?test=1[&to=][&step=]  sends ONE step to a single address (default levi@), to preview in
//                      an inbox. Always allowed; only reaches that address.
//   (no params)        capped manual send of what is due, honoring the live switch. Returns
//                      how many were sent / would send and how many remain.
//
// Nothing goes to the list until MASTERCLASS_SEQUENCE_LIVE is set truthy in Netlify.

const { listLeads } = require("./lib/leadstore.cjs");
const { buildReport, sendDue, previewHtml, sendTest } = require("./lib/masterclass-run.cjs");

const CAP = 20; // keeps the synchronous send under Netlify's ~10s wall
const DEFAULT_TEST_TO = "levi@thelevihenry.com";

exports.handler = async (event) => {
  const q = (event && event.queryStringParameters) || {};
  const h = (event && event.headers) || {};
  const key = q.key || h["x-followup-key"] || h["X-Followup-Key"];
  if (!process.env.FOLLOWUP_KEY || key !== process.env.FOLLOWUP_KEY) {
    return { statusCode: 401, body: "nope" };
  }

  // Preview a rendered email in the browser. No store read, no send.
  if (q.preview != null && q.preview !== "") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
      body: previewHtml(q.preview),
    };
  }

  // Test send one step to a single address (yourself), to see a real email in an inbox.
  if (q.test === "1" || q.test === "true") {
    const to = (q.to || DEFAULT_TEST_TO).trim();
    const step = q.step || 1;
    const r = await sendTest(to, step);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    };
  }

  let leads = [];
  try {
    leads = await listLeads();
  } catch (e) {
    console.error("masterclass-cron: could not list leads", e);
    return { statusCode: 200, body: "no store" };
  }

  if (q.report === "1" || q.report === "true") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildReport(leads), null, 2),
    };
  }

  // Capped manual drain. Sends only if MASTERCLASS_SEQUENCE_LIVE is set; otherwise reports
  // what it would send and touches no one.
  const { live, sent, wouldSend, remaining } = await sendDue(leads, { cap: CAP });
  return {
    statusCode: 200,
    body: live
      ? `live, sent ${sent}, remaining ${remaining}`
      : `not live (set MASTERCLASS_SEQUENCE_LIVE to send). would send ${wouldSend} now.`,
  };
};
