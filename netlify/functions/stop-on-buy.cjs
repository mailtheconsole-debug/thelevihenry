// Stop-on-buy, fired from /welcome after a successful Paystack payment.
// The page sends only the Paystack reference. We verify it against Paystack's
// own API with the secret key (so we only act on a real, successful payment),
// then mark the buyer's lead "bought" so they drop out of the follow-up
// sequence (the automated version of the manual "Stop" on the worklist).
//
// We do NOT send the Purchase to Meta here: the Academy webhook
// (learn.thelevihenry.com/api/paystack/webhook) already fires the server-side
// Purchase CAPI on every charge, and the /welcome browser pixel sends it too,
// both deduped on the Paystack reference. This function only handles the one
// thing nothing else does: pulling the buyer out of our own follow-up emails.
//
// Requires PAYSTACK_SECRET. Always answers 200 (except a bad method) so a
// hiccup never shows the buyer an error on their way into the Academy.

const { getLead, putLead } = require("./lib/leadstore.cjs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const secret = process.env.PAYSTACK_SECRET;
  if (!secret) {
    console.error("stop-on-buy: PAYSTACK_SECRET not set");
    return { statusCode: 200, body: "no secret" };
  }

  try {
    let raw = event.body || "";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
    const p = new URLSearchParams(raw);
    const reference = (p.get("reference") || "").trim();

    if (!reference) return { statusCode: 200, body: "no reference" };

    // Verify the transaction against Paystack: only a confirmed, successful
    // payment should pull someone out of the sequence.
    let v;
    try {
      const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${secret}` } }
      );
      v = await res.json();
    } catch (e) {
      console.error("stop-on-buy: verify call failed", e);
      return { statusCode: 200, body: "verify failed" };
    }

    const d = v && v.data;
    if (!v || v.status !== true || !d || d.status !== "success") {
      return { statusCode: 200, body: "not success" };
    }

    const email = (d.customer && d.customer.email) || d.email || "";

    // Mark the lead "bought" so the email + WhatsApp follow-ups stop.
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
      console.error("stop-on-buy: mark bought failed", e);
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("stop-on-buy error:", err);
    return { statusCode: 200, body: "ok" };
  }
};
