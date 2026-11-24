// Scheduled daily (10:00 WAT = 09:00 UTC, set in netlify.toml) to run the Black Friday
// EXTENSION sends. It maps a specific date to a BF email step and triggers the background
// sender for it; on any other date it does nothing. Nov 28 is intentionally skipped, and
// after Nov 30 there is nothing to send, so this quietly no-ops until it is removed.
//
// It only TRIGGERS blackfriday-send-background (a 15-minute background function) over HTTP
// with the x-followup-key, so the actual throttled send is never bound by this function's
// own timeout. bfSent stamping in the sender means a repeat trigger never double-sends.

const SITE = "https://thelevihenry.com";

// UTC date (YYYY-MM-DD) -> BF step. 10am WAT is 09:00 UTC, same calendar day.
const SCHEDULE = {
  "2026-11-24": 6,
  "2026-11-25": 7,
  "2026-11-26": 8,
  "2026-11-27": 9,
  // 2026-11-28 intentionally skipped
  "2026-11-29": 10,
  "2026-11-30": 11,
};

exports.handler = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const step = SCHEDULE[today];
  if (!step) {
    return { statusCode: 200, body: `blackfriday-cron: no send scheduled for ${today}` };
  }

  const key = process.env.FOLLOWUP_KEY;
  if (!key) {
    console.error("blackfriday-cron: FOLLOWUP_KEY not set");
    return { statusCode: 200, body: "no key" };
  }

  try {
    await fetch(
      `${SITE}/.netlify/functions/blackfriday-send-background?step=${step}&audience=all`,
      { method: "POST", headers: { "x-followup-key": key } }
    );
  } catch (e) {
    console.error("blackfriday-cron: trigger failed", e);
  }

  return { statusCode: 200, body: `blackfriday-cron: triggered step ${step} for ${today}` };
};
