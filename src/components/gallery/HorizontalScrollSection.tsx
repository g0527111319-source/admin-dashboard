"use client";

/**
 * HorizontalScrollSection — magazine-style horizontal carousel.
 *
 * Scroll-snap by default (touch-friendly), with optional prev/next buttons and
 * a reactive progress bar tied to scroll position. Works beautifully in RTL
 * because modern browsers auto-flip overflow-x direction.
 *
 * Usage:
 *   <HorizontalScrollSection title="ספקים מובילים" subtitle="קולקציה נבחרת">
 *     {suppliers.map(s => <SupplierCard key={s.id} supplier={s} />)}
 *   </HorizontalScrollSection>
 */

import { useRef, useState, useEffect, type ReactNode } from "react";
import { motion, useScroll } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  itemMinWidth?: string; // e.g. "min-w-[280px]"
  className?: string;
  eyebrow?: string;
};

export default function HorizontalScrollSection({
  children,
  title,
  subtitle,
  itemMinWidth = "min-w-[280px] sm:min-w-[320px]",
  className = "",
  eyebrow,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const { scrollXProgress } = useScroll({ container: scrollerRef });

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      // In RTL mode, scrollLeft is negative in many browsers — normalize.
      const max = el.scrollWidth - el.clientWidth;
      const x = Math.abs(el.scrollLeft);
      setCanPrev(x > 8);
      setCanNext(x < max - 8);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // In RTL, "right" visually = scroll to earlier content (more-positive scrollLeft in LTR, but flipped).
    // Use clientWidth/1.5 as step so each click reveals roughly one card pair.
    const step = el.clientWidth / 1.5;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section className={`relative ${className}`}>
      {(title || subtitle || eyebrow) && (
        <header className="px-4 sm:px-6 max-w-7xl mx-auto mb-6 flex items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <p className="text-[11px] tracking-[0.3em] uppercase text-[#C9A84C]/80 mb-2 font-semibold">
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="text-2xl sm:text-4xl font-heading font-bold text-white">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-white/60 max-w-xl">{subtitle}</p>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scrollBy(1)}
              disabled={!canNext}
              aria-label="הבא"
              className="w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollBy(-1)}
              disabled={!canPrev}
              aria-label="הקודם"
              className="w-10 h-10 rounded-full border border-white/15 bg-white/5 text-white flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* Scroller */}
      <div
        ref={scrollerRef}
        className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 sm:px-6 pb-6 scrollbar-hide"
      >
        {/* Wrap each child in a snap-aligned flex item */}
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div key={i} className={`snap-start shrink-0 ${itemMinWidth}`}>
                {child}
              </div>
            ))
          : (
            <div className={`snap-start shrink-0 ${itemMinWidth}`}>{children}</div>
          )}
      </div>

      {/* Progress bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-[2px] bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A]"
            style={{ scaleX: scrollXProgress, transformOrigin: "right" }}
          />
        </div>
      </div>
    </section>
  );
}
