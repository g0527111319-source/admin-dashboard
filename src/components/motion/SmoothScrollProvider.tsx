"use client";

/**
 * Global smooth-scroll provider using Lenis.
 *
 * SCOPE — why this is route-aware:
 *   Lenis hijacks the document wheel events to drive its own RAF-based smooth
 *   scrolling. That is perfect for marketing / showcase pages (home, experience,
 *   projects) where the feeling of depth + parallax matters. It is HARMFUL on
 *   dashboards, because the designer/supplier/admin/client-portal screens have
 *   inner scroll containers (sidebar, chat panes, CRM modals, contract pages).
 *   On those inner containers Lenis can swallow wheel events and block native
 *   scrolling. So we only activate Lenis on a well-defined allowlist of
 *   marketing routes, and render children unchanged on dashboard routes.
 *
 * Behavior:
 *   - Lazy-initialized with GPU-friendly easing (cubic ease-out).
 *   - Respects prefers-reduced-motion (Lenis disabled for those users).
 *   - Reinitializes on client-side route changes within the allowlist.
 *   - Exposes `window.__lenis` for children that need to scroll-to a section.
 *   - Also respects `data-lenis-prevent` attributes on inner elements as a
 *     safety net for any future case where a marketing page also has an
 *     overflow container.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

/**
 * Routes where Lenis smooth-scroll is allowed. Everything else (designer,
 * supplier, admin, client-portal, contract, card, events, ...) renders
 * with native browser scrolling so inner scroll containers work as expected.
 */
const MARKETING_PREFIXES = [
  "/experience",
  "/projects",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
];

function isMarketingRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  // Exact match for home.
  if (pathname === "/") return true;
  return MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Respect accessibility — if user prefers reduced motion, skip smooth scroll entirely.
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) return;

    // Only run Lenis on marketing routes. Dashboards keep native scroll so that
    // inner sidebars / chat panels / modals scroll normally.
    if (!isMarketingRoute(pathname)) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // exp ease-out — feels premium
      touchMultiplier: 1.3,
      infinite: false,
      // Lenis respects `data-lenis-prevent` out of the box — that lets any
      // marketing page that adds an inner scroll area opt out per-element.
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
  }, [pathname]);

  return <>{children}</>;
}
