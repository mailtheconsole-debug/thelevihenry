// The free SDR training follow-up sequence: the email and WhatsApp copy, when each
// step is due (days after opt-in), and the helpers that render a step for one lead and
// work out which step is next. Copy is Levi's, kept word for word from
// FREE-TRAINING-FOLLOWUP.md. Lives in lib/ so Netlify does not treat it as a function.

const SITE = "https://thelevihenry.com";
const TRAINING_LINK = SITE + "/free-sdr-training/watch";
const COURSE_LINK = SITE + "/remote-sdr-training";

const esc = (s) =>
  String(s == null ? "" : s).replace(
    /[<>&]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])
  );

function firstName(lead) {
  const n = String((lead && lead.name) || "").trim().split(/\s+/)[0];
  return n || "there";
}

// Emails are written as paragraphs; links are inlined so each sits exactly where Levi
// put it. {{first_name}} is the only placeholder swapped per lead.
const EMAIL_STEPS = [
  {
    step: 1,
    day: 0,
    subject: "Your training is ready, {{first_name}}",
    paras: [
      "{{first_name}},",
      `Here is the training you asked for: <a href="${TRAINING_LINK}">watch it here</a>.`,
      "Watch it from start to finish, in one sitting if you can. It runs about an hour and twenty minutes, so set aside the time. Everything you need to understand how Nigerians are getting these remote roles is in it.",
      "One ask: give it your full attention. This is the thing most people skim, and skimming is exactly why most people never move.",
      `If you already know you want more than the training, the full course with the coaching and the system is here: <a href="${COURSE_LINK}">the Remote SDR Training</a>. Watch the training first either way.`,
      "I will check in tomorrow.",
      "Levi",
    ],
  },
  {
    step: 2,
    day: 1,
    subject: "did you watch it?",
    paras: [
      "{{first_name}},",
      "Quick one. Did you watch the training yet?",
      "If you did, you already see it. These roles are real, foreign companies are hiring for them, and the thing standing between most people and the interview is one skill. Most people just never learn it.",
      `If you have not watched it, do it now before the day runs away from you: <a href="${TRAINING_LINK}">the training</a>.`,
      `And if you are already past deciding, the full course with the coaching, the skills and the system is here: <a href="${COURSE_LINK}">the Remote SDR Training</a>.`,
      "Reply and tell me the one thing that stood out. I read these.",
      "Levi",
    ],
  },
  {
    step: 3,
    day: 2,
    subject: "the part the training could not cover",
    paras: [
      "{{first_name}},",
      "The training showed you the path. What it could not do in that time is walk you down it.",
      "That is what the Remote SDR Training is for. It is the coaching that keeps you from getting stuck, the skills that actually get you hired, and the full system and scripts underneath it all. You are not left to figure it out alone. That part, the coaching and the support, is what I stand behind.",
      `Here is everything in it: <a href="${COURSE_LINK}">the full course</a>.`,
      "Levi",
    ],
  },
  {
    step: 4,
    day: 3,
    subject: "the ones who already moved",
    paras: [
      "{{first_name}},",
      "Something I did not expect when I opened the academy: the messages.",
      "People who enrolled keep reaching out to tell me they are glad they did. They are still learning, no job yet, and they already feel the value from the coaching and the work. In their words, if they had not taken the step, they would not be where they are now.",
      "That is the thing about this. The skills you build here do not expire. Learn to sell yourself and sell for a company, and that pays you for the rest of your working life, in this role and in every one after it.",
      `The step is the same one they took: <a href="${COURSE_LINK}">join here</a>.`,
      "Levi",
    ],
  },
  {
    step: 5,
    day: 4,
    subject: "do the math with me",
    paras: [
      "{{first_name}},",
      "Let me put ₦60,000 next to what these roles actually pay.",
      "An SDR role with a foreign company pays a base of around $500 a month at the low end, and about $1,000 a month on average. That is base, before any commission.",
      "At today's rate, about ₦1,343 to the dollar, $500 is roughly ₦671,500 a month, and $1,000 is about ₦1,343,000 a month.",
      "Run it out. One month on the job, even at the low end, is worth more than ten times what the course costs. Over a year that base is about ₦8 million to ₦16 million.",
      "No one can promise you a job or a salary, and I will not pretend otherwise. What the course gives you is the skills and the coaching to go after this properly. The math is only to show you the size of what sits on the other side of ₦60,000.",
      `<a href="${COURSE_LINK}">See the course</a>.`,
      "Levi",
    ],
  },
  {
    step: 6,
    day: 5,
    subject: "₦60,000 is the founding price",
    paras: [
      "{{first_name}},",
      "Straight with you on the money.",
      "The course is ₦60,000 right now. That is the founding price, for the first 100 students only. After that it goes to ₦100,000, and it stays there.",
      `If you have watched the training and you know this is the move, there is no reason to pay more later for the same thing: <a href="${COURSE_LINK}">join at the founding price</a>.`,
      "Levi",
    ],
  },
  {
    step: 7,
    day: 6,
    subject: "is this for you, honestly",
    paras: [
      "{{first_name}},",
      "Last note on this from me.",
      "This works for people who will put in the reps. The coaching, the skills, the scripts, all of it only pays off if you show up and do the work. I am honest about that on purpose, because I would rather you sit this out than join expecting it to happen to you.",
      `But if you are that person, the one who will actually do it, the founding spots are still open: <a href="${COURSE_LINK}">start here</a>.`,
      "Either way, I am glad you watched. Go use it.",
      "Levi",
    ],
  },
];

