// Captures a free-training opt-in (name, email, WhatsApp) the moment someone submits the
// /free-training form. Emails Levi so the lead can be worked on WhatsApp, and logs to
// Airtable (best effort). This is the front-end lead engine: cheap opt-ins we own and
// warm toward the ₦60k course, separate from the checkout-abandoner alert (enroll-lead).
// Requires RESEND_API_KEY. Airtable optional (AIRTABLE_TOKEN + AIRTABLE_BASE_ID,
// table from AIRTABLE_LEADS_TABLE or AIRTABLE_TABLE, default "CRM").

const FROM = "Levi Henry Group <levi@thelevihenry.com>";
const NOTIFY_TO = "levi@thelevihenry.com";

const esc = (s) =>
  String(s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));

async function sendEmail(payload) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error("training-optin email failed:", res.status, await res.text());
  } catch (e) {
    console.error("training-optin email error:", e);
  }
}

// Best-effort CRM log. Silently skips if not configured or if the table/fields don't exist.
async function addToAirtable(fields) {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_LEADS_TABLE || process.env.AIRTABLE_TABLE || "CRM";
  if (!token || !baseId) return;
  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields, typecast: true }),
      }
    );
    if (!res.ok) console.error("training-optin Airtable write failed:", res.status, await res.text());
  } catch (e) {
    console.error("training-optin Airtable error:", e);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  try {
    let raw = event.body || "";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
    const p = new URLSearchParams(raw);

    const name = (p.get("name") || "").trim();
    const email = (p.get("email") || "").trim();
    const whatsapp = (p.get("whatsapp") || "").trim();

    if (!email && !whatsapp) return { statusCode: 204, body: "" };

    // Notify Levi so the opt-in can be followed up on WhatsApp toward the course.
    await sendEmail({
      from: FROM,
      to: [NOTIFY_TO],
      reply_to: email || undefined,
      subject: `New free-training lead: ${name || email}`,
      html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#212c38;line-height:1.6;">
        <p>Someone just opted in for the <strong>Remote SDR free training</strong>. New lead to warm toward the course.</p>
        <p><strong>Name:</strong> ${esc(name) || "(not given)"}<br/>
        <strong>Email:</strong> ${esc(email) || "(not given)"}<br/>
        <strong>WhatsApp:</strong> ${esc(whatsapp) || "(not given)"}</p>
      </div>`,
    });

    // Best-effort CRM log (no-ops gracefully if the table/fields aren't set up).
    await addToAirtable({
      Name: name,
      Email: email,
      WhatsApp: whatsapp,
      Source: "Free training opt-in",
      Status: "Opted in",
    });

    return { statusCode: 204, body: "" };
  } catch (err) {
    console.error("training-optin error:", err);
    return { statusCode: 204, body: "" };
  }
};
