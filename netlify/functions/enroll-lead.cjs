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
      // Optional columns (Tier, Channel, the UTM fields) may not exist in this base yet, and
      // Airtable rejects the whole record when any field is unknown. Retry with just the core
      // fields so the lead still logs no matter which optional columns are missing.
      if (res.status === 422) {
        const core = {
          Name: fields.Name,
          Email: fields.Email,
          WhatsApp: fields.WhatsApp,
          Status: fields.Status,
        };
        res = await airtableCreate(url, token, core);
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
    const utmSource = (p.get("utm_source") || "").trim();
    const utmMedium = (p.get("utm_medium") || "").trim();
    const utmCampaign = (p.get("utm_campaign") || "").trim();
    const utmContent = (p.get("utm_content") || "").trim();
    const utmTerm = (p.get("utm_term") || "").trim();
    const referrer = (p.get("referrer") || "").trim();

    // Best-guess channel from the tags so the email says "Meta ad" / "WhatsApp" / "Email" at a
    // glance. Channel is keyed off the source (where the click came from); "paid" only upgrades
    // the label to "... ad". Word boundaries keep "broadcast" from matching "ad".
    const channel = (() => {
      const s = utmSource.toLowerCase();
      const m = utmMedium.toLowerCase();
      const both = `${s} ${m}`;
      const paid = /\bcpc\b|\bppc\b|paid|\bads?\b|display/.test(m);
      if (/whatsapp|\bwa\b/.test(both)) return "WhatsApp";
      if (/email|newsletter|mailchimp|klaviyo|broadcast/.test(both)) return "Email";
      if (/facebook|instagram|\bfb\b|\big\b|meta/.test(s)) return paid ? "Meta ad" : "Meta";
      if (/google|youtube|\bgoog\b/.test(s)) return paid ? "Google ad" : "Google";
      if (utmSource) return paid ? `${utmSource} (paid)` : utmSource;
      if (referrer) return "Referral";
      return "Direct / untagged";
    })();

    if (!email && !whatsapp) return { statusCode: 204, body: "" };

    // Notify Levi so abandoned checkouts can be recovered on WhatsApp. The tier leads the
    // subject so a VIP is obvious the moment the email lands.
    await sendEmail({
      from: FROM,
      to: [NOTIFY_TO],
      reply_to: email || undefined,
      subject: `${tier ? `[${tier}] ` : ""}New enrollment (${channel}): ${name || email}. Follow up if no payment`,
      html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;color:#212c38;line-height:1.6;">
        <p>Someone just started checkout for <strong>${esc(program) || "a program"}</strong>. If no payment lands in Paystack, follow up on WhatsApp.</p>
        <p>${tier ? `<strong>Tier:</strong> ${esc(tier)}<br/>` : ""}<strong>Name:</strong> ${esc(name) || "(not given)"}<br/>
        <strong>Email:</strong> ${esc(email) || "(not given)"}<br/>
        <strong>WhatsApp:</strong> ${esc(whatsapp) || "(not given)"}</p>
        <p style="margin-top:14px;padding-top:12px;border-top:1px solid #e5e9ef;">
          <strong>Came from:</strong> ${esc(channel)}<br/>
          ${utmSource ? `<strong>Source:</strong> ${esc(utmSource)}<br/>` : ""}${utmMedium ? `<strong>Medium:</strong> ${esc(utmMedium)}<br/>` : ""}${utmCampaign ? `<strong>Campaign:</strong> ${esc(utmCampaign)}<br/>` : ""}${utmContent ? `<strong>Ad / content:</strong> ${esc(utmContent)}<br/>` : ""}${utmTerm ? `<strong>Term:</strong> ${esc(utmTerm)}<br/>` : ""}${!utmSource && referrer ? `<strong>Referrer:</strong> ${esc(referrer)}<br/>` : ""}${!utmSource && !referrer ? `<span style="color:#6b7684;">No campaign tags on the visitor's link.</span>` : ""}
        </p>
      </div>`,
    });

    // Best-effort CRM log (no-ops gracefully if the table/fields aren't set up). The UTM/Channel
    // columns are optional: if they don't exist in the base, the write retries with the core
    // fields so the lead still logs (see addToAirtable).
    const leadFields = {
      Name: name,
      Email: email,
      WhatsApp: whatsapp,
      Tier: tier,
      Source: "Enroll checkout",
      Program: program,
      Status: "Started checkout",
      Channel: channel,
    };
    if (utmCampaign) leadFields.Campaign = utmCampaign;
    if (utmSource) leadFields["UTM Source"] = utmSource;
    if (utmMedium) leadFields["UTM Medium"] = utmMedium;
    if (utmContent) leadFields["UTM Content"] = utmContent;
    if (!utmSource && referrer) leadFields.Referrer = referrer;
    await addToAirtable(leadFields);

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
