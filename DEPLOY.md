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

## Step 3 — Point your domain's DNS at Netlify

Do this at your registrar (GoDaddy / Namecheap / etc.). Pick **one** approach:

**Approach 1 — Netlify DNS (simplest, recommended):**
- In Netlify's domain panel choose **"Use Netlify DNS"**. It shows 4 nameservers like
  `dns1.p0X.nsone.net`.
- At your registrar, replace the existing nameservers with those 4.
- Netlify then handles the records and provisions HTTPS automatically.

**Approach 2 — keep your registrar's DNS (add records manually):**
- **A record** — Host/Name `@` → Value `75.2.60.5`
- **CNAME record** — Host/Name `www` → Value `YOUR-SITE.netlify.app`
- (In Netlify, set the primary domain to whichever you prefer — apex or `www` — and it
  redirects the other automatically.)

## Step 4 — HTTPS

Once DNS resolves (minutes to a few hours), Netlify auto-issues a free Let's Encrypt
certificate. Confirm under **Domain management → HTTPS** that it says "Certificate: Active".

---

### Notes
- DNS changes can take anywhere from a few minutes to ~24 hours to fully propagate.
- The temporary `*.netlify.app` URL keeps working the whole time.
- I can't do these steps for you — they require logging into your Netlify account and your
  registrar — but tell me your domain and registrar and I'll tailor the exact record values.
