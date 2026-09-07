// HTTP function the contact form POSTs to. Emails the message to Levi via
// Resend, with the sender as reply-to so replies go straight back to them.
// Requires the Netlify env var RESEND_API_KEY.

const NOTIFY_TO = "levi@thelevihenry.com";
const FROM = "LHG Website <levi@thelevihenry.com>";

function redirect(location) {
  return { statusCode: 302, headers: { Location: location }, body: "" };
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  try {
    let raw = event.body || "";
    if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
    const p = new URLSearchParams(raw);

    const name = (p.get("name") || "").trim();
    const email = (p.get("email") || "").trim();
    const about = (p.get("about") || "").trim();
    const message = (p.get("message") || "").trim();
    const honeypot = (p.get("bot-field") || "").trim();

    // Spam bot: pretend success, send nothing.
    if (honeypot) return redirect("/contact?sent=1");
    if (!email || !message) return redirect("/contact?err=1");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [NOTIFY_TO],
        reply_to: email,
        subject: `New contact message from ${name || email}`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#212c38;">
            <p><strong>Name:</strong> ${esc(name) || "(not given)"}<br/>
            <strong>Email:</strong> ${esc(email)}<br/>
            <strong>Individual or business:</strong> ${esc(about) || "(not given)"}</p>
            <p><strong>Message:</strong></p>
            <p>${esc(message).replace(/\n/g, "<br/>")}</p>
          </div>`,
      }),
    });

    if (!res.ok) {
      console.error("contact email failed:", res.status, await res.text());
      return redirect("/contact?err=1");
    }
    return redirect("/contact?sent=1");
  } catch (err) {
    console.error("contact error:", err);
    return redirect("/contact?err=1");
  }
};
