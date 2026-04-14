"use client";

/**
 * Parallax — subtle scroll-driven Y translation.
 *
 * - `speed` is the translation factor relative to scroll distance (0.2 = gentle, 0.5 = strong).
 * - Negative speed translates upward (content moves faster than scroll).
 * - Honors prefers-reduced-motion by rendering children inertly.
 *
 * Usage: wrap a hero background image or decorative layer.
 *   <Parallax speed={0.25}>
 *     <img src="/hero-bg.jpg" ... />
 *   </Parallax>
 */

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

type Props = {
  children: React.ReactNode;
  speed?: number;
  className?: string;
};

export default function Parallax({ children, speed = 0.25, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Tie progress to the element's own viewport transit (start → end of section).
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Map progress (0 → 1) to Y pixels. Default range: ± speed * 200px.
  const y = useTransform(scrollYProgress, [0, 1], [speed * 200, -speed * 200]);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}
