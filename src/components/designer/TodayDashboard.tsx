"use client";

/**
 * TodayDashboard — the designer's home screen.
 *
 * Layout (mobile-first):
 *  1. Greeting + weekly snapshot (4 KPI cards with sparkline arrow)
 *  2. Meetings today (timeline)
 *  3. Tasks (overdue + due today, inline toggle)
 *  4. Unread messages preview (card with client name + first line)
 *
 * The component is intentionally informational — taps navigate to the
 * relevant CRM tab; nothing is created/destroyed inline. This keeps
 * the screen calm and predictable.
 */

import { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  MessageCircle,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { formatTime, formatRelativeTime } from "@/lib/utils";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

interface TodayData {
  today: {
    events: Array<{
      id: string;
      title: string;
      startAt: string;
      endAt: string | null;
      location: string | null;
      clientName: string | null;
      clientId: string | null;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      dueDate: string | null;
      status: string;
      clientName: string | null;
      clientId: string | null;
      overdue: boolean;
    }>;
  };
  week: {
    events: number;
    eventsPrev: number;
    tasksDone: number;
    messagesFromClients: number;
    clientsNew: number;
  };
  inbox: {
    preview: Array<{
      id: string;
      content: string;
      createdAt: string;
      clientName: string | null;
      clientId: string | null;
      projectName: string | null;
    }>;
  };
}

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 5) return "לילה טוב";
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
}

export default function TodayDashboard({
  onNavigate,
  designerName,
}: {
  onNavigate?: (hash: string) => void;
  designerName?: string;
}) {
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/designer/today");
        if (!cancelled && res.ok) setData(await res.json());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nav = (hash: string) => onNavigate?.(hash);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text-primary">
            {greetingByHour()}
            {designerName ? `, ${designerName}` : ""}
            <Sparkles className="inline w-5 h-5 text-gold ml-1 mb-1" />
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {new Intl.DateTimeFormat("he-IL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </p>
        </div>
      </div>

      {/* Weekly KPI */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-card" />
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI
            label="פגישות השבוע"
            value={data.week.events}
            diff={data.week.events - data.week.eventsPrev}
            icon={CalendarIcon}
          />
          <KPI label="משימות שנסגרו" value={data.week.tasksDone} icon={CheckCircle2} />
          <KPI label="הודעות מלקוחות" value={data.week.messagesFromClients} icon={MessageCircle} />
          <KPI label="לקוחות חדשים" value={data.week.clientsNew} icon={Users} />
        </div>
      ) : null}

      {/* Two-column grid on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Meetings today */}
        <div className="lg:col-span-2 card-static">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-text-primary flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-gold" />
              הפגישות של היום
            </h3>
            <button
              type="button"
              onClick={() => nav("calendar")}
              className="text-xs text-gold hover:underline flex items-center gap-1"
            >
              ליומן המלא
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-2">
              <SkeletonCard />
            </div>
          ) : !data || data.today.events.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<CalendarIcon />}
              title="יום שקט"
              description="אין פגישות ביומן של היום. זמן טוב להתקדם עם פרויקטים פתוחים."
            />
          ) : (
            <ul className="space-y-2">
              {data.today.events.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-bg-surface-2/40 hover:bg-gold/5 transition-colors cursor-pointer"
                  onClick={() => nav("calendar")}
                >
                  <div className="flex flex-col items-center justify-center w-14 flex-shrink-0 py-1 border-l-2 border-gold">
                    <span className="text-sm font-mono font-bold text-text-primary">
                      {formatTime(ev.startAt)}
                    </span>
                    {ev.endAt && (
                      <span className="text-[10px] text-text-faint font-mono">
                        {formatTime(ev.endAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {ev.title}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                      {ev.clientName && <span>{ev.clientName}</span>}
                      {ev.location && (
                        <>
                          <span>·</span>
                          <span className="truncate">{ev.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tasks panel */}
        <div className="card-static">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gold" />
              משימות להיום
            </h3>
            <button
              type="button"
              onClick={() => nav("tasks")}
              className="text-xs text-gold hover:underline flex items-center gap-1"
            >
              כל המשימות
              <ArrowLeft className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : !data || data.today.tasks.length === 0 ? (
            <EmptyState
              size="sm"
              icon={<CheckCircle2 />}
              title="הכל סגור"
              description="אין משימות פתוחות להיום. עבודה יפה 👏"
            />
          ) : (
            <ul className="space-y-1.5 max-h-[320px] overflow-y-auto">
              {data.today.tasks.slice(0, 10).map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-2 p-2 rounded-lg hover:bg-bg-surface-2/60 transition-colors cursor-pointer"
                  onClick={() => nav("tasks")}
                >
                  <Clock
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      t.overdue ? "text-red-500" : "text-gold"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">{t.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-muted">
                      {t.clientName && <span className="truncate">{t.clientName}</span>}
                      {t.overdue && (
                        <span className="flex items-center gap-0.5 text-red-600 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          באיחור
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Inbox preview */}
      <div className="card-static">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-text-primary flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-gold" />
            הודעות שלא נקראו
          </h3>
          <button
            type="button"
            onClick={() => nav("inbox")}
            className="text-xs text-gold hover:underline flex items-center gap-1"
          >
            לתיבת הנכנס המלאה
            <ArrowLeft className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            <SkeletonCard />
          </div>
        ) : !data || data.inbox.preview.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<MessageCircle />}
            title="אין הודעות ממתינות"
            description="כל ההודעות מהלקוחות נקראו. תיבת הנכנס ריקה."
          />
        ) : (
          <ul className="space-y-2">
            {data.inbox.preview.map((m) => (
              <li
                key={m.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-bg-surface-2/40 hover:bg-gold/5 transition-colors cursor-pointer"
                onClick={() => nav("inbox")}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center flex-shrink-0">
                  <span className="text-gold font-bold text-sm">
                    {m.clientName?.[0] ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {m.clientName || "לקוח/ה"}
                      {m.projectName && (
                        <span className="text-text-faint mr-1.5">· {m.projectName}</span>
                      )}
                    </span>
                    <span className="text-[11px] text-text-muted flex-shrink-0">
                      {formatRelativeTime(m.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted line-clamp-1 mt-0.5">{m.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  diff,
  icon: Icon,
}: {
  label: string;
  value: number;
  diff?: number;
  icon: typeof CalendarIcon;
}) {
  const trend = diff === undefined ? null : diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return (
    <div className="card-static !p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <Icon className="w-4 h-4 text-gold/70" />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-heading font-bold text-text-primary tabular-nums">
          {value}
        </span>
        {trend === "up" && (
          <span className="flex items-center gap-0.5 text-[11px] text-emerald-600">
            <TrendingUp className="w-3 h-3" />+{diff}
          </span>
        )}
        {trend === "down" && (
          <span className="flex items-center gap-0.5 text-[11px] text-red-500">
            <TrendingDown className="w-3 h-3" />
            {diff}
          </span>
        )}
      </div>
    </div>
  );
}
