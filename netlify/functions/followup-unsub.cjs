// One-click unsubscribe for the follow-up emails. Each email carries a link to
// /.netlify/functions/followup-unsub?token=<lead.unsubToken>. Visiting it sets the
// lead's status so no more emails (or WhatsApp) go out. No login: the token is the key.
// Always shows the same calm confirmation, even if the token is unknown, so nothing leaks.

const { findByUnsubToken, putLead } = require("./lib/leadstore.cjs");

function page(message) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Unsubscribed</title>
<style>
  body{margin:0;background:#f7f4ec;color:#212c38;font-family:-apple-system,Segoe UI,Arial,sans-serif;}
  .box{max-width:460px;margin:14vh auto 0;padding:0 24px;text-align:center;}
  h1{font-size:22px;margin:0 0 12px;}
  p{font-size:16px;line-height:1.6;color:#555;margin:0;}
</style></head>
<body><div class="box"><h1>You are unsubscribed</h1><p>${message}</p></div></body></html>`;
}

exports.handler = async (event) => {
  const token = (event.queryStringParameters || {}).token || "";
  try {
    const lead = await findByUnsubToken(token);
    if (lead && lead.status === "active") {
      lead.status = "unsubscribed";
      lead.updatedAt = new Date().toISOString();
      await putLead(lead);
    }
  } catch (e) {
    console.error("followup-unsub error:", e);
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
    body: page("You will not get any more emails about the free SDR training. If this was a mistake, just sign up again."),
  };
};
