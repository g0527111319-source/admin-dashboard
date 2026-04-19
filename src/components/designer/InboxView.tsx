"use client";

/**
 * InboxView — unified inbox for designer.
 *
 * Sources surfaced together:
 *  - Client messages (from the project chat)
 *  - WhatsApp inbound
 *
 * UX:
 *  - Tab strip at the top: All / Unread / Clients / WhatsApp
 *  - Virtualized-friendly list (we cap at 80 items so no virtualization needed)
 *  - Tapping an item: navigates to the relevant tab via onNavigate(hash) and
 *    marks the item as read.
 *  - Bulk actions: select all, mark selected as read/unread.
 *
 * Everything is intentionally read-only here — replies live in the full
 * Clients / WhatsApp tabs. This keeps the inbox fast and focused on triage.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Inbox as InboxIcon,
  MessageCircle,
  Phone,
  CheckCheck,
  Circle,
  RefreshCw,
  Filter,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/utils";

type Source = "client" | "whatsapp" | "system";
type Filter = "all" | "unread" | "clients" | "whatsapp";

interface InboxItem {
  id: string;
  source: Source;
  title: string;
  preview: string;
  createdAt: string;
  isRead: boolean;
  clientName: string | null;
  clientId: string | null;
  projectId: string | null;
  actionHref: string | null;
}

interface InboxResponse {
  items: InboxItem[];
  counts: { total: number; unread: number; bySource: Record<string, number> };
}

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "הכל" },
  { key: "unread", label: "לא נקראו" },
  { key: "clients", label: "לקוחות" },
  { key: "whatsapp", label: "WhatsApp" },
];

function sourceIcon(source: Source) {
  if (source === "whatsapp") return Phone;
  if (source === "client") return MessageCircle;
  return InboxIcon;
}

function sourceLabel(source: Source) {
  if (source === "whatsapp") return "WhatsApp";
  if (source === "client") return "צ'אט לקוח";
  return "מערכת";
}

export default function InboxView({
  onNavigate,
}: {
  onNavigate?: (hash: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [data, setData] = useState<InboxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (f: Filter) => {
      try {
        const res = await fetch(`/api/designer/inbox?filter=${f}`);
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    setLoading(true);
    load(filter);
  }, [filter, load]);

  const refresh = async () => {
    setRefreshing(true);
    await load(filter);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!data) return;
    if (selected.size === data.items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.items.map((i) => i.id)));
    }
  };

  const markAs = async (action: "read" | "unread", ids?: string[]) => {
    const target = ids ?? Array.from(selected);
    if (target.length === 0) return;
    // Optimistic update
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((it) =>
              target.includes(it.id) ? { ...it, isRead: action === "read" } : it
            ),
          }
        : prev
    );
    try {
      await fetch("/api/designer/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: target, action }),
      });
    } catch {
      /* best-effort */
    }
    setSelected(new Set());
  };

  const handleItemClick = (item: InboxItem) => {
    if (!item.isRead) markAs("read", [item.id]);
    if (item.actionHref) {
      const hash = item.actionHref.startsWith("#")
        ? item.actionHref.slice(1)
        : item.actionHref;
      onNavigate?.(hash);
    }
  };

  const counts = data?.counts;
  const visibleItems = useMemo(() => data?.items ?? [], [data]);

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, InboxItem[]>();
    for (const it of visibleItems) {
      const d = new Date(it.createdAt);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const arr = groups.get(key) ?? [];
      arr.push(it);
      groups.set(key, arr);
    }
    return Array.from(groups.entries());
  }, [visibleItems]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary flex items-center gap-2">
            <InboxIcon className="w-6 h-6 text-gold" />
            תיבת הנכנס
          </h1>
          <p className="text-sm text-text-muted mt-1">
            כל ההודעות, ההתראות והפניות – במקום אחד.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="p-2 rounded-lg hover:bg-bg-surface-2 text-text-muted transition-colors"
            aria-label="רענן"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-surface-2/50 border border-border-subtle overflow-x-auto">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const badge =
            f.key === "unread"
              ? counts?.unread
              : f.key === "clients"
                ? counts?.bySource?.client
                : f.key === "whatsapp"
                  ? counts?.bySource?.whatsapp
                  : undefined;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`relative px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap ${
                active
                  ? "bg-gold text-white font-semibold shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-surface-2"
              }`}
            >
              {f.label}
              {typeof badge === "number" && badge > 0 && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                    active ? "bg-white/25 text-white" : "bg-gold/15 text-gold"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gold/10 border border-gold/30">
          <div className="flex items-center gap-2 text-sm text-text-primary">
            <Filter className="w-4 h-4 text-gold" />
            <span className="font-medium">{selected.size} פריטים נבחרו</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => markAs("read")}
              className="btn-gold !px-3 !py-1.5 !text-xs"
            >
              סמן כנקראו
            </button>
            <button
              type="button"
              onClick={() => markAs("unread")}
              className="px-3 py-1.5 text-xs rounded-lg border border-gold/40 text-gold hover:bg-gold/10 transition-colors"
            >
              סמן כלא-נקראו
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 text-xs rounded-lg text-text-muted hover:text-text-primary transition-colors"
            >
              בטל
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <EmptyState
          icon={<InboxIcon />}
          title="אין הודעות חדשות"
          description={
            filter === "unread"
              ? "כל ההודעות נקראו. נשאר רק לחייך."
              : "שום פריט לא מחכה לך כאן. זמן טוב להתקדם עם עבודה יצירתית."
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Select-all hint */}
          <div className="flex items-center justify-between px-1 text-xs text-text-muted">
            <button
              type="button"
              onClick={selectAll}
              className="hover:text-text-primary transition-colors"
            >
              {selected.size === visibleItems.length
                ? "בטל בחירה"
                : "בחר הכל"}
            </button>
            <span>{visibleItems.length} פריטים</span>
          </div>

          {groupedByDay.map(([day, items]) => {
            const d = new Date(day);
            const now = new Date();
            const isToday =
              d.toDateString() === now.toDateString();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const isYesterday = d.toDateString() === yesterday.toDateString();
            const label = isToday
              ? "היום"
              : isYesterday
                ? "אתמול"
                : new Intl.DateTimeFormat("he-IL", {
                    day: "numeric",
                    month: "long",
                  }).format(d);
            return (
              <div key={day} className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wide text-text-faint font-semibold px-1">
                  {label}
                </div>
                <ul className="space-y-1.5">
                  {items.map((item) => {
                    const Icon = sourceIcon(item.source);
                    const isSel = selected.has(item.id);
                    return (
                      <li
                        key={item.id}
                        className={`group relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          item.isRead
                            ? "bg-bg-card border-border-subtle hover:border-gold/30 hover:bg-gold/5"
                            : "bg-gold/5 border-gold/20 hover:border-gold/40 hover:bg-gold/10"
                        } ${isSel ? "ring-2 ring-gold" : ""}`}
                        onClick={() => handleItemClick(item)}
                      >
                        {/* Checkbox (appears on hover or when in select mode) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(item.id);
                          }}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSel
                              ? "bg-gold border-gold text-white"
                              : "border-border-subtle bg-bg-card opacity-0 group-hover:opacity-100"
                          }`}
                          aria-label="בחר פריט"
                        >
                          {isSel && <CheckCheck className="w-3 h-3" />}
                        </button>

                        {/* Source icon */}
                        <div
                          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                            item.source === "whatsapp"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-gold/15 text-gold"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {!item.isRead && (
                                <Circle className="w-2 h-2 fill-gold text-gold flex-shrink-0" />
                              )}
                              <span
                                className={`text-sm truncate ${
                                  item.isRead
                                    ? "text-text-primary"
                                    : "text-text-primary font-semibold"
                                }`}
                              >
                                {item.title}
                              </span>
                              <span className="text-[10px] text-text-faint px-1.5 py-0.5 rounded bg-bg-surface-2/60 flex-shrink-0">
                                {sourceLabel(item.source)}
                              </span>
                            </div>
                            <span className="text-[11px] text-text-muted flex-shrink-0">
                              {formatRelativeTime(item.createdAt)}
                            </span>
                          </div>
                          <p
                            className={`text-xs mt-1 line-clamp-2 ${
                              item.isRead ? "text-text-muted" : "text-text-secondary"
                            }`}
                          >
                            {item.preview || "—"}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
