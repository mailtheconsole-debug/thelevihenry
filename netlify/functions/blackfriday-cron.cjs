// Scheduled daily (10:00 WAT = 09:00 UTC, set in netlify.toml) to run the Black Friday
// EXTENSION sends. It maps a specific date to a BF email step and triggers the background
// sender for it; on any other date it does nothing. Nov 28 is intentionally skipped, and
// after Nov 30 there is nothing to send, so this quietly no-ops until it is removed.
//
// It only TRIGGERS blackfriday-send-background (a 15-minute background function) over HTTP
// with the x-followup-key, so the actual throttled send is never bound by this function's
// own timeout. bfSent stamping in the sender means a repeat trigger never double-sends.

const SITE = "https://thelevihenry.com";

// UTC date (YYYY-MM-DD) -> { step, audience }. 10am WAT is 09:00 UTC, same calendar day.
// Nov 28 is the one broadcast-free day in the window: it sends step 12 to WARM only (the
// free-training leads) so they get a sale email instead of the paused full-price nurture,
// with no collision against the all-audience broadcast on the other days.
const SCHEDULE = {
  "2026-11-24": { step: 6, audience: "all" },
  "2026-11-25": { step: 7, audience: "all" },
  "2026-11-26": { step: 8, audience: "all" },
  "2026-11-27": { step: 9, audience: "all" },
  "2026-11-28": { step: 12, audience: "warm" },
  "2026-11-29": { step: 10, audience: "all" },
  "2026-11-30": { step: 11, audience: "all" },
};

exports.handler = async () => {
  const today = new Date().toISOString().slice(0, 10);
  const entry = SCHEDULE[today];
  if (!entry) {
    return { statusCode: 200, body: `blackfriday-cron: no send scheduled for ${today}` };
  }
  const { step, audience } = entry;

  const key = process.env.FOLLOWUP_KEY;
  if (!key) {
    console.error("blackfriday-cron: FOLLOWUP_KEY not set");
    return { statusCode: 200, body: "no key" };
  }

  try {
    await fetch(
      `${SITE}/.netlify/functions/blackfriday-send-background?step=${step}&audience=${audience}`,
      { method: "POST", headers: { "x-followup-key": key } }
    );
  } catch (e) {
    console.error("blackfriday-cron: trigger failed", e);
  }

  return {
    statusCode: 200,
    body: `blackfriday-cron: triggered step ${step} (${audience}) for ${today}`,
  };
};
