"use client";

/**
 * SupplierPremiumCard — luxury supplier tile with 3D tilt, dynamic shadow,
 * and an animated reveal overlay.
 *
 * Upgrades for the "Awwwards-level" pass:
 *  - Cursor-following dynamic drop shadow (the card casts a shadow in the
 *    opposite direction of the cursor, giving a real "hover-lift" feel).
 *  - Richer hover overlay: description text slides in, and a gold CTA pill
 *    appears on the bottom-left.
 *  - Uses Tilt3D under the hood for GPU-only transform rotation.
 *  - Prefers-reduced-motion: all motion is bypassed and the card reverts to
 *    a calm static design.
 */

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type MouseEvent } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { ShieldCheck, MapPin, CheckCircle2, ArrowLeft } from "lucide-react";
import Tilt3D from "@/components/motion/Tilt3D";

export type SupplierCardData = {
  id: string;
  name: string;
  category: string;
  city?: string;
  description?: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  isCommunity?: boolean;
  isVerified?: boolean;
  workedWithMe?: boolean;
  dealsCount?: number;
  href?: string; // fallback: `/suppliers/${id}`
};

type Props = {
  supplier: SupplierCardData;
  layoutIdPrefix?: string;
  index?: number;
};

export default function SupplierPremiumCard({
  supplier,
  layoutIdPrefix: _layoutIdPrefix,
  index = 0,
}: Props) {
  const href = supplier.href ?? `/suppliers/${supplier.id}`;
  const accent = supplier.isCommunity;
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  // Cursor-following shadow. The shadow offset is the inverse of the cursor
  // position relative to the card center (so if the cursor is to the top-right,
  // the shadow casts to the bottom-left).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18 });
  const sy = useSpring(my, { stiffness: 120, damping: 18 });

  // Build a multi-layer shadow expression from the motion values. Framer Motion
  // interpolates numeric motion values — for a string-valued style (boxShadow)
  // we use useTransform to assemble it each frame.
  const boxShadow = useTransform([sx, sy], ([px, py]) => {
    const glow = accent ? "rgba(201, 168, 76, 0.35)" : "rgba(0, 0, 0, 0.5)";
    return `${(px as number) * -0.3}px ${
      (py as number) * -0.3 + 20
    }px 40px -10px ${glow}, 0 4px 20px -8px rgba(0,0,0,0.5)`;
  });

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left - rect.width / 2;
    const py = e.clientY - rect.top - rect.height / 2;
    mx.set(px);
    my.set(py);
  };

  const onLeave = () => {
    mx.set(0);
    my.set(0);
    setHovered(false);
  };

  return (
    <Link href={href} className="block group" aria-label={supplier.name}>
      <motion.div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={onLeave}
        style={{ boxShadow: reduced ? undefined : boxShadow }}
        className="relative rounded-2xl overflow-hidden h-full"
      >
        <Tilt3D
          maxAngle={7}
          scale={1.015}
          glare={true}
          className={`relative rounded-2xl overflow-hidden h-full transition-all duration-500 ${
            accent
              ? "bg-gradient-to-br from-[#1f1a13] to-[#0f0e0a] border border-[#C9A84C]/30"
              : "bg-[#121218] border border-white/8"
          }`}
        >
          {/* Cover image */}
          <div className="relative aspect-[4/5] overflow-hidden">
            {supplier.coverImageUrl ? (
              <motion.div
                className="absolute inset-0"
                animate={{ scale: hovered && !reduced ? 1.08 : 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                <Image
                  src={supplier.coverImageUrl}
                  alt={supplier.name}
                  fill
                  sizes="(max-width: 640px) 85vw, 320px"
                  className="object-cover"
                  priority={index < 3}
                />
              </motion.div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#2a2520] to-[#13100b] flex items-center justify-center">
                <span className="text-[#C9A84C]/30 text-6xl font-heading font-bold">
                  {supplier.name.charAt(0)}
                </span>
              </div>
            )}

            {/* Scrim */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />

            {/* Hover scrim (darker + richer when hovered) */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-black/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: hovered ? 1 : 0 }}
              transition={{ duration: 0.4 }}
            />

            {/* Top-right badges */}
            {accent && (
              <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end z-10">
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.04 + 0.2 }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#C9A84C]/95 text-black text-[10px] font-bold rounded-full shadow-lg"
                >
                  <ShieldCheck className="w-3 h-3" />
                  ספק קהילה
                </motion.span>
                {supplier.isVerified && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.04 + 0.3 }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/90 text-white text-[10px] font-bold rounded-full"
                  >
                    <CheckCircle2 className="w-3 h-3" /> מאומת
                  </motion.span>
                )}
              </div>
            )}

            {/* Bottom info (always visible) */}
            <div className="absolute bottom-0 inset-x-0 p-4 z-10">
              <div className="flex items-end gap-3">
                {/* Logo puck */}
                {supplier.logoUrl ? (
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 bg-white/95 shrink-0 shadow-lg">
                    <Image
                      src={supplier.logoUrl}
                      alt=""
                      width={48}
                      height={48}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/20 border border-[#C9A84C]/40 flex items-center justify-center shrink-0">
                    <span className="text-lg font-heading font-bold text-[#C9A84C]">
                      {supplier.name.charAt(0)}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-heading font-bold text-base leading-tight truncate">
                    {supplier.name}
                  </h3>
                  <p className="text-[#C9A84C] text-xs font-semibold mt-0.5 truncate">
                    {supplier.category}
                  </p>
                  {supplier.city && (
                    <div className="flex items-center gap-1 text-white/60 text-[11px] mt-0.5">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{supplier.city}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description that slides up on hover */}
              {supplier.description && (
                <motion.p
                  initial={{ opacity: 0, y: 12, height: 0 }}
                  animate={{
                    opacity: hovered ? 1 : 0,
                    y: hovered ? 0 : 12,
                    height: hovered ? "auto" : 0,
                  }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="text-white/80 text-[12px] mt-3 line-clamp-2 leading-relaxed overflow-hidden"
                >
                  {supplier.description}
                </motion.p>
              )}

              {/* CTA that slides in from the bottom-left on hover */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: hovered ? 1 : 0,
                  y: hovered ? 0 : 10,
                }}
                transition={{
                  duration: 0.4,
                  delay: hovered ? 0.08 : 0,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C9A84C] bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-full px-3 py-1.5 backdrop-blur-sm"
              >
                לצפייה בפרופיל
                <ArrowLeft className="w-3 h-3" />
              </motion.div>
            </div>
          </div>

          {/* Stats row (if any) */}
          {typeof supplier.dealsCount === "number" && supplier.dealsCount > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5 bg-black/40">
              <span className="text-[11px] text-white/50">עסקאות בקהילה</span>
              <motion.span
                className="text-[#C9A84C] font-bold text-sm tabular-nums"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
              >
                {supplier.dealsCount}
              </motion.span>
            </div>
          )}
        </Tilt3D>
      </motion.div>
    </Link>
  );
}
