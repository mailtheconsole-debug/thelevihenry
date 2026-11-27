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
  {
    step: 5,
    recDay: "Sat Nov 21 (added mid-sale)",
    subject: "Two days left: the Remote SDR course is half price",
    paras: [
      "Hi {{first_name}},",
      "It is the weekend, so here is a short one.",
      "The Remote SDR Training is still ₦30,000. That is half of the normal ₦60,000, and the sale closes Monday at 11:59pm. After that it goes back to ₦60,000 on its own.",
      "If you have been going back and forth on it, the weekend is the time to settle it. Two days left, then the price doubles.",
      "You watched the free training because a remote sales role is something you want. This is where you build the skill for it: the outreach, the calls, the tools these companies use, and the coaching to go after the roles the right way.",
      `If it is a yes, do it now while it is half price: <a href="${COURSE_LINK}">join the Remote SDR Training</a>.`,
      "Levi",
    ],
  },
  {
    step: 6,
    recDay: "Tue Nov 24",
    subject: "Black Friday sale extended, but only till Nov 30",
    preview: "If you were waiting for salary, this is for you.",
    paras: [
      "Hi {{first_name}},",
      "Over the weekend, a lot of you told me the same thing: \"Levi, I want in, but salary hasn't landed yet.\"",
      "So I made a decision. Black Friday pricing on the Remote SDR course is extended to <strong>Monday, Nov 30, 11:59pm</strong>.",
      "₦30,000 instead of ₦60,000. Same course. Same 8 modules, 116 lessons, and coach reviews on your assignments.",
      "If you were waiting for payday, you're covered. But the extension ends on the 30th, so don't put it off.",
      `👉 <a href="${COURSE_LINK}?utm_source=email&utm_medium=email&utm_campaign=blackfriday&utm_content=ext-1">Join the Remote SDR course</a>`,
      "Levi",
    ],
  },
  {
    step: 7,
    recDay: "Wed Nov 25",
    subject: "What you'll be able to do after the SDR course",
    preview: "Black Friday pricing still on till Nov 30.",
    paras: [
      "Hi {{first_name}},",
      "Here's what you'll be able to do by the end of the Remote SDR course:",
      "✅ Find remote SDR roles at US, UK, and Canadian companies, including ones that never get posted widely<br/>✅ Reach the hiring manager and other decision-makers directly, before most applicants do<br/>✅ Write cold emails and LinkedIn messages that get replies<br/>✅ Handle the call when they pick up, from the opener to objections<br/>✅ Answer the interview questions that trip most candidates up<br/>✅ Run discovery calls once you're hired, so you perform from day one",
      "You'll practice all of it through 31 assignments, and a coach reviews your work. Top students go on the recommendation list I share with companies that ask me for reps.",
      "I went from zero sales experience to sales team lead at a US tech company, working from Nigeria. This is the process I used.",
      "Black Friday pricing: ₦30,000 until Monday, Nov 30.",
      `👉 <a href="${COURSE_LINK}?utm_source=email&utm_medium=email&utm_campaign=blackfriday&utm_content=ext-2">See the full curriculum</a>`,
      "Levi",
    ],
  },
  {
    step: 8,
    recDay: "Thu Nov 26",
    subject: "How Geoffrey landed a US role after my SDR course",
    preview: "From my first cohort to a US firm.",
    paras: [
      "Hi {{first_name}},",
      "Geoffrey joined my first cohort because he wanted to break into remote work and needed someone to guide him closely.",
      "Today he has a role with a US firm.",
      "He didn't get there by sending more CVs. He learned how to find the right roles, reach the people hiring, and handle the conversation. That's what the Remote SDR course teaches, step by step, with coach reviews on your assignments so you're not guessing.",
      "You can watch his full story on the course page.",
      "Black Friday pricing: ₦30,000 until Monday, Nov 30.",
      `👉 <a href="${COURSE_LINK}?utm_source=email&utm_medium=email&utm_campaign=blackfriday&utm_content=ext-3">Watch Geoffrey's story and join</a>`,
      "Levi",
    ],
  },
  {
    step: 9,
    recDay: "Fri Nov 27",
    subject: "It's Black Friday: SDR course is ₦30k, 3 days left",
    preview: "Don't leave it to Monday night.",
    paras: [
      "Hi {{first_name}},",
      "It's officially Black Friday, and you have <strong>3 days left</strong>.",
      "The Remote SDR course is ₦30,000 (usually ₦60,000) until <strong>Monday, Nov 30, 11:59pm</strong>. After that, Black Friday pricing ends.",
      "What you get:",
      "✅ 8 modules, 116 lessons<br/>✅ 31 coach-reviewed assignments<br/>✅ Lifetime access<br/>✅ Top students go on my recommendation list for companies that ask me for reps",
      "<strong>One tip: don't leave it to Monday night.</strong> One student this week had his bank decline the payment, and sorting it out took time. If you pay early, you have room to fix any card issue, or pay by bank transfer or USSD instead.",
      `👉 <a href="${COURSE_LINK}?utm_source=email&utm_medium=email&utm_campaign=blackfriday&utm_content=ext-4">Join today</a>`,
      "Levi",
    ],
  },
  {
    step: 10,
    recDay: "Sun Nov 29",
    subject: "Will the SDR course get me a job? Honest answer",
    preview: "Black Friday pricing ends tomorrow.",
    paras: [
      "Hi {{first_name}},",
      "The question I get most is: \"Will I get a job after this course?\"",
      "The honest answer: I can't promise you a job. Nobody honest can.",
      "What I can promise is that you'll know how to find remote SDR roles, reach hiring managers directly, and handle the call when they pick up. You'll practice with real assignments, and a coach reviews your work. Top students go on the recommendation list I share with companies that ask me for reps.",
      "If you're willing to put in the work, the course gives you the method.",
      "Black Friday pricing ends <strong>tomorrow night, Nov 30, at 11:59pm</strong>.",
      `👉 <a href="${COURSE_LINK}?utm_source=email&utm_medium=email&utm_campaign=blackfriday&utm_content=ext-5">Join the course</a>`,
      "Levi",
    ],
  },
  {
    step: 11,
    recDay: "Mon Nov 30",
    subject: "Black Friday pricing ends at midnight",
    preview: "₦30,000 until 11:59pm tonight.",
    paras: [
      "Hi {{first_name}},",
      "Short one today.",
      "Black Friday pricing on the Remote SDR course ends <strong>tonight at 11:59pm</strong>. ₦30,000 for the full course: 8 modules, 116 lessons, coach-reviewed assignments, and lifetime access.",
      "Students who joined during the sale are already inside, working through the lessons.",
      "If you've been thinking about it all week, today's the day to decide. And if your card gives you trouble, the checkout also takes bank transfer and USSD.",
      `👉 <a href="${COURSE_LINK}?utm_source=email&utm_medium=email&utm_campaign=blackfriday&utm_content=ext-6">Join before midnight</a>`,
      "See you inside,",
      "Levi",
    ],
  },
  {
    step: 12,
    recDay: "Sat Nov 28 (warm only: free-training leads; fills the broadcast-free day)",
    subject: "2 days left, then it goes back to ₦60,000",
    preview: "Black Friday pricing ends Monday night.",
    paras: [
      "Hi {{first_name}},",
      "You signed up for the free SDR training, so you already know these remote roles are real and what it takes to land one.",
      "The full Remote SDR course is where you build the skill for it: the outreach, the calls, the tools these companies use, and a coach reviewing every assignment so you are not left guessing.",
      "For Black Friday it is <strong>₦30,000 instead of ₦60,000</strong>. That ends <strong>Monday, Nov 30 at 11:59pm</strong>, then it goes back to ₦60,000.",
      "It is the weekend, so this is the time to settle it. Two days left. If it is a yes, do it now while it is half price.",
      `👉 <a href="${COURSE_LINK}?utm_source=email&utm_medium=email&utm_campaign=blackfriday&utm_content=ext-warm-28">Join the Remote SDR course</a>`,
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
  // Auto-tag only a BARE course link (href="…/remote-sdr-training"), so every sale reports back
  // as this email. A link that already carries its own ?utm_… (pre-tagged copy) passes through
  // untouched. Campaign stays "blackfriday"; utm_content carries the step.
  const taggedLink = `${COURSE_LINK}?utm_source=email&utm_medium=email&utm_campaign=blackfriday&utm_content=email-${step.step}`;
  const body = step.paras
    .map((p) => `<p style="margin:0 0 16px;">${p.replace(/\{\{first_name\}\}/g, fn)}</p>`)
    .join("")
    .split(`${COURSE_LINK}"`).join(`${taggedLink}"`);
  // Hidden preheader: the inbox preview line, kept out of the visible body.
  const preheader = step.preview
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0;">${esc(step.preview.replace(/\{\{first_name\}\}/g, fn))}</div>`
    : "";
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.6;color:#212c38;max-width:560px;margin:0 auto;">
  ${preheader}
  ${body}
  <hr style="border:none;border-top:1px solid #e5e1d6;margin:28px 0 12px;">
  <p style="font-size:12px;color:#8a8a84;margin:0;">You are getting this because you signed up for Levi Henry's free SDR training.${
    unsubUrl ? ` <a href="${unsubUrl}" style="color:#8a8a84;">Unsubscribe</a>.` : ""
  }</p>
</div>`;
  return { subject, html };
}

module.exports = { SITE, COURSE_LINK, SUPPRESS, STEPS, getStep, firstName, renderEmail };
