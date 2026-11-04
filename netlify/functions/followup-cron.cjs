// Daily follow-up job. A GitHub Action (.github/workflows/followup-emails.yml) calls
// this over HTTP once a day at 07:00 UTC (08:00 Lagos). For every active lead it sends
// the next due email in the sequence (one per lead per run, so nobody gets a burst),
// stamps it, and then emails Levi a short nudge listing how many WhatsApp follow-ups
// are waiting on the worklist.
//
// Auth: every HTTP call must carry the key, as ?key=<FOLLOWUP_KEY> or an
// x-followup-key header. GET/POST with ?report=1 (key required) returns a read-only
// JSON summary of what WOULD send, without sending anything, for diagnostics.

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
  // Every HTTP call must carry the key, in ?key= or an x-followup-key header.
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

  // Read-only diagnostics: how far each lead has progressed and what is owed now,
  // without sending a single email. Confirms whether the job has been delivering.
  if (reportOnly) {
    let active = 0;
    let withEmail = 0;
    let owedEmailNow = 0;
    let progressedPastEmail1 = 0;
    const nextStepDist = {};
    const furthestSentDist = {};
    let whatsappDue = 0;
    for (const lead of leads) {
      if (lead.status !== "active") continue;
      active++;
      if (lead.email) withEmail++;
      const sent = lead.emailsSent || [];
      const furthest = sent.length ? Math.max(...sent) : 0;
      furthestSentDist[furthest] = (furthestSentDist[furthest] || 0) + 1;
      if (sent.some((s) => s >= 2)) progressedPastEmail1++;
      const step = lead.email ? nextDueEmail(lead) : null;
      if (step) {
        owedEmailNow++;
        nextStepDist[step.step] = (nextStepDist[step.step] || 0) + 1;
      }
      if (lead.whatsapp && nextDueWhatsApp(lead)) whatsappDue++;
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        {
          mode: "report",
          totalLeads: leads.length,
          active,
          withEmail,
          owedEmailNow,
          progressedPastEmail1,
          nextStepDist,
          furthestSentDist,
          whatsappDue,
        },
        null,
        2
      ),
    };
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
