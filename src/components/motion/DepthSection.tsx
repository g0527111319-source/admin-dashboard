"use client";

/**
 * DepthSection — a three-layer "parallax depth" wrapper.
 *
 * Creates the feeling of a content layer floating over a distant architectural
 * backdrop, like premium design studios. Three layers stacked behind each other:
 *
 *   1. BACKGROUND   (farthest) — an architecture/interior image at 5–15% opacity
 *                   translates slower than the scroll, giving a real sense of depth.
 *   2. OVERLAY      (mid)      — a soft gradient scrim that keeps the foreground
 *                   content perfectly legible no matter what image is behind.
 *   3. CONTENT      (front)    — your children, unaffected, interactive.
 *
 * Why not `background-attachment: fixed`?
 *   - it fails on iOS Safari (ignored),
 *   - it causes janky paints on mobile,
 *   - it is GPU-hostile: the whole backdrop re-rasterizes on every frame.
 *   Instead we use a translateY on a dedicated motion layer — translate + opacity
 *   only, both compositor-friendly, no layout reads.
 *
 * Integrates with the site's Lenis smooth-scroll: Framer's `useScroll` reads the
 * shared document scroll, so Lenis-driven scrolls animate the depth layer too.
 *
 * Motion spec:
 *   - Background translates at `speed * 200px` across the section's viewport transit.
 *     0.3 = subtle, 0.5 = stronger, 0.7 = very noticeable. Default 0.4.
 *   - Respects prefers-reduced-motion (static image only — no parallax).
 *
 * Usage:
 *   <DepthSection image={DEPTH_IMAGES.marble} speed={0.4} opacity={0.1}>
 *     <div className="py-32">...</div>
 *   </DepthSection>
 */

import { useRef, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";

type OverlayTone = "dark" | "light" | "airy" | "brand" | "none";

type Props = {
  children: ReactNode;
  /** URL of the background image (architecture, interior, texture, etc.) */
  image: string;
  /** Alt for the image; defaults to empty (decorative). */
  alt?: string;
  /**
   * Parallax factor. 0.3 = subtle, 0.5 = strong, 0.7 = cinematic.
   * Keep below 0.7 to avoid the layer leaving the section boundaries visibly.
   */
  speed?: number;
  /**
   * Background image opacity. Keep between 0.05 and 0.15 for a premium feel —
   * higher and the image competes with content; lower and the depth disappears.
   */
  opacity?: number;
  /**
   * Overlay tone — colored scrim on top of the bg image.
   *   - "dark"  : black→transparent→black (for dark sections / white text)
   *   - "light" : cream wash — legible on light UI (stronger mute than "airy")
   *   - "airy"  : soft cream wash that keeps the image visible — use on light
   *              UI when you want the design photo to actually read
   *   - "brand" : subtle gold radial + dark scrim (hero sections)
   *   - "none"  : no overlay (only use if opacity ≤ 0.08)
   */
  overlayTone?: OverlayTone;
  /** Optional gaussian blur on the background only. Cheap but eats GPU on mobile. */
  blur?: boolean;
  /**
   * When true, the content area gets `min-h-screen` — handy for dedicated hero
   * sections. Default: false (content drives its own height).
   */
  fullHeight?: boolean;
  className?: string;
  /** Extra class on the inner content wrapper. */
  contentClassName?: string;
};

const OVERLAY_STYLES: Record<OverlayTone, string> = {
  dark:
    "linear-gradient(180deg, rgba(5,5,5,0.80) 0%, rgba(5,5,5,0.55) 45%, rgba(5,5,5,0.85) 100%)",
  light:
    "linear-gradient(180deg, rgba(250,249,246,0.92) 0%, rgba(250,249,246,0.80) 45%, rgba(250,249,246,0.95) 100%)",
  // "airy" is a much softer cream wash than "light" — it keeps text legible
  // but lets the underlying design photo actually show through, so the
  // beautiful homes / materials we put behind the section are visible.
  airy:
    "linear-gradient(180deg, rgba(250,249,246,0.72) 0%, rgba(250,249,246,0.42) 45%, rgba(250,249,246,0.78) 100%)",
  brand:
    "radial-gradient(60% 60% at 70% 20%, rgba(201,168,76,0.18), transparent 55%), linear-gradient(180deg, rgba(5,5,5,0.78) 0%, rgba(5,5,5,0.55) 50%, rgba(5,5,5,0.88) 100%)",
  none: "transparent",
};

export default function DepthSection({
  children,
  image,
  alt = "",
  speed = 0.4,
  opacity = 0.1,
  overlayTone = "dark",
  blur = false,
  fullHeight = false,
  className = "",
  contentClassName = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // `useScroll` with section-transit offsets gives us [0 → 1] across the span
  // from "section just appeared at bottom of viewport" to "section just left the top".
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Background travels slower than content. We translate the bg layer from
  // +travel to -travel as the section crosses the viewport, so at center it's
  // near y=0, and the user perceives depth (not a visible slide).
  //
  // The bg image is oversized (see the top/bottom insets below) so no matter
  // where in the transit we are, we never reveal the edge.
  const travel = 120 * speed; // px
  const y = useTransform(scrollYProgress, [0, 1], [travel, -travel]);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden isolate ${
        fullHeight ? "min-h-screen" : ""
      } ${className}`}
    >
      {/* ── LAYER 1 — background image with parallax ─────────────────────── */}
      {/*
        NOTE on loading strategy:
          We deliberately use `loading="eager"` (not "lazy") because these
          images are absolutely-positioned with negative insets, and the
          browser's lazy-load heuristic often fails to register them as
          in-viewport — so they never load at all, leaving sections flat.
          `fetchpriority="low"` keeps them out of the critical path so the
          LCP hero still wins bandwidth, and `decoding="async"` stops them
          from ever blocking the main thread.
      */}
      {reduced ? (
        <div
          aria-hidden
          className="absolute inset-x-0 -inset-y-[10%] pointer-events-none"
        >
          <img
            src={image}
            alt={alt}
            className={`w-full h-full object-cover ${blur ? "blur-[2px]" : ""}`}
            style={{ opacity }}
            loading="eager"
            decoding="async"
            // @ts-expect-error — fetchpriority is valid HTML but not yet in React's DOM types
            fetchpriority="low"
          />
        </div>
      ) : (
        <motion.div
          aria-hidden
          style={{ y }}
          className="absolute inset-x-0 -inset-y-[12%] pointer-events-none will-change-transform"
        >
          <img
            src={image}
            alt={alt}
            className={`w-full h-full object-cover ${blur ? "blur-[2px]" : ""}`}
            style={{ opacity }}
            loading="eager"
            decoding="async"
            // @ts-expect-error — fetchpriority is valid HTML but not yet in React's DOM types
            fetchpriority="low"
          />
        </motion.div>
      )}

      {/* ── LAYER 2 — overlay scrim for legibility ───────────────────────── */}
      {overlayTone !== "none" && (
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ background: OVERLAY_STYLES[overlayTone] }}
        />
      )}

      {/* ── LAYER 3 — content (always clickable, above everything) ───────── */}
      <div className={`relative z-10 ${contentClassName}`}>{children}</div>
    </div>
  );
}
