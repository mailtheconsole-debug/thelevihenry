// One place to send email through Resend, shared by the opt-in and the daily cron.
// The sequence comes from Levi personally, so the From is his name and replies go to
// him. Returns true on success, false on any failure (callers never hard-fail on email).
// Lives in lib/ so Netlify does not treat it as a function.

const FROM = "Levi Henry <levi@thelevihenry.com>";
const REPLY_TO = "levi@thelevihenry.com";

async function sendEmail({ to, subject, html, from, replyTo }) {
  if (!process.env.RESEND_API_KEY) {
    console.error("mailer: RESEND_API_KEY not set");
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo || REPLY_TO,
      }),
    });
    if (!res.ok) {
      console.error("mailer: resend failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("mailer: resend error", e);
    return false;
  }
}

module.exports = { sendEmail, FROM, REPLY_TO };
