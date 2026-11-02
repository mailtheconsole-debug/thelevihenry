// TEMPORARY debug probe. Writes, reads, and deletes a test blob, and lists leads, then
// returns the result as JSON so the Blobs store can be checked from a plain curl. Remove
// this file once the follow-up system is confirmed working. No sensitive data is returned.

const { listLeads } = require("./lib/leadstore.cjs");

exports.handler = async () => {
  const out = { ok: false };
  try {
    const { getStore } = await import("@netlify/blobs");
    const s = getStore("training-leads");
    const key = "__healthcheck__";
    await s.setJSON(key, { t: Date.now() });
    const got = await s.get(key, { type: "json" });
    await s.delete(key);
    out.wroteAndRead = !!got;
    const leads = await listLeads();
    out.leadCount = leads.length;
    out.ok = !!got;
  } catch (e) {
    out.error = (e && e.message) || String(e);
    out.name = e && e.name;
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(out),
  };
};
