# 001 — Respect prefers-reduced-motion in the Framer hero

- **Status**: DONE (applied)
- **Commit**: uncommitted (Astro project is not a git repo yet)
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file, small

## Problem

The Founders hero animates position (`y`) and opacity on every load with **no reduced-motion guard**. The rest of the site's motion (the WAAPI scroll-reveal) is correctly disabled for reduced-motion users in `src/styles/global.css`, so a user with `prefers-reduced-motion: reduce` gets a still page everywhere *except* this hero, which still slides in. That's both inconsistent and an accessibility miss (position animation is exactly what reduced-motion is meant to suppress).

```tsx
/* src/components/Hero.tsx:1 — current */
import { motion } from "motion/react";

/* src/components/Hero.tsx:10-17 — current (representative of all four elements) */
<motion.p
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease }}
  className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-navy-600"
>
  For Founders
</motion.p>
```

The four animated elements are: the eyebrow `<motion.p>` (`y:12`, duration 0.5), the `<motion.h1>` (`y:26`, duration 0.7, delay 0.08), the lead `<motion.p>` (`y:26`, duration 0.7, delay 0.16), and the buttons `<motion.div>` (`y:26`, duration 0.7, delay 0.24).

## Target

When reduced motion is requested: **drop the `y` movement entirely and keep a short opacity fade** (reduced motion means gentler, not zero — per the audit playbook, keep opacity/feedback, remove position). When not requested: behavior is unchanged.

Use Motion's `useReducedMotion()` hook. Exact end state for `Hero.tsx`:

```tsx
import { motion, useReducedMotion } from "motion/react";

const ease = [0.22, 0.61, 0.36, 1] as const;

export default function Hero() {
  const reduce = useReducedMotion();

  // Full motion normally; opacity-only (no position) under reduced motion.
  const rise = (y: number, delay: number) =>
    reduce
      ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3, ease },
        }
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: y === 12 ? 0.5 : 0.7, delay, ease },
        };

  return (
    <div>
      <motion.p
        {...rise(12, 0)}
        className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-navy-600"
      >
        For Founders
      </motion.p>

      <motion.h1
        {...rise(26, 0.08)}
        className="mt-4 font-serif text-[2.6rem] font-medium leading-[1.05] tracking-tight text-navy sm:text-5xl lg:text-[3.6rem]"
      >
        You built the platform. Now build the go&#8209;to&#8209;market.
      </motion.h1>

      <motion.p
        {...rise(26, 0.16)}
        className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft"
      >
        You've built something that solves a real business problem in a genuinely new way.
        But building it is only the first step. The harder question is how it reaches its
        first real users.
      </motion.p>

      <motion.div
        {...rise(26, 0.24)}
        className="mt-8 flex flex-wrap gap-4"
      >
        {/* keep the two existing <a> buttons exactly as they are */}
      </motion.div>
    </div>
  );
}
```

Note: under reduced motion the `delay` is intentionally omitted (no staggered position choreography); all elements fade in together quickly.

## Repo conventions to follow

- This is the only React island in the project; it already imports from `motion/react`. Add `useReducedMotion` to that same import — do not add a new package.
- The reduced-motion pattern the rest of the site uses lives in `src/styles/global.css:43` (`@media (prefers-reduced-motion: reduce) { .js [data-reveal] { opacity: 1; } }`) — this plan brings the hero in line with that intent.
- Keep the shared `ease` constant; do not introduce a second easing.

## Steps

1. In `src/components/Hero.tsx:1`, change the import to `import { motion, useReducedMotion } from "motion/react";`.
2. Inside the component, add `const reduce = useReducedMotion();` and the `rise(y, delay)` helper exactly as in Target.
3. Replace each of the four `initial`/`animate`/`transition` prop trios with `{...rise(<y>, <delay>)}` using the y/delay values listed in Problem (12/0, 26/0.08, 26/0.16, 26/0.24). Leave every `className` and the two `<a>` buttons untouched.

## Boundaries

- Do NOT touch any other file. This is `Hero.tsx` only.
- Do NOT change the copy, class names, links, or markup structure — only the motion props and the import.
- Do NOT add dependencies.
- If the current `Hero.tsx` no longer matches the excerpts above, STOP and report drift.

## Verification

- **Mechanical**: `npm run build` in `C:/Users/hp/Documents/thelevihenry-astro-mockup` completes with no type errors.
- **Feel check**: run `npm run dev`, open `/founders`.
  - Normal: hero eyebrow → headline → lead → buttons still stagger up on load.
  - In DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce", hard-reload `/founders`: the hero elements **fade in with no upward movement**, and no visible stagger delay.
  - Confirm the rest of the page (scroll reveals) is already static under reduced motion (existing behavior).
- **Done when**: with reduced motion on, nothing on `/founders` translates position; with it off, the hero is unchanged from today.
