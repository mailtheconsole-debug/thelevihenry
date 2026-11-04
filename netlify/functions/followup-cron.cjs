// Diagnostics + manual catch-up for the follow-up emails. The automated daily send runs
// in followup-send-background.cjs (a background function); this synchronous endpoint is
// for people, not the scheduler:
//
//   ?report=1   read-only JSON summary of what WOULD send, sends nothing.
//   (no report) sends at most CAP due emails, then returns how many remain, so the
//               PowerShell backup loop can call it until "remaining 0". The cap keeps
//               this call well under Netlify's 10-second synchronous timeout.
//
// Auth: the key must arrive as ?key=<FOLLOWUP_KEY> or an x-followup-key header.

const { listLeads } = require("./lib/leadstore.cjs");
const { buildReport, sendDue } = require("./lib/followup-run.cjs");

// Sends take ~0.3s each against the mail API; 20 stays comfortably under the 10s wall.
const CAP = 20;

exports.handler = async (event) => {
  const q = (event && event.queryStringParameters) || {};
  const h = (event && event.headers) || {};
  const key = q.key || h["x-followup-key"] || h["X-Followup-Key"];
  if (!process.env.FOLLOWUP_KEY || key !== process.env.FOLLOWUP_KEY) {
    return { statusCode: 401, body: "nope" };
  }
  const reportOnly = q.report === "1" || q.report === "true";

  let leads = [];
  try {
    leads = await listLeads();
  } catch (e) {
    console.error("followup-cron: could not list leads", e);
    return { statusCode: 200, body: "no store" };
  }

  if (reportOnly) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildReport(leads), null, 2),
    };
  }

  // Capped manual drain. No Levi nudge here: the backup loop may call this many times,
  // and the daily background send is what nudges him once a day.
  const { emailsSent, whatsappDue, remaining } = await sendDue(leads, { cap: CAP });
  return {
    statusCode: 200,
    body: `emails ${emailsSent}, remaining ${remaining}, whatsapp due ${whatsappDue}`,
  };
};
