"use client";

/**
 * PinnedHorizontalScroll — Awwwards-style scroll hijack.
 *
 * The section "pins" (via position: sticky) while the user continues to scroll
 * vertically — but visually the track moves horizontally across the viewport.
 * Each card fades/scales as it enters and leaves the "focal" zone of the viewport,
 * giving a cinematic, app-like reveal.
 *
 * Mechanics:
 *   1. Outer wrapper has explicit height = (N * 100vh), giving the browser room
 *      to scroll past the entire horizontal track.
 *   2. Inner sticky container stays glued to the top of the viewport while the
 *      outer wrapper scrolls past it.
 *   3. `useScroll` reports progress [0 → 1] across the wrapper; we map that to
 *      an X transform on the track.
 *   4. Each card subscribes to its own sub-range of the global progress so it
 *      can scale/fade independently as it becomes the "focal" card.
 *
 * Performance: translate3d + opacity only (no layout thrash). The transform is
 * applied to ONE element (the track), and per-card styles are cheap computed
 * springs. Lenis powers the underlying vertical scroll for buttery smoothness.
 *
 * Usage:
 *   <PinnedHorizontalScroll
 *     eyebrow="ספקי הקהילה"
 *     title="הספקים המובילים שלנו"
 *     subtitle="עבודה משותפת, איכות מוכחת"
 *   >
 *     {suppliers.map(s => <SupplierPremiumCard key={s.id} supplier={s} />)}
 *   </PinnedHorizontalScroll>
 */

import {
  useRef,
  useState,
  useEffect,
  Children,
  type ReactNode,
} from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";

type Props = {
  children: ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /**
   * Minimum card width on the track. Smaller = more cards visible at once.
   * Default: "w-[80vw] sm:w-[56vw] lg:w-[38vw] xl:w-[32vw]".
   */
  itemWidth?: string;
  /** Optional extra class on the sticky stage (e.g. background gradient). */
  stageClassName?: string;
  className?: string;
};

export default function PinnedHorizontalScroll({
  children,
  eyebrow,
  title,
  subtitle,
  itemWidth = "w-[80vw] sm:w-[56vw] lg:w-[38vw] xl:w-[32vw]",
  stageClassName = "",
  className = "",
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [overflow, setOverflow] = useState(0);

  const items = Children.toArray(children);
  const count = items.length;

  // Measure how much the track overflows the viewport so we can translate by
  // the exact pixel amount. The track itself is locked to `dir="ltr"` (see
  // below), so flex-row always lays cards out left→right regardless of the
  // document direction — meaning a NEGATIVE X transform always pans toward
  // later cards, identically for Hebrew and English.
  useEffect(() => {
    const measure = () => {
      if (!trackRef.current) return;
      const trackW = trackRef.current.scrollWidth;
      const viewW = window.innerWidth;
      setOverflow(Math.max(0, trackW - viewW));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [count]);

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ["start start", "end end"],
  });

  // Smooth the raw progress with a spring for buttery tracking.
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.35,
  });

  const x = useTransform(smoothProgress, [0, 1], [0, -overflow]);

  return (
    <section
      ref={wrapperRef}
      className={`relative ${className}`}
      // Height scales with number of cards so there's scroll room for the whole
      // horizontal track to pass by. For small counts we keep a floor.
      style={{
        height: `${Math.max(200, count * 85)}vh`,
      }}
    >
      <div
        className={`sticky top-0 h-screen overflow-hidden flex flex-col justify-center ${stageClassName}`}
      >
        {/* Header */}
        {(title || subtitle || eyebrow) && (
          <header className="px-4 sm:px-6 max-w-7xl mx-auto mb-6 sm:mb-10 w-full">
            {eyebrow && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                className="text-[11px] tracking-[0.3em] uppercase text-[#C9A84C]/80 mb-2 font-semibold"
              >
                {eyebrow}
              </motion.p>
            )}
            {title && (
              <motion.h2
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="text-3xl sm:text-5xl lg:text-6xl font-heading font-bold text-white leading-[1.05] tracking-tight"
              >
                {title}
              </motion.h2>
            )}
            {subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: 0.15 }}
                className="mt-3 text-sm sm:text-base text-white/55 max-w-2xl"
              >
                {subtitle}
              </motion.p>
            )}
          </header>
        )}

        {/* Track — dir="ltr" normalizes flex-row layout across RTL/LTR pages */}
        <motion.div
          ref={trackRef}
          dir="ltr"
          style={{ x: reduced ? 0 : x }}
          className="flex gap-5 sm:gap-8 px-[10vw] will-change-transform"
        >
          {items.map((child, i) => (
            <TrackCard
              key={i}
              index={i}
              total={count}
              progress={smoothProgress}
              className={itemWidth}
              reduced={!!reduced}
            >
              {/* Restore the document's natural direction for the card content,
                  so Hebrew/Arabic text inside each card still reads RTL. */}
              <div dir="rtl" className="h-full">
                {child}
              </div>
            </TrackCard>
          ))}
        </motion.div>

        {/* Progress indicator */}
        <div className="px-4 sm:px-6 max-w-7xl mx-auto w-full mt-6 sm:mt-10">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] origin-right"
                style={{ scaleX: smoothProgress }}
              />
            </div>
            <ProgressCounter progress={smoothProgress} count={count} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * TrackCard — one slot on the horizontal track. Computes its own transforms
 * based on where it currently sits in the global scroll progress, so it can
 * "wake up" as it enters the focal zone and fade as it exits.
 */
function TrackCard({
  children,
  index,
  total,
  progress,
  className,
  reduced,
}: {
  children: ReactNode;
  index: number;
  total: number;
  progress: MotionValue<number>;
  className: string;
  reduced: boolean;
}) {
  // Each card owns a sub-range of the global progress. We build it slightly wider
  // than a strict "equal slice" so neighbours overlap and feel continuous.
  const size = 1 / Math.max(total - 1, 1);
  const center = index * size;
  const enterStart = Math.max(0, center - size * 1.2);
  const exitEnd = Math.min(1, center + size * 1.2);

  const opacity = useTransform(
    progress,
    [enterStart, center, exitEnd],
    [0.25, 1, 0.25]
  );
  const scale = useTransform(
    progress,
    [enterStart, center, exitEnd],
    [0.88, 1, 0.88]
  );
  const y = useTransform(
    progress,
    [enterStart, center, exitEnd],
    [30, 0, 30]
  );

  if (reduced) {
    return <div className={`shrink-0 ${className}`}>{children}</div>;
  }

  return (
    <motion.div
      style={{ opacity, scale, y }}
      className={`shrink-0 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/**
 * ProgressCounter — tiny "02 / 06" style counter that ticks along with scroll.
 */
function ProgressCounter({
  progress,
  count,
}: {
  progress: MotionValue<number>;
  count: number;
}) {
  const [idx, setIdx] = useState(1);

  useEffect(() => {
    const unsub = progress.on("change", (v) => {
      const n = Math.min(count, Math.max(1, Math.round(v * (count - 1) + 1)));
      setIdx(n);
    });
    return () => unsub();
  }, [progress, count]);

  return (
    <span className="text-[11px] font-mono text-white/50 tracking-wider tabular-nums shrink-0">
      {String(idx).padStart(2, "0")}{" "}
      <span className="text-white/20">/</span>{" "}
      {String(count).padStart(2, "0")}
    </span>
  );
}
