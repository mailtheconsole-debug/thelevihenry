// Keyed CSV export of the free SDR training lead store (Netlify Blobs "training-leads").
// Same secret as the follow-ups worklist: /.netlify/functions/leads-export?key=<FOLLOWUP_KEY>
// Downloads every lead as a CSV Levi can open or import into an email tool.
//
// Optional filter: &status=active (or stopped | bought | unsubscribed) to export one group.
// Read-only: it never changes a lead. noindex, and refuses without the key.

const { listLeads } = require("./lib/leadstore.cjs");

function authed(event) {
  const key =
    (event.queryStringParameters || {}).key ||
    (event.headers && (event.headers["x-followup-key"] || event.headers["X-Followup-Key"]));
  return process.env.FOLLOWUP_KEY && key === process.env.FOLLOWUP_KEY;
}

// RFC-4180 style cell: wrap in quotes, double any inner quotes. Leading apostrophe on
// values that a spreadsheet would treat as a formula, so an export can't be weaponized.
function cell(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function firstName(lead) {
  const n = (lead && lead.name ? String(lead.name) : "").trim();
  return n ? n.split(/\s+/)[0] : "";
}

exports.handler = async (event) => {
  if (!process.env.FOLLOWUP_KEY) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "Not set up: add a FOLLOWUP_KEY env var in Netlify, then open this with ?key=<that value>.",
    };
  }
  if (!authed(event)) return { statusCode: 401, body: "nope" };

  const wantStatus = ((event.queryStringParameters || {}).status || "").trim().toLowerCase();

  let leads = [];
  try {
    leads = await listLeads();
  } catch (e) {
    console.error("leads-export: could not list leads", e);
    return { statusCode: 500, body: "Could not read the lead store." };
  }

  if (wantStatus) leads = leads.filter((l) => String(l.status || "").toLowerCase() === wantStatus);
  // Newest opt-ins first.
  leads.sort((a, b) => String(b.optinAt || b.createdAt || "").localeCompare(String(a.optinAt || a.createdAt || "")));

  const header = [
    "Email",
    "First name",
    "Full name",
    "WhatsApp",
    "Status",
    "Opt-in date",
    "Emails sent",
    "Last email step",
    "WhatsApp steps done",
    "Updated",
  ];
  const rows = [header.map(cell).join(",")];
  for (const l of leads) {
    const emailsSent = Array.isArray(l.emailsSent) ? l.emailsSent : [];
    const waDone = Array.isArray(l.whatsappDone) ? l.whatsappDone : [];
    rows.push(
      [
        l.email || "",
        firstName(l),
        l.name || "",
        l.whatsappRaw || l.whatsapp || "",
        l.status || "",
        l.optinAt || l.createdAt || "",
        emailsSent.length,
        emailsSent.length ? Math.max.apply(null, emailsSent.map(Number).filter((n) => !isNaN(n))) : "",
        waDone.join(" "),
        l.updatedAt || "",
      ].map(cell).join(",")
    );
  }

  const csv = "﻿" + rows.join("\r\n") + "\r\n"; // BOM so Excel reads UTF-8
  const stamp = new Date().toISOString().slice(0, 10);
  const fname = `training-leads${wantStatus ? "-" + wantStatus : ""}-${stamp}.csv`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fname}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
    body: csv,
  };
};
