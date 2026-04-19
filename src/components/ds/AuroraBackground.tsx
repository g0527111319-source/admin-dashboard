import * as React from "react";

/**
 * AuroraBackground — wraps children in a warm cream surface with two
 * radial gold gradients (static `.ds-aurora-bg`) and optionally three
 * drifting animated blobs (`.ds-aurora-blobs`). Used as the top-level
 * wrapper for marketing / public pages.
 *
 * Cosmetic only. Does not affect routing, SEO, or content.
 */

export type AuroraBackgroundProps = {
  children: React.ReactNode;
  /** Add animated drifting orbs (more dramatic, best for hero sections). */
  animated?: boolean;
  /** Overlay a subtle 24px blueprint grid on top (for technical/plan pages). */
  blueprint?: boolean;
  className?: string;
};

export function AuroraBackground({
  children,
  animated = false,
  blueprint = false,
  className,
}: AuroraBackgroundProps) {
  const cls = [
    "ds-aurora-bg",
    blueprint ? "ds-blueprint" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      {animated && (
        <div className="ds-aurora-blobs" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      )}
      {children}
    </div>
  );
}

export default AuroraBackground;
