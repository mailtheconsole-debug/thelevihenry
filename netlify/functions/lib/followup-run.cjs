// Shared follow-up send/report logic, used by two thin handlers:
//   - followup-send-background.cjs: a Netlify BACKGROUND function (15-minute budget,
//     returns 202 at once) that cron-job.org calls once a day to send everything due.
//   - followup-cron.cjs: a normal synchronous function for ?report=1 diagnostics and a
//     capped manual catch-up (the PowerShell backup loop), so it can never time out.
//
// Keeping the loop in one place means the automated send and the manual drain can never
// drift apart.

const { putLead } = require("./leadstore.cjs");
const {
  renderEmail,
  nextDueEmail,
  nextDueWhatsApp,
  SITE,
} = require("./followup-content.cjs");
const { sendEmail } = require("./mailer.cjs");

const NOTIFY_TO = "levi@thelevihenry.com";
const FROM_GROUP = "Levi Henry Group <levi@thelevihenry.com>";

// Read-only: how far each active lead has progressed and what is owed right now,
// without sending anything. Confirms whether the job has been delivering.
function buildReport(leads) {
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
    mode: "report",
    totalLeads: leads.length,
    active,
    withEmail,
    owedEmailNow,
    progressedPastEmail1,
    nextStepDist,
    furthestSentDist,
    whatsappDue,
  };
}

// Send the next due email to each active lead (one per lead per run, so nobody gets a
// burst). Sends are sequential to respect the mail provider's rate limit. With a finite
// `cap`, stops sending after that many and reports how many emails are still owed, so a
// capped caller can loop until `remaining` is 0. Uncapped (the background function) it
// drains the whole backlog in one run.
async function sendDue(leads, { cap = Infinity } = {}) {
  let emailsSent = 0;
  let whatsappDue = 0;
  let remaining = 0;

  for (const lead of leads) {
    if (lead.status !== "active") continue;

    const step = lead.email ? nextDueEmail(lead) : null;
    if (step) {
      if (emailsSent >= cap) {
        // Over the cap for this run: count it as still owed and move on.
        remaining++;
      } else {
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
            console.error("followup: could not stamp email", lead.email, e);
          }
        }
      }
    }

    if (lead.whatsapp && nextDueWhatsApp(lead)) whatsappDue++;
  }

  return { emailsSent, whatsappDue, remaining };
}

// Nudge Levi to run today's WhatsApp follow-ups, with a direct link to the worklist.
async function nudgeLevi(whatsappDue, key) {
  if (whatsappDue <= 0 || !key) return;
  const worklist = `${SITE}/.netlify/functions/followups?key=${key}`;
  await sendEmail({
    to: NOTIFY_TO,
    from: FROM_GROUP,
    subject: `${whatsappDue} WhatsApp follow-up${
      whatsappDue === 1 ? "" : "s"
    } waiting`,
    html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#212c38;line-height:1.6;">
        <p>You have <strong>${whatsappDue}</strong> WhatsApp follow-up${
      whatsappDue === 1 ? "" : "s"
    } to send today.</p>
        <p><a href="${worklist}">Open the worklist</a> and tap through each one. Takes a couple of minutes.</p>
      </div>`,
  });
}

module.exports = { buildReport, sendDue, nudgeLevi };
