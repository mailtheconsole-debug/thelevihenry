# Deploying to Netlify + connecting your domain

The site is plain static files, so hosting is quick. `netlify.toml` is already set up
(publish directory `.`, no build step).

## Step 1 — Get the site onto Netlify

**Option A — drag & drop (fastest, no accounts to wire):**
1. Go to https://app.netlify.com/drop
2. Drag the **`thelevihenry`** folder onto the page.
   - ⚠️ Skip the `assets/source/` folder — those are the full-resolution photo originals
     (100 MB+) and don't need to ship. Either delete that folder before dragging, or use
     Option B (Git), which ignores it automatically.
3. Netlify gives you a temporary URL like `random-name.netlify.app`.

**Option B — connect a Git repo (best for ongoing updates):**
1. Push this folder to a GitHub repo.
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick the repo.
3. Build command: *(leave empty)*. Publish directory: `.`
4. Deploy. Every future `git push` redeploys automatically, and `assets/source/`
   is excluded via `.gitignore`.

## Step 2 — Add your domain in Netlify

1. Open your site in Netlify → **Domain management → Add a domain**.
2. Enter your domain (e.g. `levihenrygroup.com`) and confirm you own it.

## Step 3 — Point thelevihenry.com at Netlify (registrar: WhoGoHost / Go54)

Log in to **go54.com / whogohost.com → your account → Domains → Manage thelevihenry.com**.
Pick **one** approach.

**Approach 1 — Netlify DNS (recommended, best for the apex/root domain):**
1. In Netlify → Domain management → add `thelevihenry.com`, then choose **"Use Netlify DNS"**.
2. Netlify shows **4 nameservers** like `dns1.p0X.nsone.net`, `dns2.p0X.nsone.net`, etc.
3. In Go54, open **Nameservers** for thelevihenry.com, switch to **Custom nameservers**,
   delete the existing ones, and paste Netlify's 4. Save.
4. Netlify then manages all records and auto-issues HTTPS. (Nameserver changes can take a
   few hours to ~24h.)

**Approach 2 — keep Go54's DNS (use their Zone/DNS editor):**
In Go54 → **Manage DNS / Advanced DNS (Zone Editor)** for thelevihenry.com, add:
- **A record** — Name/Host `@` (or blank / `thelevihenry.com`) → Value `75.2.60.5`
- **CNAME** — Name/Host `www` → Value `YOUR-SITE.netlify.app` (your Netlify subdomain)
- Delete any existing A/CNAME for `@` and `www` that point elsewhere (e.g. parking).
- In Netlify, add both `thelevihenry.com` and `www.thelevihenry.com`, set your preferred
  primary, and it redirects the other automatically.

> Note: Approach 1 is preferred because the apex (`thelevihenry.com`) on a single A record
> is less resilient, and WhoGoHost/Go54 may not support ALIAS/ANAME at the root. Letting
> Netlify run DNS avoids that entirely.

## Step 4 — HTTPS

Once DNS resolves (minutes to a few hours), Netlify auto-issues a free Let's Encrypt
certificate. Confirm under **Domain management → HTTPS** that it says "Certificate: Active".

---

### Notes
- DNS changes can take anywhere from a few minutes to ~24 hours to fully propagate.
- The temporary `*.netlify.app` URL keeps working the whole time.
- I can't do these steps for you — they require logging into your Netlify account and your
  registrar — but tell me your domain and registrar and I'll tailor the exact record values.
