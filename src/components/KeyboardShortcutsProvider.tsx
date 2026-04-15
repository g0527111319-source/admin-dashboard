"use client";

/**
 * KeyboardShortcutsProvider — single source of truth for global hotkeys.
 *
 * Shortcuts:
 *   ?        — open help overlay listing all shortcuts
 *   g h      — go home (designer today)
 *   g c      — go to clients
 *   g k      — go to calendar
 *   g i      — go to inbox
 *   g t      — go to tasks
 *   n        — new item in current context (dispatches a CustomEvent that the
 *              active view listens to; e.g. "clients" listens and opens the
 *              new-client form)
 *
 * Command-K is handled by GlobalSearch directly; we leave it alone.
 *
 * Design notes:
 * - We ignore keydowns originating from <input>, <textarea>, or contenteditable
 *   elements so typing never hijacks a shortcut.
 * - `g <letter>` is a two-key chord with a 1-second timeout.
 * - The provider renders a help overlay when the `?` key is pressed.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { X, Command } from "lucide-react";

type Shortcut = {
  keys: string[]; // keystroke sequence, e.g. ["g", "c"]
  label: string;
};

const SHORTCUTS: Shortcut[] = [
  { keys: ["⌘", "K"], label: "חיפוש גלובלי (Ctrl+K)" },
  { keys: ["?"], label: "הצגת כל הקיצורים" },
  { keys: ["g", "h"], label: "מעבר למסך היום" },
  { keys: ["g", "c"], label: "מעבר ללקוחות" },
  { keys: ["g", "k"], label: "מעבר ליומן" },
  { keys: ["g", "i"], label: "מעבר לתיבת נכנס" },
  { keys: ["g", "t"], label: "מעבר למשימות" },
  { keys: ["n"], label: "יצירה חדשה (תלוי-הקשר)" },
  { keys: ["Esc"], label: "סגירת מודאל / תפריט" },
];

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export default function KeyboardShortcutsProvider() {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [helpOpen, setHelpOpen] = useState(false);
  const chordRef = useRef<{ key: string; at: number } | null>(null);

  const designerId = useMemo(() => {
    const m = pathname.match(/^\/designer\/([^/]+)/);
    return m?.[1] ?? null;
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      // Ignore while command palette or other modals are focused — they handle Esc themselves
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setHelpOpen(false);
        return;
      }

      // Chord start: "g"
      if (e.key === "g") {
        chordRef.current = { key: "g", at: Date.now() };
        return;
      }

      // Chord completion
      const chord = chordRef.current;
      if (chord && chord.key === "g" && Date.now() - chord.at < 1000) {
        chordRef.current = null;
        if (!designerId) return;
        if (e.key === "h") return void router.push(`/designer/${designerId}#today`);
        if (e.key === "c") return void router.push(`/designer/${designerId}#clients`);
        if (e.key === "k") return void router.push(`/designer/${designerId}#calendar`);
        if (e.key === "i") return void router.push(`/designer/${designerId}#inbox`);
        if (e.key === "t") return void router.push(`/designer/${designerId}#tasks`);
        return;
      }

      if (e.key === "n") {
        // Dispatch context-aware "new" — active tab listens.
        window.dispatchEvent(new CustomEvent("zirat:new"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [designerId, router]);

  if (!helpOpen) return null;

  // Render help overlay via portal so it sits above everything
  return typeof document === "undefined"
    ? null
    : createPortal(
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="קיצורי מקלדת"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setHelpOpen(false)}
          />
          <div className="relative w-full max-w-md bg-bg-card border border-border-subtle rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.4)] overflow-hidden animate-[modalEnter_0.25s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Command className="w-4 h-4 text-gold" />
                <h2 className="font-heading font-bold text-text-primary">קיצורי מקלדת</h2>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-surface-2 text-text-muted"
                aria-label="סגור"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-1">
              {SHORTCUTS.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bg-surface-2/60 transition-colors"
                >
                  <span className="text-sm text-text-primary">{s.label}</span>
                  <span className="flex items-center gap-1">
                    {s.keys.map((k, j) => (
                      <kbd
                        key={j}
                        className="min-w-[24px] text-center px-2 py-0.5 rounded bg-bg-surface-2 border border-border-subtle text-xs font-mono text-text-secondary"
                      >
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border-subtle text-[11px] text-text-muted text-center">
              טיפ: שני-מקשים כמו <kbd className="px-1.5 py-0.5 rounded bg-bg-surface-2 font-mono">g</kbd>{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-bg-surface-2 font-mono">c</kbd> — הקלידי אותם בסדר הזה
            </div>
          </div>
        </div>,
        document.body
      );
}
