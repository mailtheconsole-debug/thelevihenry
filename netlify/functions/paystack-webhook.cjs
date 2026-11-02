// Paystack webhook. On a successful charge it does two things:
//   1. Mirrors the Purchase to Meta via the Conversions API, de-duplicated with the
//      browser pixel on /welcome using the Paystack reference as the shared event_id.
//   2. Marks the buyer's lead as "bought" so they drop out of the follow-up sequence
//      (the automated version of the manual "Stop" on the worklist).
// Verifies the Paystack signature (HMAC SHA512 of the raw body with the secret key).
// Requires PAYSTACK_SECRET and META_CAPI_TOKEN. Always answers 200 so Paystack does not
// retry on our own downstream hiccups; only a bad signature is rejected.

const crypto = require("crypto");
const { sendEvent } = require("./lib/meta-capi.cjs");
const { getLead, putLead } = require("./lib/leadstore.cjs");

const SITE = "https://thelevihenry.com";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const secret = process.env.PAYSTACK_SECRET;
  if (!secret) {
    console.error("paystack-webhook: PAYSTACK_SECRET not set");
    return { statusCode: 200, body: "no secret" };
  }

  let raw = event.body || "";
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");

  // Verify the signature before trusting anything in the body.
  const h = event.headers || {};
  const sig = h["x-paystack-signature"] || h["X-Paystack-Signature"] || "";
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  if (!sig || sig !== expected) {
    console.error("paystack-webhook: bad or missing signature");
    return { statusCode: 401, body: "bad signature" };
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    return { statusCode: 400, body: "bad json" };
  }

  if (!payload || payload.event !== "charge.success" || !payload.data) {
    return { statusCode: 200, body: "ignored" };
  }

  const d = payload.data;
  const reference = d.reference;
  const email = (d.customer && d.customer.email) || d.email || "";
  const currency = d.currency || "NGN";
  const amount = typeof d.amount === "number" ? d.amount / 100 : undefined; // kobo -> naira

  // 1. Purchase to Meta (deduped with /welcome's browser Purchase via the reference).
  try {
    await sendEvent({
      eventName: "Purchase",
      eventId: reference,
      eventSourceUrl: `${SITE}/welcome`,
      email,
      customData: {
        value: amount,
        currency,
        content_name: "Remote SDR Training",
        content_ids: ["remote-sdr-training"],
        content_type: "product",
      },
    });
  } catch (e) {
    console.error("paystack-webhook: CAPI Purchase failed", e);
  }

  // 2. Stop-on-buy: pull this buyer out of the follow-up sequence.
  try {
    if (email) {
      const lead = await getLead(email);
      if (lead && lead.status !== "bought") {
        lead.status = "bought";
        lead.updatedAt = new Date().toISOString();
        await putLead(lead);
      }
    }
  } catch (e) {
    console.error("paystack-webhook: stop-on-buy failed", e);
  }

  return { statusCode: 200, body: "ok" };
};
