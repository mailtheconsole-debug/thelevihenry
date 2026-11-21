// The Early Black Friday Sale broadcast: a short, dedicated 4-email push for the Remote SDR
// Training, sent to the free-training leads plus an imported Mailchimp audience. This is
// SEPARATE from the SDR nurture follow-ups (followup-content.cjs) and the masterclass
// sequence; it has its own recipient store and send-state so nothing collides. Copy is
// Levi's. Each email is fired on demand by step number (manual control over a cold list),
// so there is no date gate here, only a recommended send day in the comment.
// Lives in lib/ so Netlify does not treat it as a function.

const SITE = "https://thelevihenry.com";
const COURSE_LINK = SITE + "/remote-sdr-training";

// Hard block list, checked at import AND at send, on top of unsubscribes. Lowercased.
const SUPPRESS = new Set(["rindira1588@gmail.com"]);

const esc = (s) =>
  String(s == null ? "" : s).replace(
    /[<>&]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])
  );

function firstName(first) {
  const n = String(first || "").trim().split(/\s+/)[0];
  return n || "there";
}

// 4 emails. `step` is the id passed to the sender. `recDay` is only a note for the human.
const STEPS = [
  {
    step: 1,
    recDay: "Wed Nov 18 / Thu Nov 19",
    subject: "The Remote SDR course is 50% off for a few days",
    paras: [
      "Hi {{first_name}},",
      "Quick one, and worth your two minutes.",
      "The full Remote SDR Training is ₦30,000 right now. The normal price is ₦60,000, so this is half, and it is the lowest it has ever been.",
      "This is the Early Black Friday Sale. It runs until Monday, 23 November at 11:59pm. After that the price goes back to ₦60,000 on its own.",
      "You signed up for the free training because a remote sales role caught your eye. The paid course is where you build the skill for real: the outreach, the calls, the tools these companies use, and the coaching to go after the roles properly.",
      "If you already know this is your move, this is the moment to take it at half price.",
      `Get it at ₦30,000 here: <a href="${COURSE_LINK}">join the Remote SDR Training</a>.`,
      "Levi",
    ],
  },
  {
    step: 2,
    recDay: "Fri Nov 20",
    subject: "Get the Remote SDR course at 50% off if you act now",
    paras: [
      "Hi {{first_name}},",
      "A fair question before you put down ₦30,000: what is in there, and is it worth it.",
      "Here is the honest version.",
      "The Remote SDR Training teaches you to do the job a remote Sales Development Rep does: find the right people, reach out so they reply, book the calls, and handle the tools companies expect you to know. You get the lessons and the coaching to go after these roles the right way.",
      "Let me put the number next to what the roles pay. Remote SDR seats for international companies pay in a range that makes ₦30,000 look small very quickly. I will not promise you a job or a salary, and no one honestly can. What the course gives you is the skill and the coaching. The rest is you going after it.",
      "At ₦30,000 instead of ₦60,000, the cost of trying is as low as it will get. The sale ends Monday, 23 November at 11:59pm, then it is back to ₦60,000.",
      `See everything inside and join here: <a href="${COURSE_LINK}">the Remote SDR Training</a>.`,
      "Levi",
    ],
  },
  {
    step: 3,
    recDay: "Sun Nov 22",
    subject: "50% off the Remote SDR course ends tomorrow",
    paras: [
      "Hi {{first_name}},",
      "The Early Black Friday Sale closes tomorrow, Monday, at 11:59pm.",
      "After that the full Remote SDR Training goes back to ₦60,000. Right now it is ₦30,000, half price.",
      "If you have watched the free training and you know this is the direction you want, there is no reason to pay ₦60,000 next week for the same course that is ₦30,000 today.",
      `Get it before the sale closes: <a href="${COURSE_LINK}">join here</a>.`,
      "Levi",
    ],
  },
  {
    step: 4,
    recDay: "Mon Nov 23 (morning)",
    subject: "Last day: 50% off the Remote SDR course, ends tonight",
    paras: [
      "Hi {{first_name}},",
      "Today is the last day.",
      "At 11:59pm tonight the Early Black Friday Sale closes and the Remote SDR Training goes back to ₦60,000. Right now it is ₦30,000.",
      "Nothing about the course changes tomorrow. The only thing that changes is the price, and it doubles.",
      `If a remote sales role is something you want to actually work toward, step in today while it is half price: <a href="${COURSE_LINK}">join here</a>.`,
      "See you inside,",
      "Levi",
    ],
  },
];

function getStep(n) {
  return STEPS.find((s) => s.step === Number(n)) || null;
}

function renderEmail(step, recipient, unsubUrl) {
  const fn = esc(firstName(recipient && recipient.first));
  const subject = step.subject.replace(/\{\{first_name\}\}/g, fn);
  // Tag every course link so each sale reports back as this email, independent of Meta. Campaign
  // stays "blackfriday"; utm_content carries the step so you can tell which email closed it.
  const taggedLink = `${COURSE_LINK}?utm_source=email&utm_medium=email&utm_campaign=blackfriday&utm_content=email-${step.step}`;
  const body = step.paras
    .map((p) => `<p style="margin:0 0 16px;">${p.replace(/\{\{first_name\}\}/g, fn)}</p>`)
    .join("")
    .split(COURSE_LINK).join(taggedLink);
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.6;color:#212c38;max-width:560px;margin:0 auto;">
  ${body}
  <hr style="border:none;border-top:1px solid #e5e1d6;margin:28px 0 12px;">
  <p style="font-size:12px;color:#8a8a84;margin:0;">You are getting this because you signed up for Levi Henry's free SDR training.${
    unsubUrl ? ` <a href="${unsubUrl}" style="color:#8a8a84;">Unsubscribe</a>.` : ""
  }</p>
</div>`;
  return { subject, html };
}

module.exports = { SITE, COURSE_LINK, SUPPRESS, STEPS, getStep, firstName, renderEmail };
