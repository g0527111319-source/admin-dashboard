"use client";

/**
 * Tilt3D — 3D rotation driven by cursor position over a card.
 *
 * Gives cards a "floating ID card" feel. Uses CSS 3D transforms with a mild
 * perspective so it stays subtle (not gimmicky). All rotations spring-damped.
 *
 * Usage:
 *   <Tilt3D className="rounded-2xl overflow-hidden">
 *     <img src={...} />
 *     <div className="p-4">...</div>
 *   </Tilt3D>
 */

import { useRef, type MouseEvent, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

type Props = {
  children: ReactNode;
  className?: string;
  maxAngle?: number; // maximum tilt angle in degrees (default 8)
  scale?: number; // hover scale (default 1.02)
  glare?: boolean; // render a subtle specular highlight layer
};

export default function Tilt3D({
  children,
  className,
  maxAngle = 8,
  scale = 1.02,
  glare = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [maxAngle, -maxAngle]), {
    stiffness: 220,
    damping: 20,
  });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-maxAngle, maxAngle]), {
    stiffness: 220,
    damping: 20,
  });
  const scl = useSpring(1, { stiffness: 240, damping: 22 });

  // Glare position (0-100%) derived from cursor.
  const glareX = useTransform(mx, [-0.5, 0.5], ["20%", "80%"]);
  const glareY = useTransform(my, [-0.5, 0.5], ["20%", "80%"]);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(nx);
    my.set(ny);
  };

  const onEnter = () => scl.set(scale);
  const onLeave = () => {
    mx.set(0);
    my.set(0);
    scl.set(1);
  };

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className={className}
      style={{
        rotateX: rotX,
        rotateY: rotY,
        scale: scl,
        transformStyle: "preserve-3d",
        perspective: 1000,
        willChange: "transform",
      }}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background: `radial-gradient(circle at ${glareX.get()} ${glareY.get()}, rgba(255,255,255,0.18), transparent 40%)`,
            // The radial-gradient re-renders via the background style on motion changes.
            mixBlendMode: "plus-lighter",
          }}
        />
      )}
    </motion.div>
  );
}
