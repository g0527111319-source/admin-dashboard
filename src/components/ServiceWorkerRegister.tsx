"use client";

/**
 * ServiceWorkerRegister — registers /sw.js on mount.
 *
 * Deliberately tiny: we only register in production (to avoid stale caches
 * during local dev) and we never block rendering. Any unhandled rejection
 * is swallowed — the app works fine without a worker.
 */

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        /* silent — SW is a progressive enhancement */
      }
    };

    // Defer until after load so it doesn't compete with hydration
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
