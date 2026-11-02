// Captures a free SDR training opt-in (name, email, WhatsApp) the moment someone submits
// the /free-sdr-training form. Three things happen:
//   1. The lead is saved to the Netlify Blobs store so the follow-up sequence can work it.
//   2. Email 1 (the training link) goes out instantly via Resend.
//   3. Levi gets a heads-up email so he can send the first WhatsApp straight away.
// The daily cron (followup-cron) takes over emails 2-5; the worklist page drives WhatsApp.
// Requires RESEND_API_KEY. Never hard-fails: a storage or email hiccup still returns 204.

const { upsertOptin, putLead } = require("./lib/leadstore.cjs");
const { EMAIL_STEPS, renderEmail, SITE } = require("./lib/followup-content.cjs");
const { sendEmail } = require("./lib/mailer.cjs");

const NOTIFY_TO = "levi@thelevihenry.com";
const FROM_GROUP = "Levi Henry Group <levi@thelevihenry.com>";

const esc = (s) =>
  String(s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  try {
    let raw = event.body || "";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
    const p = new URLSearchParams(raw);

    const name = (p.get("name") || "").trim();
    const email = (p.get("email") || "").trim();
    const whatsapp = (p.get("whatsapp") || "").trim();

    // The sequence is keyed off email, so we need one to enrol a lead.
    if (!email) {
      // No email: at least let Levi know someone tried, then stop.
      if (whatsapp) {
        await sendEmail({
          to: NOTIFY_TO,
          from: FROM_GROUP,
          subject: `Free SDR training lead (WhatsApp only): ${name || whatsapp}`,
          html: `<p>Opt-in with no email. Name: ${esc(name) || "(none)"} · WhatsApp: ${esc(whatsapp)}</p>`,
        });
      }
      return { statusCode: 204, body: "" };
    }

    // 1. Save / refresh the lead in the store.
    let lead;
    try {
      const r = await upsertOptin({ name, email, whatsapp });
      lead = r.lead;
    } catch (e) {
      console.error("training-optin: store write failed", e);
    }

    // 2. Send Email 1 instantly (unless this lead already had it on a repeat opt-in).
    if (lead && !(lead.emailsSent || []).includes(1)) {
      const step1 = EMAIL_STEPS.find((s) => s.step === 1);
      const unsubUrl = `${SITE}/.netlify/functions/followup-unsub?token=${lead.unsubToken}`;
      const { subject, html } = renderEmail(step1, lead, unsubUrl);
      const ok = await sendEmail({ to: lead.email, subject, html });
      if (ok) {
        lead.emailsSent = [...new Set([...(lead.emailsSent || []), 1])];
        lead.updatedAt = new Date().toISOString();
        try {
          await putLead(lead);
        } catch (e) {
          console.error("training-optin: could not stamp email 1", e);
        }
      }
    }

    // 3. Heads-up to Levi so the first WhatsApp can go out now (worklist shows it as due).
    await sendEmail({
      to: NOTIFY_TO,
      from: FROM_GROUP,
      replyTo: email,
      subject: `New free SDR training lead: ${name || email}`,
      html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#212c38;line-height:1.6;">
        <p>Someone just opted in for the <strong>free SDR training</strong>. Email 1 is on its way to them; the WhatsApp worklist now shows them as due.</p>
        <p><strong>Name:</strong> ${esc(name) || "(not given)"}<br/>
        <strong>Email:</strong> ${esc(email)}<br/>
        <strong>WhatsApp:</strong> ${esc(whatsapp) || "(not given)"}</p>
      </div>`,
    });

    return { statusCode: 204, body: "" };
  } catch (err) {
    console.error("training-optin error:", err);
    return { statusCode: 204, body: "" };
  }
};
