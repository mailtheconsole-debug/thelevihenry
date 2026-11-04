// The daily follow-up sender. A BACKGROUND function: Netlify answers the HTTP call with
// an immediate 202 and then runs this for up to 15 minutes, so a large batch of sends can
// never time out the way the old synchronous endpoint did (it hit Netlify's 10-second
// wall after ~29 sends). cron-job.org calls this once a day:
//
//   https://thelevihenry.com/.netlify/functions/followup-send-background
//   header: x-followup-key: <FOLLOWUP_KEY>
//
// For every active lead it sends the next due email (one per lead), stamps it, then emails
// Levi a short nudge listing how many WhatsApp follow-ups are waiting on the worklist.
//
// Auth: the key must arrive as ?key=<FOLLOWUP_KEY> or an x-followup-key header. A caller
// always gets the 202 (that is how background functions work), but without the key this
// does no work.

const { listLeads } = require("./lib/leadstore.cjs");
const { sendDue, nudgeLevi } = require("./lib/followup-run.cjs");

exports.handler = async (event) => {
  const q = (event && event.queryStringParameters) || {};
  const h = (event && event.headers) || {};
  const key = q.key || h["x-followup-key"] || h["X-Followup-Key"];
  if (!process.env.FOLLOWUP_KEY || key !== process.env.FOLLOWUP_KEY) {
    console.error("followup-send-background: bad or missing key");
    return { statusCode: 401, body: "nope" };
  }

  let leads = [];
  try {
    leads = await listLeads();
  } catch (e) {
    console.error("followup-send-background: could not list leads", e);
    return { statusCode: 200, body: "no store" };
  }

  const { emailsSent, whatsappDue } = await sendDue(leads);
  await nudgeLevi(whatsappDue, process.env.FOLLOWUP_KEY);

  console.log(
    `followup-send-background: sent ${emailsSent} email${
      emailsSent === 1 ? "" : "s"
    }, ${whatsappDue} whatsapp due`
  );
  return { statusCode: 200, body: `emails ${emailsSent}, whatsapp due ${whatsappDue}` };
};
