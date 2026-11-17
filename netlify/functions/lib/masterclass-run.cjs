// Send/report logic for the masterclass sequence, kept separate from the SDR runner so the
// two never interfere. The actual sending is gated behind MASTERCLASS_SEQUENCE_LIVE: until
// that env var is set truthy in Netlify, this reports and previews but sends nothing to the
// list. A test send to a single address (preview to yourself) always works.

const { putLead } = require("./leadstore.cjs");
const {
  MASTERCLASS_STEPS,
  renderMasterclassEmail,
  nextDueMasterclass,
  watToday,
  SITE,
} = require("./masterclass-content.cjs");
const { sendEmail } = require("./mailer.cjs");

// The live switch. Off by default: nothing goes to the list until this is set in Netlify.
function isLive() {
  const v = String(process.env.MASTERCLASS_SEQUENCE_LIVE || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

function unsubUrlFor(lead) {
  return `${SITE}/.netlify/functions/followup-unsub?token=${lead.unsubToken}`;
}

// Read-only: what the sequence would do right now. Sends nothing.
function buildReport(leads, now = Date.now()) {
  let active = 0;
  let withEmail = 0;
  let dueNow = 0;
  const dueByStep = {};
  const sentByFurthest = {};
  for (const lead of leads) {
    if (lead.status !== "active") continue;
    active++;
    if (lead.email) withEmail++;
    const sent = lead.mcSent || [];
    const furthest = sent.length ? Math.max.apply(null, sent) : 0;
    sentByFurthest[furthest] = (sentByFurthest[furthest] || 0) + 1;
    const step = nextDueMasterclass(lead, now);
    if (step) {
      dueNow++;
      dueByStep[step.step] = (dueByStep[step.step] || 0) + 1;
    }
  }
  return {
    mode: "report",
    live: isLive(),
    watToday: watToday(now),
    totalLeads: leads.length,
    active,
    withEmail,
    dueNow,
    dueByStep,
    sentByFurthest,
    steps: MASTERCLASS_STEPS.map((s) => ({ step: s.step, sendOn: s.sendOn, subject: s.subject })),
  };
}

// Send the next due masterclass email to each active lead (one per lead per run). Honors
// the live switch; with it off, returns what it WOULD send without touching anyone. `skip`
// is a Set of emails already mailed in this run (so a lead never gets two emails one day).
async function sendDue(leads, { cap = Infinity, now = Date.now(), skip = new Set(), force = false } = {}) {
  // `force` lets a dedicated scheduled sender run at a chosen hour even while the shared
  // live switch is off, so the daily SDR cron never sends these at its own hour.
  const live = force || isLive();
  let sent = 0;
  let wouldSend = 0;
  let remaining = 0;

  for (const lead of leads) {
    if (lead.status !== "active" || !lead.email) continue;
    if (skip.has(lead.email)) continue;
    const step = nextDueMasterclass(lead, now);
    if (!step) continue;

    if (!live) {
      wouldSend++;
      continue;
    }
    if (sent >= cap) {
      remaining++;
      continue;
    }
    const { subject, html } = renderMasterclassEmail(step, lead, unsubUrlFor(lead));
    const ok = await sendEmail({ to: lead.email, subject, html });
    if (ok) {
      lead.mcSent = [...new Set([...(lead.mcSent || []), step.step])];
      lead.updatedAt = new Date().toISOString();
      try {
        await putLead(lead);
        sent++;
      } catch (e) {
        console.error("masterclass: could not stamp send", lead.email, e);
      }
    }
  }
  return { live, sent, wouldSend, remaining };
}

// Render one step for a sample lead, for an in-browser preview of the actual email.
function previewHtml(stepNum, now = Date.now()) {
  const step = MASTERCLASS_STEPS.find((s) => s.step === Number(stepNum)) || MASTERCLASS_STEPS[0];
  const sample = { name: "there", email: "preview@example.com", unsubToken: "preview" };
  const { subject, html } = renderMasterclassEmail(step, sample, unsubUrlFor(sample));
  return `<!doctype html><meta charset="utf-8"><title>${subject}</title>
<div style="background:#f7f4ec;padding:24px;font-family:-apple-system,Segoe UI,Arial,sans-serif;">
<p style="max-width:560px;margin:0 auto 12px;color:#8a8a84;font-size:13px;">Subject: <strong>${subject}</strong> &middot; step ${step.step} &middot; sends ${step.sendOn}</p>
${html}</div>`;
}

// Send one step to a single address, so Levi can see a real email in his own inbox before
// going live. Always allowed (it only reaches the address given).
async function sendTest(to, stepNum = 1, now = Date.now()) {
  const step = MASTERCLASS_STEPS.find((s) => s.step === Number(stepNum)) || MASTERCLASS_STEPS[0];
  const sample = { name: "there", email: to, unsubToken: "preview" };
  const { subject, html } = renderMasterclassEmail(step, sample, unsubUrlFor(sample));
  const ok = await sendEmail({ to, subject: `[TEST] ${subject}`, html });
  return { ok, to, step: step.step };
}

module.exports = { isLive, buildReport, sendDue, previewHtml, sendTest };
