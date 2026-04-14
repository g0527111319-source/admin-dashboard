"use client";

/**
 * MagneticButton — a button/link wrapper whose content gently tracks the cursor.
 *
 * Awwwards-level refinements:
 *  - Two-layer motion: the OUTER element translates slightly (subtle, ~8px),
 *    and the INNER content translates more (~25% of cursor distance). This
 *    gives a "magnetic core" feel without the whole box drifting out of place.
 *  - Spring damping tuned to "felt but not sticky" — the pull catches fast
 *    and snaps back cleanly.
 *  - Hover halo: an inner gold ring fades in while hovered (optional via
 *    `halo` prop) for CTA buttons that benefit from an extra premium cue.
 *  - Keeps focus-visible working because the real element still gets focus.
 *  - `strength` 0 disables magnetism entirely (for secondary use cases).
 *  - Fully bypassed under prefers-reduced-motion.
 */

import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

type Props = {
  children: ReactNode;
  strength?: number; // 0–1, how much the content follows the cursor (default 0.25)
  className?: string;
  as?: "button" | "a";
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  type?: "button" | "submit" | "reset";
  /** Render a soft gold halo behind the content while hovered. */
  halo?: boolean;
};

export default function MagneticButton({
  children,
  strength = 0.25,
  className,
  as = "button",
  href,
  onClick,
  ariaLabel,
  type,
  halo = false,
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Outer springs — calmer, less travel. The element itself shifts subtly.
  const outerX = useSpring(useTransform(x, (v) => v * 0.35), {
    stiffness: 260,
    damping: 20,
    mass: 0.25,
  });
  const outerY = useSpring(useTransform(y, (v) => v * 0.35), {
    stiffness: 260,
    damping: 20,
    mass: 0.25,
  });

  // Inner springs — snappier, more travel. The content "pulls" to the cursor.
  const innerX = useSpring(x, {
    stiffness: 220,
    damping: 18,
    mass: 0.3,
  });
  const innerY = useSpring(y, {
    stiffness: 220,
    damping: 18,
    mass: 0.3,
  });

  const onMove = (e: MouseEvent<HTMLElement>) => {
    if (reduced || !ref.current || strength === 0) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - rect.left - rect.width / 2;
    const relY = e.clientY - rect.top - rect.height / 2;
    x.set(relX * strength);
    y.set(relY * strength);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
    setHovered(false);
  };

  const onEnter = () => setHovered(true);

  const inner = (
    <>
      {halo && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background:
              "radial-gradient(120% 120% at 50% 50%, rgba(201,168,76,0.45), transparent 60%)",
            filter: "blur(18px)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.35 }}
        />
      )}
      <motion.span
        style={{
          x: innerX,
          y: innerY,
          display: "inline-flex",
          alignItems: "center",
          gap: "inherit",
        }}
        className="relative z-[1]"
      >
        {children}
      </motion.span>
    </>
  );

  const outerMotionStyle = reduced
    ? {}
    : { x: outerX, y: outerY };

  if (as === "a") {
    return (
      <motion.a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onMouseEnter={onEnter}
        className={`relative ${className ?? ""}`}
        aria-label={ariaLabel}
        style={outerMotionStyle}
      >
        {inner}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type ?? "button"}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onMouseEnter={onEnter}
      onClick={onClick}
      className={`relative ${className ?? ""}`}
      aria-label={ariaLabel}
      style={outerMotionStyle}
    >
      {inner}
    </motion.button>
  );
}
