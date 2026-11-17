// The Meta Ads Masterclass email sequence for the existing training leads. Unlike the SDR
// follow-up (which is anchored to days-since-opt-in), this is a DATE-BASED countdown to
// the class on Sat Nov 28, 2026, so every lead gets the same step on the same calendar day
// regardless of when they opted in. Tracked per lead in `mcSent` so it never collides with
// the SDR `emailsSent`. Shares the same unsubscribe. Copy is Levi's, money/season angle.
// Lives in lib/ so Netlify does not treat it as a function.

const SITE = "https://thelevihenry.com";
const CLASS_LINK = SITE + "/meta-ads-masterclass";

const esc = (s) =>
  String(s == null ? "" : s).replace(
    /[<>&]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c])
  );

function firstName(lead) {
  const n = String((lead && lead.name) || "").trim().split(/\s+/)[0];
  return n || "there";
}

// Today's date in WAT (UTC+1) as YYYY-MM-DD, so date gating never depends on the server
// zone or the visitor's clock. ISO date strings compare correctly with <= / >=.
function watToday(now = Date.now()) {
  return new Date(now + 3600000).toISOString().slice(0, 10);
}

// Each step sends on or after `sendOn` (WAT date). The sender picks the earliest unsent
// step whose date has arrived, one per lead per run, so a late start never bursts.
const MASTERCLASS_STEPS = [
  {
    step: 1,
    sendOn: "2026-11-17",
    subject: "The season money moves. Here is how to get a share.",
    paras: [
      "Hi {{first_name}},",
      "You signed up because you wanted a way to make more money. This is the season to do it.",
      "Between Black Friday and January, Nigerians spend more than any other time of the year. Clothes, gifts, food, travel, owambe. The money is already moving.",
      "The question is whether any of it reaches you.",
      "The people who get the biggest share can do one thing well: put an offer in front of buyers on purpose. That is a skill, and it is called running Meta ads. Once you have it, you can point it at almost anything that sells, your own product or a business that pays you to run theirs.",
      `On Saturday, November 28, I teach you that skill live, in 3 hours. You build real campaigns on your own ad account while I walk you through every step. Here is everything: <a href="${CLASS_LINK}">the Meta Ads Masterclass</a>.`,
      "Right now it is ₦15,000, the lowest it will be. That price holds through Saturday, November 21, then it rises to ₦30,000. I will send you more over the next few days, but if you already know you want in, take the lowest price while it is here.",
      "Levi",
    ],
  },
  {
    step: 2,
    sendOn: "2026-11-19",
    subject: "64 sales in 30 days. Here is the skill behind it.",
    paras: [
      "Hi {{first_name}},",
      "Let me show you what this skill does when it is set up right.",
      "A fashion program I ran the ads for, a ₦100,000 product, made 64 sales in 30 days. About ₦13 back for every ₦1 spent. No boost button. A pixel, Ads Manager, and the right campaign.",
      "Your numbers will depend on your offer and your price. The skill behind it is the same one I teach you on Saturday, November 28, live, on your own ad account.",
      `Everything about the class is here: <a href="${CLASS_LINK}">the Meta Ads Masterclass</a>.`,
      "Quick heads up on price: ₦15,000 holds through this Saturday, November 21, then it goes to ₦30,000. A couple of days left at the lowest price.",
      "Levi",
    ],
  },
  {
    step: 3,
    sendOn: "2026-11-21",
    subject: "Last day at ₦15,000",
    paras: [
      "Hi {{first_name}},",
      "Short and straight. Today is the last day to join the Meta Ads Masterclass at ₦15,000. Tomorrow it goes to ₦30,000, and on class day it is ₦45,000.",
      "Same class either way: 3 hours live on Saturday, November 28, building real campaigns on your own ad account, with the pixel, the targeting, and AI prompts that write your ads for you.",
      `If you have been meaning to grab it, grab it today: <a href="${CLASS_LINK}">join here</a>.`,
      "Levi",
    ],
  },
  {
    step: 4,
    sendOn: "2026-11-25",
    subject: "The December rush is here",
    paras: [
      "Hi {{first_name}},",
      "The spending has started. Every day between now and January, people are buying, and the businesses in front of them are the ones collecting.",
      "The Meta Ads Masterclass is this Saturday, November 28. In 3 hours you learn to put your own offer in front of those buyers, live, on your own account. You leave able to run it yourself, in time for the busiest shopping stretch of the year.",
      `It is ₦30,000 now and ₦45,000 on the day, so today is the cheaper door: <a href="${CLASS_LINK}">join here</a>.`,
      "There is also a VIP seat with a private 45-minute 1:1 with me after class, capped at 10, if you want help pointing this at your own situation.",
      "Levi",
    ],
  },
  {
    step: 5,
    sendOn: "2026-11-27",
    subject: "Tomorrow. This is the last call.",
    paras: [
      "Hi {{first_name}},",
      "The Meta Ads Masterclass is tomorrow, Saturday, November 28, 4 to 7 pm WAT, live on Google Meet.",
      "This is the last email I will send you about it. If you want to end this year able to run your own ads, and walk into the December rush with that skill, this is the moment to step in.",
      "Come in on a laptop, bring something you sell, and you build a real campaign with me during the class. You also keep a 7-day replay when you attend live.",
      `Today it is ₦30,000. Tomorrow, on class day, it is ₦45,000. Grab your seat before tonight: <a href="${CLASS_LINK}">join here</a>.`,
      "See you tomorrow,",
      "Levi",
    ],
  },
];

function renderMasterclassEmail(step, lead, unsubUrl) {
  const fn = esc(firstName(lead));
  const subject = step.subject.replace(/\{\{first_name\}\}/g, fn);
  const body = step.paras
    .map((p) => `<p style="margin:0 0 16px;">${p.replace(/\{\{first_name\}\}/g, fn)}</p>`)
    .join("");
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.6;color:#212c38;max-width:560px;margin:0 auto;">
  ${body}
  <hr style="border:none;border-top:1px solid #e5e1d6;margin:28px 0 12px;">
  <p style="font-size:12px;color:#8a8a84;margin:0;">You are getting this because you signed up for Levi Henry's free training.${
    unsubUrl ? ` <a href="${unsubUrl}" style="color:#8a8a84;">Unsubscribe</a>.` : ""
  }</p>
</div>`;
  return { subject, html };
}

// Earliest masterclass step this lead is due and has not had yet, or null. Only active
// leads with an email; anyone unsubscribed/stopped/bought is skipped (status !== active).
function nextDueMasterclass(lead, now = Date.now()) {
  if (!lead || lead.status !== "active" || !lead.email) return null;
  const sent = lead.mcSent || [];
  const today = watToday(now);
  for (const s of MASTERCLASS_STEPS) {
    if (today >= s.sendOn && !sent.includes(s.step)) return s;
  }
  return null;
}

module.exports = {
  SITE,
  CLASS_LINK,
  MASTERCLASS_STEPS,
  watToday,
  firstName,
  renderMasterclassEmail,
  nextDueMasterclass,
};
