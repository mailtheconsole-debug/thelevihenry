// HTTP function the GTM-manual form POSTs to directly. Reliable on manual/CLI
// deploys (no dependency on Netlify's form auto-detection). It:
//   1) emails the manual to the lead via Resend
//   2) notifies Levi of the new lead (capture, no database needed)
//   3) redirects the visitor to the manual page
//
// Requires the Netlify env var RESEND_API_KEY.

const MANUAL_URL = "https://thelevihenry.com/gtm-field-manual";
const DISCOVERY_URL = "https://selar.com/844427i064";
const FROM = "Levi Henry <levi@thelevihenry.com>";
const LEAD_NOTIFY_TO = "levi@thelevihenry.com"; // where new-lead alerts go

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

// Log a record to the Airtable CRM. Best effort: skips if not configured,
// never blocks the email or the redirect.
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

    // Spam bot filled the hidden field: pretend success, send nothing.
    if (honeypot) return redirect("/gtm-field-manual");
    if (!email) return redirect("/founders?err=email");

    const firstName = name ? name.split(/\s+/)[0] : "there";

    // 1) Deliver the manual to the lead.
    const leadRes = await sendEmail({
      from: FROM,
      to: [email],
      reply_to: "levi@thelevihenry.com",
      subject: "Your GTM Field Manual",
      html: `
        <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#212c38;">
          <p>Hi ${firstName},</p>
          <p>Thanks for grabbing the <strong>GTM Field Manual</strong>. Here it is:</p>
          <p><a href="${MANUAL_URL}" style="color:#14273f;font-weight:600;">Read the GTM Field Manual &rarr;</a></p>
          <p>It's the reference behind my GTM consulting for founders: the go-to-market toolkit, the first-customers playbook, and how it all changes by industry.</p>
          <p>When you want to apply it to your own startup, you can book a free 20-minute discovery call any time: <a href="${DISCOVERY_URL}" style="color:#14273f;font-weight:600;">book a call</a>.</p>
          <p>&mdash; Levi<br/>Levi Henry Group</p>
        </div>`,
    });
    if (!leadRes.ok) console.error("lead email failed:", leadRes.status, await leadRes.text());

    // 2) Notify Levi of the new lead (best effort).
    try {
      await sendEmail({
        from: FROM,
        to: [LEAD_NOTIFY_TO],
        reply_to: email,
        subject: `New GTM manual lead: ${name || email}`,
        html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#212c38;">
          <p>New GTM Field Manual download:</p>
          <p><strong>Name:</strong> ${name || "(not given)"}<br/>
          <strong>Email:</strong> ${email}</p></div>`,
      });
    } catch (e) {
      console.error("lead notification failed:", e);
    }

    // 3) Log the lead to the CRM (best effort).
    await addToAirtable({
      Name: name,
      Email: email,
      Source: "GTM Manual",
      Status: "New",
    });

    // 4) Send the visitor to the manual.
    return redirect("/gtm-field-manual");
  } catch (err) {
    console.error("lead-magnet error:", err);
    return redirect("/gtm-field-manual");
  }
};
