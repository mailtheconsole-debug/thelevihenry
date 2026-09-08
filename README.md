# Levi Henry Group

Website for Levi Henry Group — a consulting, education, and technology company helping
individuals build high-income skills, small businesses build revenue systems, and startup
founders take a platform to market.

Built with **Astro** (static output) + **Tailwind CSS v4**, with a few **Netlify
Functions** for form handling. Live at **https://thelevihenry.com**.

## Stack

- **Astro 5** — static site generation (`build.format: 'file'` → clean URLs like `/about`).
- **Tailwind CSS v4** — via `@tailwindcss/vite`; theme tokens live in `src/styles/global.css`.
- **React island** — one component (`src/components/Hero.tsx`) uses Framer Motion (`motion`)
  for the Founders hero; everything else is static HTML.
- **Netlify Functions** — `netlify/functions/*.js` handle the forms (see below), using
  **Resend** for email and **Airtable** as a lightweight CRM.

## Structure

```
src/
  layouts/Base.astro       shell: <head>, fonts, favicon, global JS (mobile menu,
                           scroll-reveal via Web Animations API, form status)
  components/
    Header.astro           nav + mobile menu + active states (written once)
    Footer.astro
    Hero.tsx               Founders hero (React island, Framer Motion, reduced-motion aware)
  pages/                   one file per route (index, about, individuals, businesses,
                           founders, contact, gtm-field-manual, book-discovery, privacy, terms)
  styles/global.css        Tailwind import + design/motion tokens
public/assets/             photos, brand kit, video (served as /assets/...)
netlify/functions/         lead-magnet.js, contact.js, discovery.js
plans/                     animation improvement plans (from the improve-animations skill)
assets/source/             full-res photo originals — git-ignored, not deployed
```

## Design

- **Palette:** deep navy `#14273f`, warm ivory `#f4f1ea`, near-white `#fbf9f4`, and a
  steel-blue accent (`#2f5079` / light `#accbe6`). Cool, editorial. Defined as Tailwind
  tokens (`bg-navy`, `text-ink-soft`, etc.) in `global.css`.
- **Type:** Fraunces (display serif) + Archivo (grotesque sans), via Google Fonts.
- **Motion tokens** (in `global.css`): `--ease-out` (strong ease-out), `--dur-hover`,
  `--dur-reveal`, `--dur-press`. Scroll-reveal + sibling stagger is driven by the Web
  Animations API in `Base.astro`; portraits zoom on hover; buttons/cards press on `:active`.
  All motion respects `prefers-reduced-motion`.
- **Section rhythm:** pages alternate ivory / raised (`bg-paper`) / dark (`bg-navy`) bands
  so long pages read as chapters.

## Pages

- `/` — Home (hero, story, three-audience fork, dark "core areas" band, testimonials, CTA)
- `/about` — the pivot story, heritage, timeline (dark band), what LHG does today
- `/individuals` — high-income sales skills, the SDR blueprint + course, how it works
- `/businesses` — marketing/paid acquisition + funnels/tech (boxed services), case studies
- `/founders` — GTM consulting: 8-module program (dark band), frameworks, gated manual
- `/gtm-field-manual` — the lead-magnet resource (noindex)
- `/book-discovery` — quick "what's your goal" form before the discovery call (noindex)
- `/contact` — contact form + details
- `/privacy`, `/terms` — legal

## Forms (Netlify Functions + Resend + Airtable)

Each form POSTs to a function that emails Levi via Resend and logs a row to the Airtable
CRM (`Source` distinguishes them), then redirects:

- **`lead-magnet`** — GTM manual signup → emails the manual to the lead + notifies Levi → `/gtm-field-manual`.
- **`contact`** — contact message → emails Levi (reply-to sender) → `/contact?sent=1`.
- **`discovery`** — discovery-call goal → notifies Levi + logs it → forwards to the Selar booking link.

Booking links (Selar): discovery call routes through `/book-discovery`; the paid GTM
consultation links directly.

## Run locally

```bash
npm install
npm run dev
```

Then visit the printed `localhost` URL. Note: the **Netlify Functions do not run** under
`astro dev` — form submissions only work on the deployed site (or via `netlify dev`).

## Build

```bash
npm run build     # outputs static site to dist/
npm run preview   # preview the built site
```

See `DEPLOY.md` for deploying to Netlify and the required environment variables.
