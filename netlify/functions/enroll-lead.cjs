// Captures an enrollment lead (name, email, WhatsApp) the moment someone submits the
// checkout form — BEFORE Paystack — so an abandoned checkout can still be recovered on
// WhatsApp. Emails Levi immediately (reliable) and logs to Airtable (best effort).
// Requires RESEND_API_KEY. Airtable is optional (AIRTABLE_TOKEN + AIRTABLE_BASE_ID,
// table from AIRTABLE_LEADS_TABLE or AIRTABLE_TABLE, default "CRM").

const FROM = "Levi Henry Group <levi@thelevihenry.com>";
const NOTIFY_TO = "levi@thelevihenry.com";
const SITE = "https://thelevihenry.com";

const { sendEvent, requestContext } = require("./lib/meta-capi.cjs");

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
    if (!res.ok) console.error("enroll-lead email failed:", res.status, await res.text());
  } catch (e) {
    console.error("enroll-lead email error:", e);
  }
}

// Best-effort CRM log. Silently skips if not configured or if the table/fields don't exist.
async function airtableCreate(url, token, fields) {
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields, typecast: true }),
  });
}

async function addToAirtable(fields) {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_LEADS_TABLE || process.env.AIRTABLE_TABLE || "CRM";
  if (!token || !baseId) return;
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`;
  try {
    let res = await airtableCreate(url, token, fields);
    if (!res.ok) {
      const text = await res.text();
      // If the optional Tier column hasn't been added in Airtable yet, Airtable rejects
      // the whole record. Retry without Tier so the rest of the lead still logs.
      if (res.status === 422 && "Tier" in fields && /Tier/i.test(text)) {
        const { Tier, ...rest } = fields;
        res = await airtableCreate(url, token, rest);
        if (!res.ok) console.error("enroll-lead Airtable write failed:", res.status, await res.text());
      } else {
        console.error("enroll-lead Airtable write failed:", res.status, text);
      }
    }
  } catch (e) {
    console.error("enroll-lead Airtable error:", e);
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
    const tier = (p.get("tier") || "").trim();
    const program = (p.get("title") || p.get("course") || "").trim();
    const course = (p.get("course") || "").trim();
    const eventId = (p.get("event_id") || "").trim();
    const fbp = (p.get("fbp") || "").trim();
    const fbc = (p.get("fbc") || "").trim();
    const value = (p.get("value") || "").trim();
    const currency = (p.get("currency") || "NGN").trim();

    if (!email && !whatsapp) return { statusCode: 204, body: "" };

    // Notify Levi so abandoned checkouts can be recovered on WhatsApp. The tier leads the
    // subject so a VIP is obvious the moment the email lands.
    await sendEmail({
      from: FROM,
      to: [NOTIFY_TO],
      reply_to: email || undefined,
      subject: `${tier ? `[${tier}] ` : ""}Enrollment started: ${name || email} — follow up if no payment`,
      html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#212c38;line-height:1.6;">
        <p>Someone just started checkout for <strong>${esc(program) || "a program"}</strong>. If no payment lands in Paystack, follow up on WhatsApp.</p>
        <p>${tier ? `<strong>Tier:</strong> ${esc(tier)}<br/>` : ""}<strong>Name:</strong> ${esc(name) || "(not given)"}<br/>
        <strong>Email:</strong> ${esc(email) || "(not given)"}<br/>
        <strong>WhatsApp:</strong> ${esc(whatsapp) || "(not given)"}</p>
      </div>`,
    });

    // Best-effort CRM log (no-ops gracefully if the table/fields aren't set up).
    await addToAirtable({
      Name: name,
      Email: email,
      WhatsApp: whatsapp,
      Tier: tier,
      Source: "Enroll checkout",
      Program: program,
      Status: "Started checkout",
    });

    // Mirror InitiateCheckout to Meta server-side (Conversions API), deduped with the browser
    // pixel via the shared event_id. Best effort; never blocks the checkout.
    try {
      const { clientIp, userAgent } = requestContext(event);
      const parts = name.split(/\s+/).filter(Boolean);
      const valueNum = Number(value);
      await sendEvent({
        eventName: "InitiateCheckout",
        eventId: eventId || undefined,
        eventSourceUrl: `${SITE}/remote-sdr-training`,
        email,
        phone: whatsapp,
        firstName: parts[0] || undefined,
        lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
        fbp,
        fbc,
        clientIp,
        userAgent,
        customData: {
          content_name: program || "Remote SDR Training",
          content_ids: course ? [course] : undefined,
          content_type: "product",
          value: Number.isFinite(valueNum) && valueNum > 0 ? valueNum : undefined,
          currency: currency || "NGN",
        },
      });
    } catch (e) {
      console.error("enroll-lead: CAPI InitiateCheckout failed", e);
    }

    return { statusCode: 204, body: "" };
  } catch (err) {
    console.error("enroll-lead error:", err);
    return { statusCode: 204, body: "" };
  }
};
