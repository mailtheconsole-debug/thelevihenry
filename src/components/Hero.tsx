import { motion, useReducedMotion } from "motion/react";

// A React island: hydrated in the browser, animated with Framer Motion.
// ease mirrors --ease-out in global.css (island JS can't read CSS vars).
const ease = [0.23, 1, 0.32, 1] as const;

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
        <a
          href="https://selar.com/y1308v4j00"
          className="group inline-flex items-center gap-2 rounded-sm bg-navy px-7 py-3.5 font-sans text-sm font-semibold text-white transition hover:bg-navy-deep"
        >
          Book a GTM Strategy Consultation
          <span className="transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
        </a>
        <a
          href="/book-discovery"
          className="inline-flex items-center rounded-sm border border-navy px-7 py-3.5 font-sans text-sm font-semibold text-navy transition hover:bg-navy hover:text-white"
        >
          Free discovery call
        </a>
      </motion.div>
    </div>
  );
}
