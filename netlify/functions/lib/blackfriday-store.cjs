// Recipient + send-state store for the Early Black Friday Sale broadcast. Kept in ONE
// Netlify Blob document (a few hundred people, simple state), so a send run is one read and
// one write, and it never touches the training-leads store the nurture system owns. Each
// entry: { first, source: "lead" | "mailchimp", status: "active" | "unsubscribed",
// bfSent: [stepNumbers], unsubToken }. Keyed by lowercased email.
// Lives in lib/ so Netlify does not treat it as a function.

const STORE_NAME = "blackfriday";
const DOC_KEY = "recipients";

async function store() {
  const { getStore } = await import("@netlify/blobs");
  const siteID = process.env.NETLIFY_SITE_ID || process.env.NETLIFY_BLOBS_SITE_ID;
  const token =
    process.env.NETLIFY_API_TOKEN ||
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN;
  if (siteID && token) return getStore({ name: STORE_NAME, siteID, token });
  return getStore(STORE_NAME);
}

function normEmail(e) {
  return String(e || "").toLowerCase().trim();
}

function mkToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function loadDoc() {
  const s = await store();
  const doc = await s.get(DOC_KEY, { type: "json" });
  if (doc && doc.byEmail) return doc;
  return { byEmail: {}, updatedAt: null };
}

async function saveDoc(doc) {
  const s = await store();
  doc.updatedAt = new Date().toISOString();
  await s.setJSON(DOC_KEY, doc);
}

function findByUnsubToken(doc, tok) {
  if (!tok) return null;
  for (const [email, rec] of Object.entries(doc.byEmail)) {
    if (rec.unsubToken === tok) return { email, rec };
  }
  return null;
}

module.exports = { store, normEmail, mkToken, loadDoc, saveDoc, findByUnsubToken, DOC_KEY };
