// HTTP function the free "Remote SDR Career Blueprint" ebook form POSTs to.
// It emails the subscriber, notifies the team, logs the lead to Airtable, and
// redirects to the thank-you page. Requires the Netlify env var RESEND_API_KEY.
//
// Delivery link: set EBOOK_URL (Netlify env var) to the hosted PDF/download URL.
// If it is not set, the email tells the subscriber their copy is on its way and
// the team follows up manually.

const FROM = "Levi Henry Group <levi@thelevihenry.com>";
const NOTIFY_TO = "levi@thelevihenry.com";
const EBOOK_URL =
  process.env.EBOOK_URL ||
  "https://thelevihenry.com/assets/downloads/remote-sdr-career-blueprint.pdf";

function redirect(location) {
  return { statusCode: 302, headers: { Location: location }, body: "" };
}

async function sendEmail(payload) {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

// Log a record to the Airtable CRM. Best effort: skips if not configured.
async function addToAirtable(fields) {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE || "CRM";
  if (!token || !baseId) return;
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields, typecast: true }),
      }
    );
    if (!res.ok) console.error("Airtable write failed:", res.status, await res.text());
  } catch (e) {
    console.error("Airtable error:", e);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    let raw = event.body || "";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
    const params = new URLSearchParams(raw);

    const email = (params.get("email") || "").trim();
    const name = (params.get("name") || "").trim();
    const honeypot = (params.get("bot-field") || "").trim();

    if (honeypot) return redirect("/ebook-thanks");
    if (!email) return redirect("/individuals?err=email");

    const firstName = name ? name.split(/\s+/)[0] : "there";
    const downloadBlock = EBOOK_URL
      ? `<p><a href="${EBOOK_URL}" style="color:#14273f;font-weight:600;">Download The Remote SDR Career Blueprint &rarr;</a></p>`
      : `<p>Your copy is on its way — we'll email it to you shortly.</p>`;

    // 1) Deliver / confirm to the subscriber.
    const leadRes = await sendEmail({
      from: FROM,
      to: [email],
      reply_to: "levi@thelevihenry.com",
      subject: "Your Remote SDR Career Blueprint",
      html: `
        <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#212c38;">
          <p>Hi ${firstName},</p>
          <p>Thanks for grabbing <strong>The Remote SDR Career Blueprint</strong> — our free guide to breaking into remote tech sales.</p>
          ${downloadBlock}
          <p>When you're ready to go deeper, the Remote SDR Mastery Course walks you through it step by step, and you can always book a free discovery call with our team: <a href="https://thelevihenry.com/book-discovery" style="color:#14273f;font-weight:600;">book a call</a>.</p>
          <p>&mdash; The Levi Henry Group team</p>
        </div>`,
    });
    if (!leadRes.ok) console.error("ebook email failed:", leadRes.status, await leadRes.text());

    // 2) Notify the team of the new lead (best effort).
    try {
      await sendEmail({
        from: FROM,
        to: [NOTIFY_TO],
        reply_to: email,
        subject: `New SDR Blueprint ebook lead: ${name || email}`,
        html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#212c38;">
          <p>New free-ebook signup:</p>
          <p><strong>Name:</strong> ${name || "(not given)"}<br/>
          <strong>Email:</strong> ${email}</p>
          ${EBOOK_URL ? "" : "<p><em>EBOOK_URL is not set — send the PDF to this subscriber.</em></p>"}
          </div>`,
      });
    } catch (e) {
      console.error("ebook notification failed:", e);
    }

    // 3) Log to the CRM (best effort).
    await addToAirtable({
      Name: name,
      Email: email,
      Source: "SDR Blueprint ebook",
      Status: "New",
    });

    return redirect("/ebook-thanks");
  } catch (err) {
    console.error("ebook error:", err);
    return redirect("/ebook-thanks");
  }
};
