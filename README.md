# Levi Henry Group

Personal professional website for Levi Henry / Levi Henry Group — a consulting and
education company helping individuals build high-income skills and helping small
businesses implement the systems that generate and scale revenue.

Static HTML/CSS/JS. No frameworks, no build step.

## Design

- **Palette** (from the brand logo): deep navy `#14273f`, warm ivory `#f4f1ea`, and a
  restrained brass accent `#b0823c` drawn from Levi's styling. Navy + ivory + brass keeps
  it warm and editorial rather than cold-corporate.
- **Type:** Fraunces (display serif) + Archivo (grotesque sans that echoes the logo
  wordmark), via Google Fonts.
- **Logo:** rendered as crisp inline SVG in the header/footer; raster brand kit lives in
  `assets/brand/`. Favicon at `assets/brand/favicon.svg`.
- **Motion:** subtle scroll reveals (IntersectionObserver) with a safety-net timer;
  respects `prefers-reduced-motion`.
- **A11y/UX:** skip links, focus-visible outlines, alt text on every image, lazy-loaded
  below-fold images with width/height to avoid layout shift.

## Pages

- `index.html` — Home (hero + stats, story, audience fork, pillars, testimonials,
  portfolio preview, CTA)
- `about.html` — the pivot story, heritage, music (Halo Mr.)
- `individuals.html` — sales skill-building + the "Remote SDR Career Blueprint" book
- `businesses.html` — paid acquisition + funnels/tech/revenue infrastructure
- `portfolio.html` — filterable work grid + testimonials
- `contact.html` — contact form + direct details

Shared: `styles.css`, `main.js`.

## Assets

```
assets/
  brand/    logo kit (primary/reversed/mark/stacked) + favicon.svg
  photos/   web-optimized JPGs used by the site (86–312 KB each)
  video/    testimonial-geoffrey.mp4, testimonial-manny.mp4
  source/   full-resolution photo originals (git-ignored archive)
```

Photos were downscaled/recompressed from 8–16 MB originals. Testimonial videos load
lazily (`preload="none"`) behind a play overlay, so they never slow the initial page.

## Run locally

```bash
python -m http.server 5178 --directory .
```

Then visit http://localhost:5178

## Before launch — still to supply

- Real contact email, scheduling link, and social handles (currently placeholders)
- Contact-form backend endpoint (Formspree, Netlify Forms, etc.)
- Full portfolio write-ups / links for hitsoundx, The Fashion Architect, and the two
  sales case studies
- Program pricing on the For Individuals page
