"use client";

/**
 * ThemeProvider — manages light/dark/system mode.
 *
 * Design goals:
 * - NO flash of wrong theme on first paint: we inline a tiny blocking script
 *   in <head> (see `ThemeScript`) that reads localStorage BEFORE React hydrates
 *   and sets the `.dark` class on <html> synchronously.
 * - System preference is respected by default.
 * - Per-user persistence via localStorage key `zirat-theme`.
 *
 * Usage:
 * - Wrap root in <ThemeProvider>.
 * - Use <ThemeToggle /> anywhere to toggle.
 * - Use useTheme() to read/set mode programmatically.
 */

import * as React from "react";

export type ThemeMode = "light" | "dark" | "system";
const STORAGE_KEY = "zirat-theme";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function getSystem(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  // Update theme-color meta so mobile browsers match
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = resolved === "dark" ? "#0B0B0C" : "#C9A84C";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = React.useState<ThemeMode>("system");
  const [resolved, setResolved] = React.useState<"light" | "dark">("light");

  // Hydrate from localStorage on mount
  React.useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? (window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null)
      : null) || "system";
    setModeState(stored);
  }, []);

  // Resolve mode → actual theme, and keep in sync with system preference
  React.useEffect(() => {
    const compute = () => {
      const r = mode === "system" ? getSystem() : mode;
      setResolved(r);
      apply(r);
    };
    compute();
    if (mode !== "system") return;
    // If tracking system, re-resolve whenever the OS flips
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", compute);
    return () => media.removeEventListener("change", compute);
  }, [mode]);

  const setMode = React.useCallback((next: ThemeMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage disabled — still flip in-memory */
    }
    setModeState(next);
  }, []);

  const toggle = React.useCallback(() => {
    // Cycle: system → light → dark → system
    setMode(mode === "system" ? "light" : mode === "light" ? "dark" : "system");
  }, [mode, setMode]);

  const value = React.useMemo(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    // Graceful degradation — allows components to render even if provider isn't
    // mounted (e.g. in tests or isolated previews).
    return {
      mode: "system" as ThemeMode,
      resolved: "light" as const,
      setMode: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

/**
 * Inline script that runs BEFORE React hydration to set the initial theme
 * class. Prevents flash of wrong theme.
 *
 * Drop into <head> of root layout:
 *   <script dangerouslySetInnerHTML={{ __html: ThemeScript }} />
 */
export const ThemeScript = `
(function(){try{
  var m = localStorage.getItem('zirat-theme') || 'system';
  var dark = m === 'dark' || (m === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
}catch(e){}})();
`;
