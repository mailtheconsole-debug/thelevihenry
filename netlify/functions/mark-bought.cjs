// Key-gated admin: mark a list of emails as "bought" in the training-leads store, so they are
// excluded from the Black Friday broadcast (blackfriday-send-background checks this) and from
// the SDR nurture (nextDue skips "bought"). Upserts a minimal lead for anyone not already in
// the store, so buyers who were never free-training leads are still covered.
//
//   POST .../mark-bought            auth: ?key=<FOLLOWUP_KEY> or x-followup-key header
//   body: JSON {"emails":["a@b.com", ...]}  (also accepts a JSON array, or form emails=a,b)
//
// Emails are passed at call time and never stored in the repo. Returns how many were marked,
// created, or already bought. Idempotent: re-running changes nothing for already-bought leads.

const { getLead, putLead, token } = require("./lib/leadstore.cjs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "POST only" };

  const q = (event && event.queryStringParameters) || {};
  const h = (event && event.headers) || {};
  const key = q.key || h["x-followup-key"] || h["X-Followup-Key"];
  if (!process.env.FOLLOWUP_KEY || key !== process.env.FOLLOWUP_KEY) {
    return { statusCode: 401, body: "nope" };
  }

  let raw = event.body || "";
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");

  let emails = [];
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) emails = j;
    else if (j && Array.isArray(j.emails)) emails = j.emails;
  } catch {
    const p = new URLSearchParams(raw);
    emails = (p.get("emails") || "").split(/[,\s]+/);
  }
  emails = emails.map((e) => String(e || "").toLowerCase().trim()).filter(Boolean);
  if (!emails.length) return { statusCode: 400, body: "no emails" };

  const result = { requested: emails.length, marked: 0, created: 0, already: 0, failed: 0 };
  for (const email of emails) {
    try {
      const now = new Date().toISOString();
      const lead = await getLead(email);
      if (lead) {
        if (lead.status === "bought") {
          result.already++;
        } else {
          lead.status = "bought";
          lead.updatedAt = now;
          await putLead(lead);
          result.marked++;
        }
      } else {
        await putLead({
          email,
          name: "",
          whatsapp: "",
          whatsappRaw: "",
          optinAt: now,
          status: "bought",
          emailsSent: [],
          whatsappDone: [],
          unsubToken: token(),
          createdAt: now,
          updatedAt: now,
          source: "buyer-exclude",
        });
        result.created++;
      }
    } catch (e) {
      console.error("mark-bought: failed for", email, e);
      result.failed++;
    }
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  };
};
