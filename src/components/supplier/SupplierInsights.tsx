"use client";

/**
 * SupplierInsights — a friendly "how am I doing" dashboard for suppliers.
 *
 * Focused on three questions:
 *  - Am I being approved? (approval rate + trend)
 *  - Am I getting business? (deals + avg value)
 *  - What's next? (upcoming posts)
 *
 * Plus a "tips" section pulled straight from the API with light
 * actionable guidance. No external chart libraries — we draw a tiny
 * 2-bar sparkline with raw divs to keep the bundle small.
 */

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  Star,
  Handshake,
  CalendarClock,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

interface Insights {
  supplier: {
    id: string;
    name: string;
    averageRating: number;
    ratingCount: number;
  };
  posts: {
    last30: { total: number; APPROVED?: number; PENDING?: number; REJECTED?: number; PUBLISHED?: number };
    prev30: { total: number; APPROVED?: number; PENDING?: number; REJECTED?: number; PUBLISHED?: number };
    approvalRate: number;
    prevApprovalRate: number;
    approvalDiff: number;
  };
  deals: {
    last30Count: number;
    last30AvgAmount: number;
    totalAmount: number;
    recent: Array<{
      id: string;
      amount: number;
      rating: number | null;
      reportedAt: string;
      supplierConfirmed: boolean;
    }>;
  };
  topSlot: { time: string; approvals: number } | null;
  upcomingPosts: Array<{
    id: string;
    status: string;
    scheduledDate: string;
    scheduledTime: string | null;
    caption: string | null;
    imageUrl: string | null;
  }>;
  tips: string[];
}

export default function SupplierInsights({
  supplierId,
}: {
  supplierId: string;
}) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/supplier/insights`, {
          headers: { "x-supplier-id": supplierId },
        });
        if (res.ok) setData(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [supplierId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-32 rounded-card" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState
        size="sm"
        icon={<TrendingUp />}
        title="לא ניתן לטעון תובנות"
        description="נסי לרענן בעוד רגע"
      />
    );
  }

  const p = data.posts;

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          התובנות שלך
        </h2>
        <p className="text-sm text-text-muted mt-1">
          סיכום 30 הימים האחרונים, השוואה לחודש הקודם ומה שצפוי קדימה.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="שיעור אישור פוסטים"
          value={`${p.approvalRate}%`}
          diff={p.approvalDiff}
          suffix="%"
          icon={CheckCircle2}
        />
        <StatCard
          label="פוסטים פעילים (30 ימים)"
          value={p.last30.total}
          diff={p.last30.total - p.prev30.total}
          icon={TrendingUp}
        />
        <StatCard
          label="עסקאות דווחו"
          value={data.deals.last30Count}
          icon={Handshake}
        />
        <StatCard
          label="דירוג ממוצע"
          value={
            data.supplier.ratingCount > 0
              ? data.supplier.averageRating.toFixed(1)
              : "—"
          }
          hint={
            data.supplier.ratingCount
              ? `(${data.supplier.ratingCount} ביקורות)`
              : "אין עדיין"
          }
          icon={Star}
        />
      </div>

      {/* Tips */}
      {data.tips.length > 0 && (
        <div className="p-4 rounded-2xl bg-gold/5 border border-gold/20">
          <h3 className="flex items-center gap-2 font-heading font-bold text-text-primary mb-2">
            <Lightbulb className="w-4 h-4 text-gold" />
            טיפים מהמערכת
          </h3>
          <ul className="space-y-1.5">
            {data.tips.map((t, i) => (
              <li
                key={i}
                className="text-sm text-text-secondary flex items-start gap-2"
              >
                <span className="text-gold mt-0.5">✦</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Best time slot */}
      {data.topSlot && (
        <div className="p-4 rounded-2xl bg-bg-card border border-border-subtle">
          <h3 className="font-heading font-bold text-text-primary mb-1">
            השעה שעובדת לך הכי טוב
          </h3>
          <p className="text-sm text-text-muted">
            ב-90 הימים האחרונים, בשעה{" "}
            <strong className="text-gold">{data.topSlot.time}</strong> התקבלו{" "}
            {data.topSlot.approvals} פוסטים שאושרו. הישארי עם השעה הזאת כברירת
            מחדל.
          </p>
        </div>
      )}

      {/* Upcoming posts */}
      <div className="card-static">
        <h3 className="flex items-center gap-2 font-heading font-bold text-text-primary mb-3">
          <CalendarClock className="w-4 h-4 text-gold" />
          צפוי להתפרסם השבוע
        </h3>
        {data.upcomingPosts.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<CalendarClock />}
            title="אין פוסטים בתור"
            description="זמן טוב לתזמן פוסטים חדשים — ולקבל חשיפה רציפה."
          />
        ) : (
          <ul className="space-y-2">
            {data.upcomingPosts.map((post) => {
              const d = new Date(post.scheduledDate);
              return (
                <li
                  key={post.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-bg-surface-2/40"
                >
                  <div className="text-center w-14 flex-shrink-0">
                    <div className="text-sm font-bold text-text-primary">
                      {new Intl.DateTimeFormat("he-IL", {
                        day: "numeric",
                        month: "numeric",
                      }).format(d)}
                    </div>
                    <div className="text-[10px] font-mono text-text-muted">
                      {post.scheduledTime || ""}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary line-clamp-2">
                      {post.caption || "ללא כיתוב"}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full flex-shrink-0 ${
                      post.status === "APPROVED"
                        ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                    }`}
                  >
                    {post.status === "APPROVED" ? "אושר" : "ממתין"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  diff,
  suffix,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  diff?: number;
  suffix?: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
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
        {trend === "up" && diff !== undefined && (
          <span className="flex items-center gap-0.5 text-[11px] text-emerald-600">
            <TrendingUp className="w-3 h-3" />+{diff}
            {suffix}
          </span>
        )}
        {trend === "down" && diff !== undefined && (
          <span className="flex items-center gap-0.5 text-[11px] text-red-500">
            <TrendingDown className="w-3 h-3" />
            {diff}
            {suffix}
          </span>
        )}
      </div>
      {hint && <span className="text-[11px] text-text-faint">{hint}</span>}
    </div>
  );
}
