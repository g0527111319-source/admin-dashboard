"use client";

/**
 * Global smooth-scroll provider using Lenis.
 *
 * - Lazy-initialized with GPU-friendly easing (cubic ease-out).
 * - Respects prefers-reduced-motion (Lenis is disabled for users who opted out).
 * - Safe to mount once at the root layout level.
 * - Exposes `window.__lenis` for child components that need to scroll-to a section.
 */

import { useEffect, useRef } from "react";
import Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Respect accessibility — if user prefers reduced motion, skip smooth scroll entirely.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // exp ease-out — feels premium
      touchMultiplier: 1.3,
      infinite: false,
      // RTL-safe: Lenis still scrolls vertically; horizontal carousels handle their own axis.
    });

    lenisRef.current = lenis;
    window.__lenis = lenis;

    let rafId: number;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete window.__lenis;
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
