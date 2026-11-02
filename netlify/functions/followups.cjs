// The WhatsApp worklist: a private page Levi bookmarks on his phone. It shows every
// active lead who is due a WhatsApp message today (or is overdue), the exact message to
// send, and a one-tap button that opens WhatsApp with that message pre-filled. After he
// sends it, he taps "Mark sent"; "Stop" ends the follow-ups for someone who bought or
// asked to stop. The automated emails run on their own; this page is only the WhatsApp
// side, which Levi sends himself.
//
// Gated by a secret key: /.netlify/functions/followups?key=<FOLLOWUP_KEY>. GET renders
// the page; POST (same key) applies an action {email, action, step}.

const { listLeads, getLead, putLead } = require("./lib/leadstore.cjs");
const { nextDueWhatsApp, renderWhatsApp, daysSince, firstName } = require("./lib/followup-content.cjs");

const esc = (s) =>
  String(s == null ? "" : s).replace(
    /[<>&"]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c])
  );

function authed(event) {
  const key =
    (event.queryStringParameters || {}).key ||
    (event.headers && (event.headers["x-followup-key"] || event.headers["X-Followup-Key"]));
  return process.env.FOLLOWUP_KEY && key === process.env.FOLLOWUP_KEY;
}

function setupPage() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Setup</title>
<style>body{font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#f7f4ec;color:#212c38;margin:0;padding:14vh 24px;text-align:center}p{max-width:460px;margin:0 auto;line-height:1.6}</style></head>
<body><p>This page is not set up yet. Add a <strong>FOLLOWUP_KEY</strong> environment variable in Netlify, then open this page with <code>?key=</code> and that value.</p></body></html>`;
}

async function handlePost(event) {
  let data = {};
  try {
    data = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "bad body" }) };
  }
  const { email, action, step } = data;
  if (!email) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "no email" }) };

  const lead = await getLead(email);
  if (!lead) return { statusCode: 404, body: JSON.stringify({ ok: false, error: "no lead" }) };

  if (action === "whatsapp-sent") {
    lead.whatsappDone = [...new Set([...(lead.whatsappDone || []), Number(step)])];
  } else if (action === "stop") {
    lead.status = "stopped";
  } else {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "bad action" }) };
  }
  lead.updatedAt = new Date().toISOString();
  await putLead(lead);
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
}

function card(lead, step) {
  const msg = renderWhatsApp(step, lead);
  const wa = `https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(msg)}`;
  const age = daysSince(lead.optinAt);
  const ageLabel = age === 0 ? "signed up today" : `signed up ${age} day${age === 1 ? "" : "s"} ago`;
  return `<article class="card" data-email="${esc(lead.email)}" data-step="${step.step}">
    <div class="top">
      <div>
        <h2>${esc(firstName(lead))}</h2>
        <p class="meta">+${esc(lead.whatsapp)} &middot; ${ageLabel}</p>
      </div>
      <span class="badge">WhatsApp ${step.step}</span>
    </div>
    <pre class="msg">${esc(msg)}</pre>
    <div class="actions">
      <a class="btn btn-wa" href="${esc(wa)}" target="_blank" rel="noopener">Open WhatsApp</a>
      <button class="btn btn-done" data-act="whatsapp-sent">Mark sent</button>
      <button class="btn btn-stop" data-act="stop">Stop</button>
    </div>
  </article>`;
}

function renderPage(cards, key, emailOnly) {
  const count = cards.length;
  const list = count
    ? cards.join("\n")
    : `<p class="empty">All caught up. No WhatsApp follow-ups due right now.</p>`;
  const noteEmailOnly = emailOnly
    ? `<p class="note">${emailOnly} active lead${emailOnly === 1 ? "" : "s"} with no WhatsApp number (emails still reach them).</p>`
    : "";
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>WhatsApp follow-ups</title>
<style>
  :root{color-scheme:light}
  *{box-sizing:border-box}
  body{margin:0;background:#f7f4ec;color:#212c38;font-family:-apple-system,Segoe UI,Arial,sans-serif;}
  .wrap{max-width:620px;margin:0 auto;padding:24px 16px 64px;}
  header{margin-bottom:20px;}
  h1{font-size:20px;margin:0 0 4px;}
  .sub{color:#6b6b64;font-size:14px;margin:0;}
  .empty{background:#fff;border:1px solid #e5e1d6;border-radius:12px;padding:28px 20px;text-align:center;color:#6b6b64;}
  .note{color:#8a8a84;font-size:13px;margin:16px 2px 0;}
  .card{background:#fff;border:1px solid #e5e1d6;border-radius:14px;padding:16px;margin-bottom:14px;box-shadow:0 1px 2px rgba(20,30,50,.04);transition:opacity .25s ease;}
  .card.going{opacity:.35;}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
  .top h2{font-size:17px;margin:0;}
  .meta{color:#6b6b64;font-size:13px;margin:3px 0 0;}
  .badge{flex:none;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#1f6b42;background:#e7f6ec;border-radius:999px;padding:5px 10px;}
  .msg{white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:14.5px;line-height:1.55;background:#f7f4ec;border:1px solid #ece7db;border-radius:10px;padding:12px 14px;margin:14px 0;color:#2b3542;}
  .actions{display:flex;flex-wrap:wrap;gap:8px;}
  .btn{flex:1 1 auto;min-width:120px;text-align:center;border:0;border-radius:10px;padding:12px 14px;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;}
  .btn-wa{background:#25D366;color:#063e21;}
  .btn-done{background:#212c38;color:#fff;}
  .btn-stop{background:#fff;color:#99433a;border:1px solid #e3cbc7;flex:0 0 auto;min-width:72px;}
  .btn:active{transform:translateY(1px);}
</style></head>
<body>
  <div class="wrap">
    <header>
      <h1>WhatsApp follow-ups</h1>
      <p class="sub"><span id="count">${count}</span> due right now. Tap Open WhatsApp, send, then Mark sent.</p>
    </header>
    <div id="list">${list}</div>
    ${noteEmailOnly}
  </div>
  <script>
    (function(){
      var KEY = ${JSON.stringify(key)};
      function post(email, action, step){
        return fetch('?key=' + encodeURIComponent(KEY), {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ email: email, action: action, step: step })
        }).then(function(r){ return r.json(); });
      }
      function refreshCount(){
        var n = document.querySelectorAll('#list .card').length;
        document.getElementById('count').textContent = n;
        if(n === 0){
          document.getElementById('list').innerHTML = '<p class="empty">All caught up. No WhatsApp follow-ups due right now.</p>';
        }
      }
      document.getElementById('list').addEventListener('click', function(e){
        var btn = e.target.closest('button[data-act]');
        if(!btn) return;
        var card = btn.closest('.card');
        var email = card.getAttribute('data-email');
        var step = card.getAttribute('data-step');
        var act = btn.getAttribute('data-act');
        if(act === 'stop' && !confirm('Stop all follow-ups for this person?')) return;
        btn.disabled = true;
        card.classList.add('going');
        post(email, act, step).then(function(res){
          if(res && res.ok){ card.remove(); refreshCount(); }
          else { card.classList.remove('going'); btn.disabled = false; alert('Did not save, try again.'); }
        }).catch(function(){ card.classList.remove('going'); btn.disabled = false; alert('Did not save, try again.'); });
      });
    })();
  </script>
</body></html>`;
}

exports.handler = async (event) => {
  if (!process.env.FOLLOWUP_KEY) {
    return { statusCode: 200, headers: { "Content-Type": "text/html; charset=utf-8" }, body: setupPage() };
  }
  if (!authed(event)) return { statusCode: 401, body: "nope" };

  if (event.httpMethod === "POST") {
    try {
      return await handlePost(event);
    } catch (e) {
      console.error("followups POST error:", e);
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: "server" }) };
    }
  }

  let leads = [];
  try {
    leads = await listLeads();
  } catch (e) {
    console.error("followups: could not list leads", e);
  }

  const cards = [];
  let emailOnly = 0;
  for (const lead of leads) {
    if (lead.status !== "active") continue;
    if (!lead.whatsapp) {
      emailOnly++;
      continue;
    }
    const step = nextDueWhatsApp(lead);
    if (step) cards.push({ lead, step, age: daysSince(lead.optinAt) });
  }
  // Most overdue first.
  cards.sort((a, b) => b.age - a.age);
  const html = renderPage(
    cards.map((c) => card(c.lead, c.step)),
    (event.queryStringParameters || {}).key || "",
    emailOnly
  );

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
    body: html,
  };
};
