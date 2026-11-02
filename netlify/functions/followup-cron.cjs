// Daily follow-up job. Runs once a day on a schedule (see netlify.toml) at 07:00 UTC,
// which is 08:00 Lagos. For every active lead it sends the next due email in the
// sequence (one per lead per run, so nobody gets a burst), stamps it, and then emails
// Levi a short nudge listing how many WhatsApp follow-ups are waiting on the worklist.
//
// It can also be triggered by hand for testing with GET ?key=<FOLLOWUP_KEY>. Scheduled
// runs carry no HTTP method and are always allowed; any HTTP call must carry the key.

const { listLeads, putLead } = require("./lib/leadstore.cjs");
const {
  renderEmail,
  nextDueEmail,
  nextDueWhatsApp,
  SITE,
} = require("./lib/followup-content.cjs");
const { sendEmail } = require("./lib/mailer.cjs");

const NOTIFY_TO = "levi@thelevihenry.com";
const FROM_GROUP = "Levi Henry Group <levi@thelevihenry.com>";

exports.handler = async (event) => {
  // Guard HTTP invocations behind the key. Scheduled invocations have no httpMethod.
  if (event && event.httpMethod) {
    const key = (event.queryStringParameters || {}).key;
    if (!process.env.FOLLOWUP_KEY || key !== process.env.FOLLOWUP_KEY) {
      return { statusCode: 401, body: "nope" };
    }
  }

  let leads = [];
  try {
    leads = await listLeads();
  } catch (e) {
    console.error("followup-cron: could not list leads", e);
    return { statusCode: 200, body: "no store" };
  }

  let emailsSent = 0;
  let whatsappDue = 0;

  for (const lead of leads) {
    if (lead.status !== "active") continue;

    // One due email per lead per run (the earliest one still owed).
    const step = lead.email ? nextDueEmail(lead) : null;
    if (step) {
      const unsubUrl = `${SITE}/.netlify/functions/followup-unsub?token=${lead.unsubToken}`;
      const { subject, html } = renderEmail(step, lead, unsubUrl);
      const ok = await sendEmail({ to: lead.email, subject, html });
      if (ok) {
        lead.emailsSent = [...new Set([...(lead.emailsSent || []), step.step])];
        lead.updatedAt = new Date().toISOString();
        try {
          await putLead(lead);
          emailsSent++;
        } catch (e) {
          console.error("followup-cron: could not stamp email", lead.email, e);
        }
      }
    }

    if (lead.whatsapp && nextDueWhatsApp(lead)) whatsappDue++;
  }

  // Nudge Levi to run today's WhatsApp follow-ups, with a direct link to the worklist.
  if (whatsappDue > 0 && process.env.FOLLOWUP_KEY) {
    const worklist = `${SITE}/.netlify/functions/followups?key=${process.env.FOLLOWUP_KEY}`;
    await sendEmail({
      to: NOTIFY_TO,
      from: FROM_GROUP,
      subject: `${whatsappDue} WhatsApp follow-up${whatsappDue === 1 ? "" : "s"} waiting`,
      html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#212c38;line-height:1.6;">
        <p>You have <strong>${whatsappDue}</strong> WhatsApp follow-up${
        whatsappDue === 1 ? "" : "s"
      } to send today.</p>
        <p><a href="${worklist}">Open the worklist</a> and tap through each one. Takes a couple of minutes.</p>
      </div>`,
    });
  }

  return { statusCode: 200, body: `emails ${emailsSent}, whatsapp due ${whatsappDue}` };
};
