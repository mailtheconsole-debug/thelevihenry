// One-time import of the exported Mailchimp subscribed audience into the Black Friday
// recipient store. POST a JSON body { recipients: [ { email, first }, ... ] } with the
// FOLLOWUP_KEY (header x-followup-key or ?key=). Already-present emails and suppressed
// emails are skipped, so re-posting is safe. Regular (not background) so it returns counts.
//
//   POST https://thelevihenry.com/.netlify/functions/blackfriday-import
//   header: x-followup-key: <FOLLOWUP_KEY>
//   body:   {"recipients":[{"email":"a@b.com","first":"Ada"}, ...]}

const { SUPPRESS } = require("./lib/blackfriday-content.cjs");
const { loadDoc, saveDoc, normEmail, mkToken } = require("./lib/blackfriday-store.cjs");

exports.handler = async (event) => {
  const q = (event && event.queryStringParameters) || {};
  const h = (event && event.headers) || {};
  const key = q.key || h["x-followup-key"] || h["X-Followup-Key"];
  if (!process.env.FOLLOWUP_KEY || key !== process.env.FOLLOWUP_KEY) {
    return { statusCode: 401, body: "nope" };
  }

  let recipients;
  try {
    const parsed = JSON.parse(event.body || "{}");
    recipients = Array.isArray(parsed) ? parsed : parsed.recipients;
  } catch (e) {
    return { statusCode: 400, body: "bad json" };
  }
  if (!Array.isArray(recipients)) {
    return { statusCode: 400, body: "expected { recipients: [...] }" };
  }

  const doc = await loadDoc();
  let imported = 0,
    existed = 0,
    suppressed = 0,
    invalid = 0;

  for (const r of recipients) {
    const email = normEmail(r && r.email);
    if (!email || !email.includes("@")) {
      invalid++;
      continue;
    }
    if (SUPPRESS.has(email)) {
      suppressed++;
      continue;
    }
    if (doc.byEmail[email]) {
      existed++;
      continue;
    }
    doc.byEmail[email] = {
      first: String((r && r.first) || "").trim(),
      source: "mailchimp",
      status: "active",
      bfSent: [],
      unsubToken: mkToken(),
    };
    imported++;
  }

  await saveDoc(doc);
  const total = Object.keys(doc.byEmail).length;
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imported, existed, suppressed, invalid, totalInStore: total }),
  };
};
