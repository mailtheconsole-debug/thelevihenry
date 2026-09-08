# Deploying (Netlify)

The site is an **Astro** project that builds to static files (`dist/`) plus **Netlify
Functions**. It's live at **https://thelevihenry.com** on Netlify (site name
`thelevihenry`, ID `aaf2b27d-ade3-4b70-a6dd-28971d29a74f`). DNS is on **Cloudflare**,
pointed at Netlify, with HTTPS active.

`netlify.toml` already declares everything Netlify needs:

```toml
[build]
  command = "astro build"
  publish = "dist"
[functions]
  directory = "netlify/functions"
```

## Environment variables (required — set in Netlify)

Netlify → Site configuration → **Environment variables**. These power the form functions;
without them the forms still submit but no email/CRM write happens.

| Key | What it's for |
| --- | --- |
| `RESEND_API_KEY` | Resend API key — sends the manual, contact, and discovery emails |
| `AIRTABLE_TOKEN` | Airtable personal access token (`data.records:write` on the CRM base) |
| `AIRTABLE_BASE_ID` | Airtable base ID (`app…`) for the CRM base |
| `AIRTABLE_TABLE` | Table name — `CRM` |

Resend sends from `levi@thelevihenry.com` (domain verified in Resend via Cloudflare DNS).
Airtable base: "Levi Henry Group CRM", table `CRM` with fields
`Name, Email, Source, Type, Message, Status`.

## Deploy — Option A: CLI (current method)

Build locally, then deploy the build + functions to production:

```bash
npm install
npm run build
netlify deploy --prod --dir dist --functions netlify/functions --site aaf2b27d-ade3-4b70-a6dd-28971d29a74f
```

(`assets/source/` is git-ignored and not in `dist`, so the 89MB originals never ship.)

## Deploy — Option B: Git auto-deploy (recommended)

The repo is connected to Netlify, but **continuous deployment is currently off**, which is
why Option A is used. To switch to auto-deploy:

1. Netlify → Site configuration → **Build & deploy** → enable continuous deployment for
   the `main` branch. `netlify.toml` already sets the build command (`astro build`),
   publish dir (`dist`), and functions dir, so no other config is needed.
2. After that, every `git push` to `main` triggers a Netlify build (`npm install` +
   `astro build`) and deploys automatically — no manual CLI step.

This is safe now that the repo *is* the Astro source (a build produces exactly what's live).

## Forms

Form handling is **custom Netlify Functions** (`netlify/functions/`), not Netlify Forms:
`lead-magnet.js`, `contact.js`, `discovery.js`. Each emails Levi via Resend, logs to
Airtable, and redirects. Submissions do **not** run under `astro dev` — test them on a
deploy (or with `netlify dev`).

## Domain / DNS (already set up)

`thelevihenry.com` uses **Cloudflare** nameservers and resolves to this Netlify site;
HTTPS (Let's Encrypt) is active. Nothing to do unless re-pointing. If you ever migrate:
add `thelevihenry.com` + `www` in Netlify → Domain management, then in Cloudflare DNS
point the apex to Netlify's load balancer (`75.2.60.5`) and `www` to the site's
`*.netlify.app` (set both records to **DNS only / grey cloud**, not proxied).
