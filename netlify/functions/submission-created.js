// Netlify event function: fires automatically whenever a Netlify Form is
// submitted. When the GTM manual form comes in, it emails the resource to the
// lead via Resend. No database, no server to run.
//
// Requires a Netlify environment variable: RESEND_API_KEY
// (set it in Netlify -> Site configuration -> Environment variables; never in code)

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const payload = body.payload || {};
    // Only act on the lead-magnet form; ignore the contact form and any others.
    if (payload.form_name !== "gtm-manual") {
      return { statusCode: 200, body: "ignored" };
    }

    const data = payload.data || {};
    const email = (data.email || "").trim();
    if (!email) return { statusCode: 200, body: "no email" };

    const name = (data.name || "").trim();
    const firstName = name ? name.split(/\s+/)[0] : "there";
    const manualUrl = "https://thelevihenry.com/gtm-field-manual";
    const discoveryUrl = "https://selar.com/844427i064";

    const html = `
      <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #212c38;">
        <p>Hi ${firstName},</p>
        <p>Thanks for grabbing the <strong>GTM Field Manual</strong>. Here it is:</p>
        <p><a href="${manualUrl}" style="color: #14273f; font-weight: 600;">Read the GTM Field Manual &rarr;</a></p>
        <p>It's the reference behind my GTM consulting for founders: the go-to-market toolkit, the first-customers playbook, and how it all changes by industry.</p>
        <p>When you want to apply it to your own startup, you can book a free 20-minute discovery call any time: <a href="${discoveryUrl}" style="color: #14273f; font-weight: 600;">book a call</a>.</p>
        <p>&mdash; Levi<br/>Levi Henry Group</p>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Levi Henry <levi@thelevihenry.com>",
        to: [email],
        reply_to: "levi@thelevihenry.com",
        subject: "Your GTM Field Manual",
        html,
      }),
    });

    if (!res.ok) {
      console.error("Resend send failed:", res.status, await res.text());
    }
    // Always return 200 so a delivery hiccup never blocks the form submission.
    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("submission-created error:", err);
    return { statusCode: 200, body: "error-handled" };
  }
};
