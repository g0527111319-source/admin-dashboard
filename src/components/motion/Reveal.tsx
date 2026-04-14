"use client";

/**
 * Reveal — animates a block into view when it enters the viewport.
 *
 * Variants:
 *   - "fade"        : opacity only
 *   - "up" | "down" : slide + fade from Y
 *   - "right" | "left" : slide + fade from X (RTL-aware: flip the sign if needed)
 *   - "scale"       : scale + fade (0.92 → 1)
 *   - "blur"        : blur + fade (editorial "lens focus" feel)
 *
 * Usage:
 *   <Reveal variant="up" delay={0.1}>
 *     <h2>Section title</h2>
 *   </Reveal>
 *
 * Children can be a single element or multiple — wrapped in a motion.div.
 * For a staggered list, use <RevealStagger>.
 */

import { motion, type Variants, useReducedMotion } from "framer-motion";

export type RevealVariant = "fade" | "up" | "down" | "left" | "right" | "scale" | "blur";

type Props = {
  children: React.ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  amount?: number;
  className?: string;
  as?: "div" | "section" | "article" | "li" | "span";
};

const DISTANCE = 36;

function buildVariants(variant: RevealVariant, distance: number): Variants {
  switch (variant) {
    case "up":
      return { hidden: { opacity: 0, y: distance }, visible: { opacity: 1, y: 0 } };
    case "down":
      return { hidden: { opacity: 0, y: -distance }, visible: { opacity: 1, y: 0 } };
    case "left":
      return { hidden: { opacity: 0, x: distance }, visible: { opacity: 1, x: 0 } };
    case "right":
      return { hidden: { opacity: 0, x: -distance }, visible: { opacity: 1, x: 0 } };
    case "scale":
      return { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1 } };
    case "blur":
      return {
        hidden: { opacity: 0, filter: "blur(10px)" },
        visible: { opacity: 1, filter: "blur(0px)" },
      };
    case "fade":
    default:
      return { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  }
}

export default function Reveal({
  children,
  variant = "up",
  delay = 0,
  duration = 0.7,
  distance = DISTANCE,
  once = true,
  amount = 0.2,
  className,
  as = "div",
}: Props) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as] as typeof motion.div;

  if (reduced) {
    return <MotionTag className={className}>{children}</MotionTag>;
  }

  const variants = buildVariants(variant, distance);

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={variants}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // same cubic-bezier as the rest of the site
      }}
    >
      {children}
    </MotionTag>
  );
}

/**
 * RevealStagger — wrap a list of children so each enters with a progressive delay.
 * Children should be direct JSX elements (they'll all receive the child variants).
 */
export function RevealStagger({
  children,
  stagger = 0.08,
  delay = 0,
  variant = "up",
  once = true,
  amount = 0.15,
  className,
}: {
  children: React.ReactNode;
  stagger?: number;
  delay?: number;
  variant?: RevealVariant;
  once?: boolean;
  amount?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const itemVariants = buildVariants(variant, DISTANCE);

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reduced ? 0 : stagger,
        delayChildren: delay,
      },
    },
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={containerVariants}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {child}
            </motion.div>
          ))
        : (
          <motion.div variants={itemVariants} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            {children}
          </motion.div>
        )}
    </motion.div>
  );
}
