// Pre-booking gate for the free discovery call. Captures what the visitor wants
// to discuss (emails Levi + logs to Airtable), then forwards them to Selar to
// pick a time. Requires RESEND_API_KEY (+ optional Airtable env vars).

const SELAR = "https://selar.com/844427i064";
const NOTIFY_TO = "levi@thelevihenry.com";
const FROM = "LHG Website <levi@thelevihenry.com>";

function redirect(location) {
  return { statusCode: 302, headers: { Location: location }, body: "" };
}
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ fields, typecast: true }),
      }
    );
    if (!res.ok) console.error("Airtable write failed:", res.status, await res.text());
  } catch (e) {
    console.error("Airtable error:", e);
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
    const goal = (p.get("goal") || "").trim();
    const honeypot = (p.get("bot-field") || "").trim();

    // Spam bot: forward without recording.
    if (honeypot) return redirect(SELAR);
    // Even if the form is somehow incomplete, don't block the booking.
    if (!email || !goal) return redirect(SELAR);

    // Notify Levi (best effort).
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,
          to: [NOTIFY_TO],
          reply_to: email || undefined,
          subject: `Discovery call booking: ${name || email}`,
          html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#212c38;">
            <p>Someone is about to book a discovery call.</p>
            <p><strong>Name:</strong> ${esc(name) || "(not given)"}<br/>
            <strong>Email:</strong> ${esc(email)}</p>
            <p><strong>What they want to discuss:</strong></p>
            <p>${esc(goal).replace(/\n/g, "<br/>")}</p></div>`,
        }),
      });
    } catch (e) {
      console.error("discovery notify failed:", e);
    }

    // Log to the CRM (best effort).
    await addToAirtable({
      Name: name,
      Email: email,
      Source: "Discovery call",
      Message: goal,
      Status: "New",
    });

    // Forward to Selar so they pick a time.
    return redirect(SELAR);
  } catch (err) {
    console.error("discovery error:", err);
    return redirect(SELAR);
  }
};
