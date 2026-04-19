import * as React from "react";

/**
 * Small primitives used across the DS — Eyebrow, GoldText, RevealLine.
 * These are tiny enough to live together rather than in separate files.
 */

/* -------- Eyebrow — small uppercase label above headings ---------- */
export type EyebrowProps = React.HTMLAttributes<HTMLSpanElement>;
export function Eyebrow({ className, children, ...rest }: EyebrowProps) {
  const cls = ["ds-eyebrow", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

/* -------- GoldText — brand gradient with shimmer animation --------
 * Renders a <span> by default. For headings, just wrap: <h1><GoldText>…</GoldText></h1>.
 * Kept simple (non-polymorphic) on purpose — saves us from `as` type gymnastics.
 */
export type GoldTextProps = React.HTMLAttributes<HTMLSpanElement>;
export function GoldText({ className, children, ...rest }: GoldTextProps) {
  const cls = ["ds-gold-text", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

/* -------- RevealLine — horizontal gold-gradient separator -------- */
export type RevealLineProps = React.HTMLAttributes<HTMLDivElement>;
export function RevealLine({ className, ...rest }: RevealLineProps) {
  const cls = ["ds-reveal-line", className].filter(Boolean).join(" ");
  return <div className={cls} role="presentation" {...rest} />;
}

const Primitives = { Eyebrow, GoldText, RevealLine };
export default Primitives;
