// Server-side Purchase, fired from /welcome after a successful Paystack payment.
// The page sends only the Paystack reference. We never trust an amount from the
// browser: we call Paystack's own verify API with the secret key to confirm the
// payment is real and read the true amount, currency and email, then:
//   1. Send the Purchase to Meta (Conversions API), de-duplicated with /welcome's
//      browser pixel via the shared reference used as the event_id.
//   2. Mark the buyer's lead "bought" so they drop out of the follow-up sequence.
// This keeps Paystack's single webhook slot free for the Academy enrolment hook.
// Requires PAYSTACK_SECRET and META_CAPI_TOKEN. Always answers 200 (except a bad
// method) so a downstream hiccup never shows the buyer an error on their way in.

const { sendEvent, requestContext } = require("./lib/meta-capi.cjs");
const { getLead, putLead } = require("./lib/leadstore.cjs");

const SITE = "https://thelevihenry.com";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const secret = process.env.PAYSTACK_SECRET;
  if (!secret) {
    console.error("capi-purchase: PAYSTACK_SECRET not set");
    return { statusCode: 200, body: "no secret" };
  }

  try {
    let raw = event.body || "";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
    const p = new URLSearchParams(raw);
    const reference = (p.get("reference") || "").trim();
    const fbp = (p.get("fbp") || "").trim();
    const fbc = (p.get("fbc") || "").trim();

    if (!reference) return { statusCode: 200, body: "no reference" };

    // Verify the transaction against Paystack. This is the only source of truth
    // for whether the payment happened and for how much.
    let v;
    try {
      const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      v = await res.json();
    } catch (e) {
      console.error("capi-purchase: verify call failed", e);
      return { statusCode: 200, body: "verify failed" };
    }

    const d = v && v.data;
    if (!v || v.status !== true || !d || d.status !== "success") {
      // Not a confirmed successful payment: do nothing, report OK.
      return { statusCode: 200, body: "not success" };
    }

    const email = (d.customer && d.customer.email) || d.email || "";
    const currency = d.currency || "NGN";
    const amount = typeof d.amount === "number" ? d.amount / 100 : undefined; // kobo -> naira

    // 1. Purchase to Meta (deduped with /welcome's browser Purchase via the reference).
    try {
      const { clientIp, userAgent } = requestContext(event);
      await sendEvent({
        eventName: "Purchase",
        eventId: reference,
        eventSourceUrl: `${SITE}/welcome`,
        email,
        fbp,
        fbc,
        clientIp,
        userAgent,
        customData: {
          value: amount,
          currency,
          content_name: "Remote SDR Training",
          content_ids: ["remote-sdr-training"],
          content_type: "product",
        },
      });
    } catch (e) {
      console.error("capi-purchase: CAPI Purchase failed", e);
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
      console.error("capi-purchase: stop-on-buy failed", e);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("capi-purchase error:", err);
    return { statusCode: 200, body: "ok" };
  }
};
