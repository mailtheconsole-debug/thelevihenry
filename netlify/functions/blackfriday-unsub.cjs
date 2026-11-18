// One-click unsubscribe for the Black Friday broadcast. Each email links to
// /.netlify/functions/blackfriday-unsub?token=<unsubToken>. Visiting it sets that
// recipient's status so no more sale emails go out. No login: the token is the key.
// Always shows the same calm confirmation, even for an unknown token, so nothing leaks.

const { loadDoc, saveDoc, findByUnsubToken } = require("./lib/blackfriday-store.cjs");

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
    if (token && token !== "TEST") {
      const doc = await loadDoc();
      const hit = findByUnsubToken(doc, token);
      if (hit && doc.byEmail[hit.email] && doc.byEmail[hit.email].status === "active") {
        doc.byEmail[hit.email].status = "unsubscribed";
        await saveDoc(doc);
      }
    }
  } catch (e) {
    console.error("blackfriday-unsub error:", e);
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
    body: page("You will not get any more emails about the Remote SDR Training sale. If this was a mistake, just sign up again."),
  };
};
