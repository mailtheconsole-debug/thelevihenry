# 002 — Tighten the portrait hover-zoom duration

- **Status**: DONE (applied)
- **Commit**: uncommitted (Astro project is not a git repo yet)
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 5 files, trivial (7 one-word class changes)

## Problem

Every portrait photo zooms on hover over **700ms**. A hover effect at 0.7s feels laggy — most noticeably on mouse-*out*, where the image takes the full 700ms to settle back to scale. Hover effects should be quick and responsive; 700ms is roughly 2x too long for this.

All seven occurrences use the same class fragment. Current code (representative):

```astro
<!-- src/pages/index.astro:58 — current -->
<img src="/assets/photos/portrait-hero.jpg" alt="Levi Henry, founder of Levi Henry Group" width="1600" height="2000" class="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" />
```

Exact locations (all portrait hover-zooms; `duration-700` appears nowhere else in the project):

- `src/pages/index.astro:58` (hero portrait)
- `src/pages/index.astro:67` (seated story portrait)
- `src/pages/about.astro:28` (hero headshot)
- `src/pages/about.astro:47` (heritage portrait)
- `src/pages/businesses.astro:38` (hero portrait)
- `src/pages/contact.astro:56` (headshot)
- `src/pages/founders.astro:53` (hero portrait)

## Target

Change the hover-zoom duration from `duration-700` to `duration-500` at all seven locations. Nothing else changes — keep `transition-transform`, `ease-out`, and `group-hover:scale-[1.03]` exactly as they are.

```astro
<!-- target -->
class="… object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
```

(500ms keeps a smooth, premium in-and-out zoom without the drag. Do not go below 300ms — a slow, deliberate image zoom is the intended feel, just not 700ms.)

## Repo conventions to follow

- Motion is expressed with Tailwind utilities on the element; keep that pattern — just swap the duration utility.
- The scale value `group-hover:scale-[1.03]` is the established zoom amount across all portraits; leave it unchanged for consistency.

## Steps

1. In each of the seven locations above, replace `duration-700` with `duration-500` inside the `<img>` `class`. A global find-and-replace of the token `duration-700` → `duration-500` across `src/pages/*.astro` is safe (it appears only on these portraits). Leave every other class untouched.

## Boundaries

- Do NOT change the scale amount, easing, `transition-transform`, alt text, dimensions, or `src`.
- Do NOT touch the button arrow hover (`duration-300`) or any other duration.
- Do NOT add dependencies.
- If any location no longer reads `duration-700` with `group-hover:scale-[1.03]`, STOP and report drift.

## Verification

- **Mechanical**: `npm run build` completes clean; `grep -rn "duration-700" src/` returns nothing.
- **Feel check**: run `npm run dev`, hover a portrait on `/` and `/about`:
  - The zoom feels responsive on hover-in and settles back promptly on hover-out (no lingering).
  - In DevTools → Animations, capture a hover and confirm the transform transition is ~500ms.
  - On a touch viewport (DevTools device mode), tapping the image does not stick the zoom on (Tailwind v4 gates `hover:` behind `@media (hover:hover)` — confirm still true).
- **Done when**: all portrait zooms run at 500ms and the settle-back no longer feels sluggish.
