// Meta Conversions API (server-side events) helper. Sends events straight to Meta so
// conversions are not lost to ad blockers, iOS, or a closed tab. Each event carries an
// event_id that matches the browser pixel's, so Meta de-duplicates the two into one.
// Requires META_CAPI_TOKEN; pixel id from META_PIXEL_ID (falls back to the known id).
// Lives in lib/ so Netlify does not treat it as a function. Best-effort: returns a bool.

const crypto = require("crypto");
const { normalizePhone } = require("./leadstore.cjs");

const PIXEL_ID = process.env.META_PIXEL_ID || "1622252485686924";
const API_VERSION = "v21.0";

const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");

// Pull the real visitor IP and the fbp/fbc cookies out of the incoming request so the
// server event matches the browser one as closely as possible.
function requestContext(event) {
  const h = (event && event.headers) || {};
  const ipRaw =
    h["x-nf-client-connection-ip"] ||
    h["x-forwarded-for"] ||
    h["client-ip"] ||
    "";
  const clientIp = String(ipRaw).split(",")[0].trim() || undefined;
  const userAgent = h["user-agent"] || h["User-Agent"] || undefined;
  return { clientIp, userAgent };
}

async function sendEvent({
  eventName,
  eventId,
  eventSourceUrl,
  actionSource = "website",
  email,
  phone,
  fbp,
  fbc,
  clientIp,
  userAgent,
  customData,
}) {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) {
    console.error("meta-capi: META_CAPI_TOKEN not set");
    return false;
  }

  const user_data = {};
  if (email) user_data.em = [sha256(String(email).trim().toLowerCase())];
  if (phone) {
    const np = normalizePhone(phone);
    if (np) user_data.ph = [sha256(np)];
  }
  if (fbp) user_data.fbp = fbp;
  if (fbc) user_data.fbc = fbc;
  if (clientIp) user_data.client_ip_address = clientIp;
  if (userAgent) user_data.client_user_agent = userAgent;

  const evt = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: actionSource,
    user_data,
  };
  if (eventId) evt.event_id = eventId;
  if (eventSourceUrl) evt.event_source_url = eventSourceUrl;
  if (customData) evt.custom_data = customData;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [evt] }),
      }
    );
    if (!res.ok) {
      console.error("meta-capi: send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("meta-capi: send error", e);
    return false;
  }
}

module.exports = { sendEvent, requestContext, PIXEL_ID };