// WhatsApp is plain text (wa.me carries it as the prefilled message). Lines are joined
// with blank lines between them.
const WHATSAPP_STEPS = [
  {
    step: 1,
    day: 0,
    lines: [
      `Hi {{first_name}}, Levi here. Just sent your free training, you can also watch it here: ${TRAINING_LINK}`,
      "Watch it all the way through and message me when you are done. I want to hear what you think.",
      `And when you want more than the training, the full course with the coaching and the system is here: ${COURSE_LINK}`,
    ],
  },
  {
    step: 2,
    day: 1,
    lines: [
      "{{first_name}}, did you get through the training? Tell me the one thing that hit you. If anything was unclear, ask me here.",
      `And if you are ready to go deeper than the training, the full course with the coaching and the system is here: ${COURSE_LINK}`,
    ],
  },
  {
    step: 3,
    day: 3,
    lines: [
      `If you are ready to go past the training, this is the full course with the coaching, the skills and the system to actually get you there: ${COURSE_LINK}`,
      "Founding price is ₦60,000 for the first 100 students, then it goes to ₦100,000.",
    ],
  },
  {
    step: 4,
    day: 4,
    lines: [
      `{{first_name}}, quick heads up, the founding spots at ₦60,000 are filling. If you know this is your move, lock it in before the price goes to ₦100,000: ${COURSE_LINK}`,
    ],
  },
];

function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function renderEmail(step, lead, unsubUrl) {
  const fn = esc(firstName(lead));
  const subject = step.subject.replace(/\{\{first_name\}\}/g, fn);
  const body = step.paras
    .map((p) => `<p style="margin:0 0 16px;">${p.replace(/\{\{first_name\}\}/g, fn)}</p>`)
    .join("");
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.6;color:#212c38;max-width:560px;margin:0 auto;">
  ${body}
  <hr style="border:none;border-top:1px solid #e5e1d6;margin:28px 0 12px;">
  <p style="font-size:12px;color:#8a8a84;margin:0;">You are getting this because you signed up for Levi Henry's free SDR training.${
    unsubUrl ? ` <a href="${unsubUrl}" style="color:#8a8a84;">Unsubscribe</a>.` : ""
  }</p>
</div>`;
  return { subject, html };
}

function renderWhatsApp(step, lead) {
  const fn = firstName(lead);
  return step.lines.map((l) => l.replace(/\{\{first_name\}\}/g, fn)).join("\n\n");
}

// The earliest email/WhatsApp step a lead is due for and has not had yet, or null.
function nextDueEmail(lead) {
  const sent = lead.emailsSent || [];
  const d = daysSince(lead.optinAt);
  for (const s of EMAIL_STEPS) if (d >= s.day && !sent.includes(s.step)) return s;
  return null;
}

function nextDueWhatsApp(lead) {
  const done = lead.whatsappDone || [];
  const d = daysSince(lead.optinAt);
  for (const s of WHATSAPP_STEPS) if (d >= s.day && !done.includes(s.step)) return s;
  return null;
}

module.exports = {
  SITE,
  TRAINING_LINK,
  COURSE_LINK,
  EMAIL_STEPS,
  WHATSAPP_STEPS,
  daysSince,
  firstName,
  renderEmail,
  renderWhatsApp,
  nextDueEmail,
  nextDueWhatsApp,
};
