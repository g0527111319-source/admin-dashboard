"use client";

/**
 * Lightbox — fullscreen image preview with app-like transitions.
 *
 * Awwwards-level upgrades:
 *  - Shared-element `layoutId` zoom-from-thumbnail (no jarring re-mount).
 *  - Backdrop crossfades with a blur-in animation (feels like iOS Photos).
 *  - Image swap uses a spring-driven slide with AnimatePresence, so moving
 *    between photos feels app-native, not web-native.
 *  - Keyboard: ←/→/Esc; RTL-aware so arrows match reading direction.
 *  - Touch: swipe with elastic drag, snap thresholds scaled to velocity.
 *  - Preloads neighbours so navigation never stalls.
 *  - Respects prefers-reduced-motion.
 */

import { useEffect, useCallback, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "framer-motion";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

// Cream (brand ivory #FBF7ED) 10x10 SVG, pre-encoded to avoid runtime btoa.
const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMCAxMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjRkJGN0VEIi8+PC9zdmc+";

export type LightboxImage = {
  src: string;
  alt?: string;
  caption?: string;
};

type Props = {
  images: LightboxImage[];
  index: number | null;
  onClose: () => void;
  onChange?: (index: number) => void;
  layoutIdPrefix?: string;
};

export default function Lightbox({
  images,
  index,
  onClose,
  onChange,
  layoutIdPrefix = "lb",
}: Props) {
  const reduced = useReducedMotion();
  const isOpen = index !== null && index >= 0 && index < images.length;
  const current = isOpen ? images[index!] : null;
  // direction tracks whether the user went forward (+1) or backward (-1), so the
  // entering image animates in from the correct side.
  const [direction, setDirection] = useState(0);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      const next = (index + delta + images.length) % images.length;
      setDirection(delta > 0 ? 1 : -1);
      onChange?.(next);
    },
    [index, images.length, onChange]
  );

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // RTL: visually-right arrow = previous in Hebrew reading order.
      if (e.key === "ArrowRight") go(-1);
      if (e.key === "ArrowLeft") go(1);
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, go, onClose]);

  // Preload neighbours for instant nav
  useEffect(() => {
    if (!isOpen) return;
    const preload = (i: number) => {
      const img = new window.Image();
      img.src = images[i].src;
    };
    const prevIdx = (index! - 1 + images.length) % images.length;
    const nextIdx = (index! + 1) % images.length;
    preload(prevIdx);
    preload(nextIdx);
  }, [index, isOpen, images]);

  // Swipe thresholds — velocity-weighted so quick flicks count.
  const onDragEnd = (_e: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.25;
    if (swipe > 80) go(-1);
    else if (swipe < -80) go(1);
  };

  // Slide animations for the inner image when navigating between shots.
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir === 0 ? 0 : dir > 0 ? 60 : -60,
      opacity: dir === 0 ? 1 : 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
      scale: 0.98,
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && current && (
        <motion.div
          key="lightbox"
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label={current.caption ?? current.alt ?? "תצוגת תמונה מורחבת"}
        >
          {/* Backdrop — crossfades with a short blur ramp for depth */}
          <motion.div
            className="absolute inset-0 bg-black/85"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
          />

          {/* Close */}
          <motion.button
            onClick={onClose}
            aria-label="סגירה"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.15 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="absolute top-4 left-4 z-[101] w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-md"
          >
            <X className="w-5 h-5" />
          </motion.button>

          {/* Counter */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.15 }}
            className="absolute top-4 right-4 z-[101] px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md tabular-nums"
          >
            {String((index ?? 0) + 1).padStart(2, "0")}{" "}
            <span className="text-white/40">/</span>{" "}
            {String(images.length).padStart(2, "0")}
          </motion.div>

          {/* Prev / Next */}
          {images.length > 1 && (
            <>
              {/* RTL: "previous" visually sits on the right */}
              <motion.button
                onClick={() => go(-1)}
                aria-label="הקודם"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.08, x: 4 }}
                whileTap={{ scale: 0.95 }}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-[101] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-md"
              >
                <ChevronRight className="w-6 h-6" />
              </motion.button>
              <motion.button
                onClick={() => go(1)}
                aria-label="הבא"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.08, x: -4 }}
                whileTap={{ scale: 0.95 }}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-[101] w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors backdrop-blur-md"
              >
                <ChevronLeft className="w-6 h-6" />
              </motion.button>
            </>
          )}

          {/* Image shell uses layoutId for the initial zoom-from-thumbnail, and
              a nested AnimatePresence for inter-photo transitions. */}
          <motion.div
            layoutId={`${layoutIdPrefix}-${index}`}
            className="relative z-[101] max-w-[92vw] max-h-[86vh] flex items-center justify-center will-change-transform"
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 28,
              mass: 0.7,
            }}
          >
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={current.src}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.45,
                  ease: [0.16, 1, 0.3, 1],
                }}
                drag={reduced ? false : "x"}
                dragElastic={0.18}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={onDragEnd}
                className="cursor-grab active:cursor-grabbing"
              >
                <Image
                  src={current.src}
                  alt={current.alt ?? ""}
                  width={1920}
                  height={1280}
                  sizes="92vw"
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                  priority
                  draggable={false}
                  className="max-w-[92vw] max-h-[86vh] w-auto h-auto object-contain rounded-xl shadow-2xl select-none"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Caption */}
          {current.caption && (
            <motion.p
              key={`caption-${index}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ delay: 0.25 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[101] px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm max-w-[80vw] text-center"
            >
              {current.caption}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
