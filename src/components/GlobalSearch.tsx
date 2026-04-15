"use client";

/**
 * GlobalSearch — Command Palette (⌘K / Ctrl+K).
 *
 * Opens with the keyboard shortcut anywhere in the app. When active,
 * fetches real data from the designer's tenant (clients, projects,
 * upcoming events) and shows a fuzzy-matched list.
 *
 * Also surfaces "quick actions":
 *   - New client (designer → clients tab with add form)
 *   - New event (designer → calendar)
 *   - Today dashboard
 *   - Inbox
 *
 * Full keyboard control: ↑/↓ to move, Enter to pick, Esc to close.
 */

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  X,
  Users,
  FolderKanban,
  Calendar,
  Plus,
  Home,
  Inbox,
  ArrowLeft,
  CornerDownLeft,
  Command,
} from "lucide-react";

type Result =
  | { kind: "client"; id: string; title: string; subtitle?: string }
  | { kind: "project"; id: string; title: string; subtitle?: string; clientId?: string }
  | { kind: "event"; id: string; title: string; subtitle?: string; clientId?: string | null }
  | { kind: "action"; id: string; title: string; subtitle?: string; icon: typeof Plus; href: string };

const ICON_BY_KIND = {
  client: Users,
  project: FolderKanban,
  event: Calendar,
} as const;

const LABEL_BY_KIND = {
  client: "לקוחות",
  project: "פרויקטים",
  event: "אירועים קרובים",
} as const;

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname() || "";

  // Only fetch real data when we're inside a designer workspace.
  const designerId = useMemo(() => {
    const m = pathname.match(/^\/designer\/([^/]+)/);
    return m?.[1] ?? null;
  }, [pathname]);

  const quickActions: Result[] = useMemo(() => {
    if (!designerId) return [];
    return [
      {
        kind: "action",
        id: "today",
        title: "מסך היום",
        subtitle: "פגישות, משימות והודעות של היום",
        icon: Home,
        href: `/designer/${designerId}#today`,
      },
      {
        kind: "action",
        id: "inbox",
        title: "תיבת נכנס",
        subtitle: "כל ההודעות וההתראות במקום אחד",
        icon: Inbox,
        href: `/designer/${designerId}#inbox`,
      },
      {
        kind: "action",
        id: "new-client",
        title: "לקוח חדש",
        subtitle: "הוספת לקוח + פרויקט ראשון",
        icon: Plus,
        href: `/designer/${designerId}#clients?new=1`,
      },
      {
        kind: "action",
        id: "new-event",
        title: "אירוע / פגישה חדשה",
        subtitle: "יומן ולוח זמנים",
        icon: Calendar,
        href: `/designer/${designerId}#calendar?new=1`,
      },
    ];
  }, [designerId]);

  // Keyboard shortcut: ⌘K / Ctrl+K
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
    if (e.key === "Escape") setOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    if (!open || !designerId) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/designer/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const merged: Result[] = [
          ...(data.clients || []),
          ...(data.projects || []),
          ...(data.events || []),
        ];
        setResults(merged);
        setIndex(0);
      } catch {
        /* ignore aborts and transient errors */
      } finally {
        setLoading(false);
      }
    }, 140);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open, designerId]);

  // Combine results + quick actions. Quick actions show only when
  // query is empty or matches their title.
  const combined: Result[] = useMemo(() => {
    const q = query.trim();
    const actions =
      q.length === 0
        ? quickActions
        : quickActions.filter((a) => a.title.includes(q) || a.subtitle?.includes(q));
    return [...actions, ...results];
  }, [quickActions, results, query]);

  // Group for display (actions as first group)
  const grouped = useMemo(() => {
    const groups: Array<{ label: string; items: Result[] }> = [];
    const actions = combined.filter((r) => r.kind === "action");
    if (actions.length) groups.push({ label: "פעולות מהירות", items: actions });
    (["client", "project", "event"] as const).forEach((kind) => {
      const items = combined.filter((r) => r.kind === kind);
      if (items.length) groups.push({ label: LABEL_BY_KIND[kind], items });
    });
    return groups;
  }, [combined]);

  const flatItems = grouped.flatMap((g) => g.items);

  const handleSelect = useCallback(
    (r: Result) => {
      setOpen(false);
      if (!designerId) return;
      if (r.kind === "action") {
        router.push(r.href);
        return;
      }
      if (r.kind === "client") {
        router.push(`/designer/${designerId}#clients?id=${r.id}`);
        return;
      }
      if (r.kind === "project") {
        router.push(`/designer/${designerId}#clients?id=${r.clientId}&project=${r.id}`);
        return;
      }
      if (r.kind === "event") {
        router.push(`/designer/${designerId}#calendar?event=${r.id}`);
        return;
      }
    },
    [router, designerId]
  );

  // Keyboard navigation inside the palette
  const handlePaletteKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, Math.max(0, flatItems.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatItems[index];
        if (item) handleSelect(item);
      }
    },
    [flatItems, index, handleSelect]
  );

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>(`[data-idx="${index}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!open) return null;

  let rowIdx = -1;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-label="חיפוש גלובלי"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      <div className="relative w-full max-w-xl bg-bg-card border border-border-subtle rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.4)] overflow-hidden animate-[modalEnter_0.25s_cubic-bezier(0.16,1,0.3,1)]">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <Search className="w-5 h-5 text-gold flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handlePaletteKey}
            placeholder="חיפוש לקוחות, פרויקטים, אירועים — או הקלידי 'חדש'"
            className="flex-1 bg-transparent text-text-primary placeholder-text-faint outline-none text-base"
            dir="rtl"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          )}
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-bg-surface-2 transition-colors"
            aria-label="סגור"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2">
          {!designerId && (
            <div className="px-4 py-8 text-center text-text-muted text-sm">
              החיפוש הגלובלי זמין מתוך החשבון של המעצבת
            </div>
          )}

          {designerId && grouped.length === 0 && !loading && (
            <div className="px-4 py-10 text-center text-text-muted text-sm">
              {query.trim().length === 0 ? "טוענת פריטים אחרונים…" : `לא נמצאו תוצאות עבור "${query}"`}
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.label} className="mb-2">
              <div className="px-4 py-2 text-[11px] text-gold font-semibold uppercase tracking-wider">
                {group.label}
              </div>
              {group.items.map((item) => {
                rowIdx += 1;
                const active = rowIdx === index;
                const Icon =
                  item.kind === "action" ? item.icon : ICON_BY_KIND[item.kind as "client" | "project" | "event"];
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    data-idx={rowIdx}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setIndex(rowIdx)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-right ${
                      active ? "bg-gold/10" : "hover:bg-bg-surface-2/60"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        active ? "bg-gold text-white" : "bg-bg-surface-2 text-gold"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-text-primary text-sm font-medium truncate">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-text-muted text-xs truncate">{item.subtitle}</div>
                      )}
                    </div>
                    {active && <ArrowLeft className="w-3.5 h-3.5 text-gold flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border-subtle text-[11px] text-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-surface-2 font-mono">↑↓</kbd>
              ניווט
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-surface-2 font-mono flex items-center gap-0.5">
                <CornerDownLeft className="w-2.5 h-2.5" />
              </kbd>
              בחירה
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded bg-bg-surface-2 font-mono">Esc</kbd>
              סגירה
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3" />
            <span>+K</span>
          </span>
        </div>
      </div>
    </div>
  );
}
