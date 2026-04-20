"use client";

/**
 * MasonryGallery — asymmetric CSS-columns masonry with reveal-on-scroll,
 * hover-driven zoom, and shared-element handoff to Lightbox.
 *
 * Why CSS columns (not a JS grid library)?
 * - Zero runtime cost, natural masonry layout.
 * - Works perfectly in RTL (columns auto-reverse).
 * - Tailwind-native: columns-1 sm:columns-2 lg:columns-3 xl:columns-4.
 *
 * Hover choreography (Awwwards pass):
 *   - image: scale 1.08 with a long cubic-bezier ease (900ms)
 *   - scrim: fades in dark gradient so the white caption stays legible
 *   - border: gold accent fades from 0 → 0.8
 *   - caption: slides up 8px + fades in
 *   - icon badge: pulses / mini-shifts to hint "click for details"
 *   - whole tile: y: -6 lift + dynamic shadow glow
 *
 * Each tile is a Framer <motion.div layoutId>, so clicking transitions
 * seamlessly to the Lightbox with the same layoutId prefix.
 */

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

// 10x10 cream SVG (brand ivory #FBF7ED) encoded once at build time.
// Used as next/image placeholder="blur" dataURL — avoids runtime btoa which
// isn't available during Node SSR of this module.
const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMCAxMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjRkJGN0VEIi8+PC9zdmc+";

export type MasonryItem = {
  src: string;
  alt?: string;
  caption?: string;
  href?: string; // if provided, tile wraps in Link (useful for project detail pages)
  badge?: string; // small gold pill in the corner (e.g. category label)
  overlay?: ReactNode; // rich overlay content rendered on hover
  // Optional intrinsic dimensions — when present, next/image reserves the
  // correct aspect ratio avoiding CLS. If absent we fall back to a 4:3 default.
  width?: number;
  height?: number;
};

type Props = {
  items: MasonryItem[];
  onItemClick?: (index: number) => void;
  layoutIdPrefix?: string;
  columns?: { base?: number; sm?: number; lg?: number; xl?: number };
  gap?: string; // e.g. "gap-4"
  className?: string;
};

function buildColumnClasses(cols?: Props["columns"]): string {
  const c = { base: 1, sm: 2, lg: 3, xl: 3, ...cols };
  // CSS `columns` is the magic — no JS masonry needed.
  return [
    `columns-${c.base}`,
    c.sm ? `sm:columns-${c.sm}` : "",
    c.lg ? `lg:columns-${c.lg}` : "",
    c.xl ? `xl:columns-${c.xl}` : "",
    "gap-4 sm:gap-5",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function MasonryGallery({
  items,
  onItemClick,
  layoutIdPrefix = "masonry",
  columns,
  className = "",
}: Props) {
  const colClasses = buildColumnClasses(columns);
  const reduced = useReducedMotion();

  return (
    <div className={`${colClasses} ${className}`}>
      {items.map((item, i) => {
        const imgW = item.width ?? 1200;
        const imgH = item.height ?? 900;
        const isPriority = i < 3;
        const tileInner = (
          <motion.div
            layoutId={`${layoutIdPrefix}-${i}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              duration: 0.65,
              delay: (i % 6) * 0.04, // gentle cascade within each visible batch
              ease: [0.16, 1, 0.3, 1],
            }}
            whileHover={reduced ? undefined : { y: -6 }}
            className="group/tile relative block mb-4 sm:mb-5 break-inside-avoid rounded-2xl overflow-hidden border border-white/5 bg-[#1a1a2e] cursor-pointer shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_40px_-12px_rgba(201,168,76,0.25)] transition-shadow duration-500 will-change-transform"
          >
            {/* Gold border that glows in on hover */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-[#C9A84C]/0 group-hover/tile:ring-[#C9A84C]/60 transition-[box-shadow,ring-color] duration-500 z-[2]"
            />

            <div className="relative overflow-hidden rounded-2xl">
              {/* Image — intrinsic aspect → masonry heights vary organically.
                  next/image gives us lazy loading, responsive srcset, blur-up
                  placeholder and AVIF/WebP conversion. We pass width/height so
                  the browser reserves space (avoids CLS); `h-auto` keeps the
                  layout fluid inside the column. */}
              <Image
                src={item.src}
                alt={item.alt ?? ""}
                width={imgW}
                height={imgH}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDER}
                priority={isPriority}
                draggable={false}
                className="w-full h-auto block transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/tile:scale-[1.08]"
              />

              {/* Dark scrim that animates in on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover/tile:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Subtle always-on gradient so captions never float over bright images */}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />

              {/* Badge */}
              {item.badge && (
                <div className="absolute top-3 right-3 z-[3]">
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#C9A84C]/95 text-black text-[10px] font-bold rounded-full shadow-lg backdrop-blur-sm"
                  >
                    {item.badge}
                  </motion.span>
                </div>
              )}

              {/* Arrow indicator (top-left, signals "view") */}
              <div className="absolute top-3 left-3 z-[3] opacity-0 translate-x-1 -translate-y-1 group-hover/tile:opacity-100 group-hover/tile:translate-x-0 group-hover/tile:translate-y-0 transition-all duration-500">
                <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Caption + overlay — slides up on hover */}
              {(item.caption || item.overlay) && (
                <div className="absolute inset-x-0 bottom-0 p-4 z-[3] translate-y-2 opacity-0 group-hover/tile:opacity-100 group-hover/tile:translate-y-0 transition-all duration-500">
                  {item.caption && (
                    <h3 className="text-white font-heading text-base font-semibold mb-0.5 drop-shadow">
                      {item.caption}
                    </h3>
                  )}
                  {item.overlay}
                </div>
              )}
            </div>
          </motion.div>
        );

        // Tile with click handler (Lightbox) — overrides Link.
        if (onItemClick) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onItemClick(i)}
              className="block w-full text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505] rounded-2xl"
              aria-label={item.caption ?? item.alt ?? `תמונה ${i + 1}`}
            >
              {tileInner}
            </button>
          );
        }

        // Tile wrapping a link (detail page navigation).
        if (item.href) {
          return (
            <Link key={i} href={item.href} className="block">
              {tileInner}
            </Link>
          );
        }

        return <div key={i}>{tileInner}</div>;
      })}
    </div>
  );
}
