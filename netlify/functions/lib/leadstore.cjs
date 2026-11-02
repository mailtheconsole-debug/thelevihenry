// Reliable lead store for the free SDR training follow-up system, backed by Netlify
// Blobs (built into the hosting, no external account). One blob per lead, keyed off
// their email. Holds contact details, opt-in time, status, and which email/WhatsApp
// steps have gone out. Shared by the opt-in, the daily cron, the worklist page, and
// the unsubscribe endpoint. Lives in lib/ so Netlify does not treat it as a function.

const STORE_NAME = "training-leads";

async function store() {
  // @netlify/blobs is ESM; load it dynamically from these CJS functions.
  const { getStore } = await import("@netlify/blobs");
  return getStore(STORE_NAME);
}

// Normalize a Nigerian number to international digits (no +), for wa.me links.
// 08012345678 -> 2348012345678 ; +234 801... -> 234801... ; 8012345678 -> 234801...
function normalizePhone(raw) {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("234")) return d;
  if (d.startsWith("0")) return "234" + d.slice(1);
  if (d.length === 10) return "234" + d;
  return d;
}

function keyFor(email) {
  const base = String(email || "").toLowerCase().trim();
  const san = base.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "lead";
  let h = 5381;
  for (let i = 0; i < base.length; i++) h = ((h << 5) + h + base.charCodeAt(i)) >>> 0;
  return san + "-" + h.toString(36);
}

function token() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

async function getLead(email) {
  const s = await store();
  return s.get(keyFor(email), { type: "json" });
}

async function putLead(lead) {
  const s = await store();
  await s.setJSON(keyFor(lead.email), lead);
}

// Create the lead on first opt-in, or refresh contact details on a repeat opt-in
// without resetting the sequence. Returns { lead, isNew }.
async function upsertOptin({ name, email, whatsapp }) {
  const s = await store();
  const key = keyFor(email);
  const now = new Date().toISOString();
  let lead = await s.get(key, { type: "json" });
  if (lead) {
    lead.name = name || lead.name;
    const np = normalizePhone(whatsapp);
    if (np) {
      lead.whatsapp = np;
      lead.whatsappRaw = whatsapp;
    }
    lead.updatedAt = now;
    await s.setJSON(key, lead);
    return { lead, isNew: false };
  }
  lead = {
    email: String(email).toLowerCase().trim(),
    name: name || "",
    whatsapp: normalizePhone(whatsapp),
    whatsappRaw: whatsapp || "",
    optinAt: now,
    status: "active", // active | stopped | bought | unsubscribed
    emailsSent: [], // step numbers already emailed
    whatsappDone: [], // step numbers Levi has marked sent
    unsubToken: token(),
    createdAt: now,
    updatedAt: now,
  };
  await s.setJSON(key, lead);
  return { lead, isNew: true };
}

async function listLeads() {
  const s = await store();
  const out = [];
  const { blobs } = await s.list();
  for (const b of blobs) {
    const l = await s.get(b.key, { type: "json" });
    if (l) out.push(l);
  }
  return out;
}

async function findByUnsubToken(tok) {
  if (!tok) return null;
  const leads = await listLeads();
  return leads.find((l) => l.unsubToken === tok) || null;
}

module.exports = {
  normalizePhone,
  keyFor,
  token,
  getLead,
  putLead,
  upsertOptin,
  listLeads,
  findByUnsubToken,
};
