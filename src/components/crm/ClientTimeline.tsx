"use client";

/**
 * ClientTimeline — chronological activity feed for a single client.
 *
 * Consumed inside the client detail drawer / page. Renders a vertical
 * timeline with a "rail" (line + dot) and per-item chips indicating
 * who was the actor (designer / client / system) and the kind of event.
 *
 * The component is read-only and purely presentational; all data comes
 * from /api/designer/crm/clients/:id/timeline.
 */

import { useEffect, useState } from "react";
import {
  MessageCircle,
  Calendar as CalendarIcon,
  Activity,
  CheckCircle2,
  FileText,
  Camera,
  Upload,
  UserPlus,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { formatRelativeTime } from "@/lib/utils";

interface TimelineItem {
  id: string;
  kind: "activity" | "message" | "event_past" | "event_upcoming" | "note";
  at: string;
  title: string;
  detail: string | null;
  actor: "designer" | "client" | "system" | null;
  meta: Record<string, unknown> | null;
}

interface TimelineResponse {
  client: { id: string; name: string };
  items: TimelineItem[];
}

function iconFor(item: TimelineItem) {
  if (item.kind === "message") return MessageCircle;
  if (item.kind === "event_upcoming" || item.kind === "event_past")
    return CalendarIcon;
  const action = (item.meta?.action as string) || "";
  if (action.includes("photo")) return Camera;
  if (action.includes("upload")) return Upload;
  if (action.includes("quote") || action.includes("contract")) return FileText;
  if (action.includes("approved") || action.includes("completed"))
    return CheckCircle2;
  if (action === "client_created" || action === "project_created")
    return UserPlus;
  return Activity;
}

function actorBadge(actor: TimelineItem["actor"]) {
  if (actor === "client")
    return {
      label: "לקוח",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    };
  if (actor === "system")
    return {
      label: "מערכת",
      className: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };
  return {
    label: "מעצבת",
    className: "bg-gold/10 text-gold border-gold/20",
  };
}

function kindAccent(kind: TimelineItem["kind"]) {
  if (kind === "event_upcoming") return "text-blue-500 bg-blue-500/10";
  if (kind === "event_past") return "text-text-muted bg-bg-surface-2";
  if (kind === "message") return "text-gold bg-gold/10";
  return "text-gold bg-gold/10";
}

function groupByDay(items: TimelineItem[]) {
  const groups = new Map<string, TimelineItem[]>();
  for (const it of items) {
    const d = new Date(it.at);
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
    const arr = groups.get(key) ?? [];
    arr.push(it);
    groups.set(key, arr);
  }
  return Array.from(groups.entries());
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const isY = d.toDateString() === y.toDateString();
  if (isToday) return "היום";
  if (isY) return "אתמול";
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(d);
}

export default function ClientTimeline({ clientId }: { clientId: string }) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/designer/crm/clients/${clientId}/timeline?limit=80`
        );
        if (!cancelled && res.ok) setData(await res.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={<Activity />}
        title="אין עדיין פעילות"
        description="כשתתחילי לעבוד עם הלקוח תראי כאן ציר הזמן המלא – הודעות, פגישות, אישורים ועוד."
      />
    );
  }

  const groups = groupByDay(data.items);

  return (
    <div className="space-y-6">
      {groups.map(([day, items]) => (
        <div key={day}>
          <div className="sticky top-0 z-10 bg-bg-card/90 backdrop-blur-sm py-1.5">
            <div className="text-[11px] uppercase tracking-wide text-text-faint font-semibold">
              {dayLabel(day)}
            </div>
          </div>

          <div className="relative mt-2">
            {/* Vertical rail */}
            <div
              className="absolute top-0 bottom-0 w-px bg-border-subtle"
              style={{ right: "1.125rem" }}
              aria-hidden
            />
            <ul className="space-y-3">
              {items.map((item) => {
                const Icon = iconFor(item);
                const badge = actorBadge(item.actor);
                const accent = kindAccent(item.kind);
                return (
                  <li key={item.id} className="relative flex items-start gap-3">
                    <div
                      className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-bg-card ${accent}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium text-text-primary truncate">
                            {item.title}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          {item.kind === "event_upcoming" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              עתידי
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-text-muted flex-shrink-0">
                          {formatRelativeTime(item.at)}
                        </span>
                      </div>
                      {item.detail && (
                        <p className="text-xs text-text-muted mt-1 line-clamp-2">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
