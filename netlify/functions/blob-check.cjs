// TEMPORARY debug probe. Writes, reads, and deletes a test blob, and lists leads, then
// returns the result as JSON so the Blobs store can be checked from a plain curl. Remove
// this file once the follow-up system is confirmed working. No sensitive data is returned.

const { store, listLeads } = require("./lib/leadstore.cjs");

exports.handler = async () => {
  const out = {
    ok: false,
    mode:
      (process.env.NETLIFY_SITE_ID || process.env.NETLIFY_BLOBS_SITE_ID) &&
      (process.env.NETLIFY_API_TOKEN ||
        process.env.NETLIFY_BLOBS_TOKEN ||
        process.env.NETLIFY_AUTH_TOKEN)
        ? "manual"
        : "auto",
  };
  try {
    const s = await store();
    const key = "__healthcheck__";
    await s.setJSON(key, { t: Date.now() });
    const got = await s.get(key, { type: "json" });
    await s.delete(key);
    out.wroteAndRead = !!got;
    out.leadCount = (await listLeads()).length;
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
