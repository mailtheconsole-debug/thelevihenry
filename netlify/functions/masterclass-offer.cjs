// Authoritative, date-based pricing for the Meta Ads Masterclass (Sat Nov 28, 2026).
// The registration page fetches this so the price switches on its own in WAT, with no
// redeploy, and the charged amount never depends on the visitor's device clock.
//
// Windows (WAT = UTC+1):
//   early bird  ₦15,000  until end of Fri Nov 21
//   regular     ₦30,000  Nov 22 to Nov 27
//   class day   ₦45,000  Nov 28 onward
// VIP is always the ticket price + ₦40,000 (adds a 45-minute 1:1, capped at 10 seats).

const EB_END = Date.UTC(2026, 10, 21, 23, 0, 0); // Nov 22 00:00 WAT
const REG_END = Date.UTC(2026, 10, 27, 23, 0, 0); // Nov 28 00:00 WAT
const VIP_UPCHARGE = 40000;

function offer(now = Date.now()) {
  let window, regularNgn;
  if (now < EB_END) {
    window = "earlybird";
    regularNgn = 15000;
  } else if (now < REG_END) {
    window = "regular";
    regularNgn = 30000;
  } else {
    window = "classday";
    regularNgn = 45000;
  }
  return {
    window,
    regularNgn,
    vipNgn: regularNgn + VIP_UPCHARGE,
    vipUpcharge: VIP_UPCHARGE,
    // The next price and when it starts, for a live "price goes up" line on the page.
    nextNgn: window === "earlybird" ? 30000 : window === "regular" ? 45000 : null,
    nextStartsWat: window === "earlybird" ? "Nov 22" : window === "regular" ? "Nov 28" : null,
  };
}

module.exports = {
  offer,
  handler: async () => ({
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(offer()),
  }),
};
