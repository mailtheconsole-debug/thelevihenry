// Dedicated scheduled sender for the masterclass sequence, so it goes out at a chosen hour
// (10am WAT) instead of whenever the SDR daily cron runs. A BACKGROUND function: Netlify
// answers 202 at once and runs this for up to 15 minutes, so the whole batch sends in one
// hit with no cap. Hit it once a day by a scheduler:
//
//   https://thelevihenry.com/.netlify/functions/masterclass-send-background
//   header: x-followup-key: <FOLLOWUP_KEY>
//
// It sends whatever step is due that calendar date (date-gated in masterclass-content), so
// a daily hit sends step 1 on Nov 17, nothing on Nov 18, step 2 on Nov 19, and so on. Each
// lead is stamped in mcSent, so a repeat hit the same day sends no one twice. It force-sends
// regardless of MASTERCLASS_SEQUENCE_LIVE, which stays off so the SDR cron never touches it.
//
// Auth: the key must arrive as ?key=<FOLLOWUP_KEY> or an x-followup-key header. Without it,
// this does no work (a background function still returns 202 either way).

const { listLeads } = require("./lib/leadstore.cjs");
const { sendDue } = require("./lib/masterclass-run.cjs");

exports.handler = async (event) => {
  const q = (event && event.queryStringParameters) || {};
  const h = (event && event.headers) || {};
  const key = q.key || h["x-followup-key"] || h["X-Followup-Key"];
  if (!process.env.FOLLOWUP_KEY || key !== process.env.FOLLOWUP_KEY) {
    console.error("masterclass-send-background: bad or missing key");
    return { statusCode: 401, body: "nope" };
  }

  let leads = [];
  try {
    leads = await listLeads();
  } catch (e) {
    console.error("masterclass-send-background: could not list leads", e);
    return { statusCode: 200, body: "no store" };
  }

  const { sent, remaining } = await sendDue(leads, { force: true });
  console.log(`masterclass-send-background: sent ${sent}, remaining ${remaining}`);
  return { statusCode: 200, body: `masterclass sent ${sent}, remaining ${remaining}` };
};
