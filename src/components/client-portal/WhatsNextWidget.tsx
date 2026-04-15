"use client";

/**
 * WhatsNextWidget — the welcome card on the client portal home page.
 *
 * Answers "what's happening with my project right now?" with four calm,
 * friendly info blocks:
 *   - Current phase + progress bar
 *   - Nearest meeting/site visit
 *   - Pending approval (highlighted call-to-action)
 *   - Latest shared document
 *
 * All data is fetched from /api/client-portal/{token}/whats-next.
 * The component stays read-only — actions (reply, open doc) are
 * handled by other portal sections.
 */

import { useEffect, useState } from "react";
import {
  Sparkles,
  Calendar as CalendarIcon,
  FileCheck2,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface WhatsNext {
  hasActive: boolean;
  message?: string;
  project?: { id: string; name: string };
  headline?: string;
  progress?: number;
  phases?: {
    total: number;
    completed: number;
    current: {
      id: string;
      name: string;
      deadline: string | null;
    } | null;
  };
  nextEvent?: {
    id: string;
    title: string;
    startAt: string;
    location: string | null;
  } | null;
  pendingApproval?: {
    id: string;
    title: string;
    description: string | null;
    createdAt: string;
  } | null;
  freshDoc?: {
    id: string;
    title: string | null;
    createdAt: string;
  } | null;
}

export default function WhatsNextWidget({
  token,
  onApprovalClick,
  onEventClick,
  onDocClick,
}: {
  token: string;
  onApprovalClick?: (id: string) => void;
  onEventClick?: (id: string) => void;
  onDocClick?: (id: string) => void;
}) {
  const [data, setData] = useState<WhatsNext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/client-portal/${encodeURIComponent(token)}/whats-next`
        );
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-gold/10 via-bg-card to-bg-card p-6 border border-gold/20">
        <Skeleton className="h-6 w-2/3 mb-3" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <Skeleton className="h-2 w-full mb-2" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  if (!data || !data.hasActive) {
    return (
      <div className="rounded-2xl bg-gold/5 border border-gold/20 p-6 text-center">
        <Sparkles className="w-6 h-6 text-gold mx-auto mb-2" />
        <p className="text-text-secondary">
          {data?.message || "תודה שאת/ה כאן. אין כרגע פעילות שדורשת תשומת לב."}
        </p>
      </div>
    );
  }

  const progress = data.progress ?? 0;

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gold/10 via-bg-card to-bg-card p-6 border border-gold/20 shadow-sm"
      dir="rtl"
    >
      {/* Decorative accent */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold/10 blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-gold text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              {data.project?.name}
            </div>
            <h2 className="font-heading text-xl md:text-2xl font-bold text-text-primary mt-1">
              {data.headline}
            </h2>
          </div>
          {data.phases && data.phases.total > 0 && (
            <div className="text-right">
              <div className="text-3xl font-heading font-bold text-gold tabular-nums">
                {progress}%
              </div>
              <div className="text-[11px] text-text-muted">
                {data.phases.completed}/{data.phases.total} שלבים
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {data.phases && data.phases.total > 0 && (
          <div className="mt-4">
            <div className="h-2 rounded-full bg-bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-gold to-gold/70 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            {data.phases.current && (
              <div className="mt-2 text-sm text-text-muted flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gold" />
                שלב נוכחי:{" "}
                <strong className="text-text-primary">
                  {data.phases.current.name}
                </strong>
                {data.phases.current.deadline && (
                  <span className="text-[11px] text-text-faint">
                    (יעד:{" "}
                    {new Intl.DateTimeFormat("he-IL", {
                      day: "numeric",
                      month: "numeric",
                    }).format(new Date(data.phases.current.deadline))}
                    )
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {/* Approval */}
          {data.pendingApproval ? (
            <button
              type="button"
              onClick={() => onApprovalClick?.(data.pendingApproval!.id)}
              className="text-right p-3 rounded-xl bg-gold/15 border border-gold/30 hover:bg-gold/20 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-gold text-xs font-semibold">
                <FileCheck2 className="w-3.5 h-3.5" />
                ממתין לאישור שלך
              </div>
              <div className="text-sm font-medium text-text-primary mt-1 line-clamp-2">
                {data.pendingApproval.title}
              </div>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-bg-surface-2/40 border border-border-subtle">
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                אין בקשות שממתינות לך
              </div>
              <div className="text-xs text-text-faint mt-1">הכל עדכני ✨</div>
            </div>
          )}

          {/* Event */}
          {data.nextEvent ? (
            <button
              type="button"
              onClick={() => onEventClick?.(data.nextEvent!.id)}
              className="text-right p-3 rounded-xl bg-bg-surface-2/40 border border-border-subtle hover:border-gold/40 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                <CalendarIcon className="w-3.5 h-3.5 text-gold" />
                הפגישה הבאה
              </div>
              <div className="text-sm font-medium text-text-primary mt-1 line-clamp-1">
                {data.nextEvent.title}
              </div>
              <div className="text-[11px] text-text-muted mt-0.5">
                {new Intl.DateTimeFormat("he-IL", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(data.nextEvent.startAt))}
                {data.nextEvent.location && ` · ${data.nextEvent.location}`}
              </div>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-bg-surface-2/40 border border-border-subtle">
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                <CalendarIcon className="w-3.5 h-3.5" />
                אין פגישות קרובות
              </div>
            </div>
          )}

          {/* Doc */}
          {data.freshDoc ? (
            <button
              type="button"
              onClick={() => onDocClick?.(data.freshDoc!.id)}
              className="text-right p-3 rounded-xl bg-bg-surface-2/40 border border-border-subtle hover:border-gold/40 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                <FileText className="w-3.5 h-3.5 text-gold" />
                מסמך חדש שהועלה
              </div>
              <div className="text-sm font-medium text-text-primary mt-1 line-clamp-1">
                {data.freshDoc.title || "מסמך"}
              </div>
              <div className="text-[11px] text-text-muted mt-0.5">
                {new Intl.DateTimeFormat("he-IL", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(data.freshDoc.createdAt))}
              </div>
            </button>
          ) : (
            <div className="p-3 rounded-xl bg-bg-surface-2/40 border border-border-subtle">
              <div className="flex items-center gap-1.5 text-text-muted text-xs">
                <FileText className="w-3.5 h-3.5" />
                אין מסמכים חדשים
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
