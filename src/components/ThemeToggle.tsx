"use client";

/**
 * ThemeToggle — 3-state switch: system / light / dark.
 * Intentionally compact (pill with 3 icons) so it fits in the header
 * next to notifications and the user avatar without dominating.
 */

import { Monitor, Sun, Moon } from "lucide-react";
import { useTheme, type ThemeMode } from "./ThemeProvider";
import { cn } from "@/lib/cn";

const OPTIONS: { key: ThemeMode; icon: typeof Sun; label: string }[] = [
  { key: "system", icon: Monitor, label: "מערכת" },
  { key: "light", icon: Sun, label: "בהיר" },
  { key: "dark", icon: Moon, label: "כהה" },
];

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="group"
      aria-label="מצב תצוגה"
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5 rounded-full border",
        "bg-bg-surface/70 border-border-subtle",
        compact ? "scale-[0.85]" : ""
      )}
    >
      {OPTIONS.map(({ key, icon: Icon, label }) => {
        const active = mode === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={cn(
              "relative flex items-center justify-center w-7 h-7 rounded-full transition-all",
              active
                ? "bg-gold text-white shadow-sm"
                : "text-text-muted hover:text-gold hover:bg-gold/5"
            )}
            aria-pressed={active}
            aria-label={label}
            title={label}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}
