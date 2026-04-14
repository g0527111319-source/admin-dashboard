"use client";

/**
 * PageTransition — wraps route content with a soft fade + lift + blur transition.
 *
 * In Next 14 App Router there is no built-in route-change event, so we key the
 * AnimatePresence child by `pathname`. When the path changes the old page fades
 * out (with a tiny blur) and the new one fades in. Works both client-side and
 * on full navigations.
 *
 * Variants:
 *   - "fade"  : opacity + subtle lift (default, lightweight)
 *   - "blur"  : opacity + blur(8px) + lift — heavier, cinematic
 *   - "scale" : opacity + slight scale(0.98) + lift — app-native
 *
 * Use at the root of (public) layouts where you want transitions — avoid inside
 * dashboards with heavy data so we don't re-mount expensive subtrees.
 */

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Variant = "fade" | "blur" | "scale";

const VARIANT_PRESETS: Record<
  Variant,
  {
    initial: Record<string, string | number>;
    animate: Record<string, string | number>;
    exit: Record<string, string | number>;
  }
> = {
  fade: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
  },
  blur: {
    initial: { opacity: 0, y: 16, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -12, filter: "blur(8px)" },
  },
  scale: {
    initial: { opacity: 0, y: 12, scale: 0.985 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -12, scale: 0.985 },
  },
};

export default function PageTransition({
  children,
  variant = "fade",
  duration = 0.45,
}: {
  children: React.ReactNode;
  variant?: Variant;
  duration?: number;
}) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  if (reduced) return <>{children}</>;

  const preset = VARIANT_PRESETS[variant];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={preset.initial}
        animate={preset.animate}
        exit={preset.exit}
        transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
