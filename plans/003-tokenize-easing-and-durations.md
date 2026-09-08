# 003 — Consolidate easing and durations into tokens

- **Status**: DONE (applied)
- **Commit**: uncommitted (Astro project is not a git repo yet)
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 3 files (global.css + hover utilities in pages + two documented JS literals), refactor only — no feel change

## Problem

The same ease-out curve is hand-typed in multiple places and durations are scattered, with no shared source of truth:

```js
/* src/layouts/Base.astro:87 — current (WAAPI reveal) */
easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
```
```tsx
/* src/components/Hero.tsx:5 — current (Framer hero) */
const ease = [0.22, 0.61, 0.36, 1] as const;
```

Plus durations: reveal `650ms` (`Base.astro:85`), hover `duration-500` (after plan 002) across pages, arrow `duration-300`. If the curve or a duration ever needs tuning, it must be changed in several disconnected spots. This is a pure consolidation finding — the goal is one source of truth, **not** a change in how anything looks or feels.

## Target

Introduce CSS custom properties as the source of truth and reference them from the CSS-driven motion. Keep the current values exactly (no feel change).

Add to `:root` in `src/styles/global.css` (place near the existing `@theme` block, but in a plain `:root` rule since these are motion tokens, not Tailwind theme colors):

```css
:root {
  --ease-out: cubic-bezier(0.22, 0.61, 0.36, 1);
  --dur-hover: 500ms;   /* portrait hover-zoom */
  --dur-reveal: 650ms;  /* scroll-reveal entrance */
}
```

Then reference the tokens in the portrait hover-zoom utilities (the seven `<img>` from plan 002), replacing the literal duration/easing utilities with arbitrary-value utilities that read the tokens:

```astro
<!-- target: portrait hover-zoom class fragment -->
class="… object-cover transition-transform duration-[var(--dur-hover)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
```

For the two JavaScript uses that **cannot** read CSS variables (Astro `is:inline` scripts are not bundled, and the React island animates in JS), keep the literal but pin it to the token with a comment so the coupling is explicit:

```js
/* src/layouts/Base.astro:87 — mirrors --ease-out in global.css (inline script can't read CSS vars) */
easing: "cubic-bezier(0.22, 0.61, 0.36, 1)",
```
```tsx
/* src/components/Hero.tsx:5 — mirrors --ease-out in global.css */
const ease = [0.22, 0.61, 0.36, 1] as const;
```

## Repo conventions to follow

- `src/styles/global.css` already defines design tokens under `@theme` (colors, fonts). Add the motion tokens in a sibling `:root { … }` rule right after the `@theme` block. Do not put non-color motion tokens inside `@theme`.
- Tailwind v4 supports arbitrary values that reference CSS vars: `duration-[var(--dur-hover)]`, `ease-[var(--ease-out)]` compile to `transition-duration: var(--dur-hover)` / `transition-timing-function: var(--ease-out)`.

## Steps

1. In `src/styles/global.css`, add the `:root { --ease-out; --dur-hover; --dur-reveal; }` block shown in Target (values exactly as given).
2. In the seven portrait `<img>` elements (see plan 002 for the file:line list), replace `duration-500 ease-out` with `duration-[var(--dur-hover)] ease-[var(--ease-out)]`. Leave `transition-transform` and `group-hover:scale-[1.03]`.
3. Add the two clarifying comments at `src/layouts/Base.astro:87` and `src/components/Hero.tsx:5` (do not change the values).
4. Optional but recommended: at `src/layouts/Base.astro:85`, leave the `duration: 650` literal but add `/* --dur-reveal */` so the reveal duration is discoverable.

## Boundaries

- Do NOT change any value — this refactor must be visually identical. `--ease-out` = the current curve, `--dur-hover` = 500ms, `--dur-reveal` = 650ms.
- Do NOT move motion tokens into the `@theme` block.
- Do NOT touch the arrow `duration-300` utilities.
- Do NOT add dependencies.
- Depends on plan 002 having set the hover duration to 500ms; if the images still read `duration-700`, run 002 first or STOP and report.

## Verification

- **Mechanical**: `npm run build` completes clean. `grep -rn "cubic-bezier(0.22, 0.61, 0.36, 1)" src/` returns only `Base.astro`, `Hero.tsx` (now commented) and `global.css`.
- **Feel check**: run `npm run dev`; hover a portrait and scroll a section — motion looks identical to before (this is a no-op visually). Confirm in DevTools that the hover transition still resolves to `cubic-bezier(0.22, 0.61, 0.36, 1)` / 500ms via the CSS vars.
- **Done when**: the curve and hover/reveal durations each have one canonical definition, referenced (or explicitly mirrored with a comment) everywhere they're used, with zero visual change.
