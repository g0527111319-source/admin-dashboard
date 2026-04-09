"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type AuditEntry = {
  id: string;
  action: string;
  actorType: string;
  actorName?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  reason?: string | null;
  createdAt: string;
};

type Props = {
  subscriptionId: string;
};

const ACTION_LABELS: Record<string, string> = {
  created: "נוצר",
  plan_changed: "שינוי תוכנית",
  status_changed: "שינוי סטטוס",
  payment_succeeded: "תשלום הצליח",
  payment_failed: "כשל בתשלום",
  payment_retried: "ניסיון תשלום חוזר",
  cancelled: "בוטל",
  paused: "הושהה",
  resumed: "הופעל מחדש",
  promoted_auto: "שודרג אוטומטית",
  coupon_applied: "קופון הופעל",
  coupon_removed: "קופון הוסר",
  trial_granted: "ניסיון הוענק",
  trial_ended: "ניסיון הסתיים",
  downgrade_scheduled: "שדרוג לאחור מתוזמן",
  downgrade_applied: "שדרוג לאחור הוחל",
  upgrade_applied: "שדרוג הוחל",
  grace_entered: "כניסה לתקופת חסד",
  grace_exited: "יציאה מתקופת חסד",
  deleted: "נמחק",
  restored: "שוחזר",
};

const ACTOR_LABELS: Record<string, string> = {
  designer: "מעצבת",
  admin: "מנהל מערכת",
  system: "מערכת",
  webhook: "webhook",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function SubscriptionAuditTimeline({ subscriptionId }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`/api/admin/subscriptions/${subscriptionId}/audit`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error("שגיאה בטעינה");
        const j = await r.json();
        if (!cancelled) setEntries(j.trail || []);
      } catch (e) {
        if (!cancelled) setError("שגיאה בטעינת יומן הביקורת");
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subscriptionId]);

  if (loading) {
    return (
      <div dir="rtl" className="text-white/50 p-4 text-[13px]">טוען היסטוריה...</div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="text-red-500 p-4 text-[13px]">{error}</div>
    );
  }

  if (entries.length === 0) {
    return (
      <div dir="rtl" className="text-white/50 p-4 text-[13px] text-center">אין עדיין היסטוריה</div>
    );
  }

  return (
    <div dir="rtl" className="bg-bg-dark-surface border border-white/10 rounded-card p-5">
      <div className="text-gold font-bold text-base mb-4">יומן ביקורת</div>
      <div className="relative pr-6">
        {/* Timeline line */}
        <div className="absolute top-0 bottom-0 right-2 w-0.5 bg-white/10" />

        {entries.map((e) => {
          const label = ACTION_LABELS[e.action] || e.action;
          const actor = ACTOR_LABELS[e.actorType] || e.actorType;
          return (
            <div key={e.id} className="relative pb-[18px]">
              {/* Timeline dot */}
              <div className={cn(
                "absolute -right-5 top-1 w-3 h-3 rounded-full bg-gold",
                "border-2 border-bg-dark-surface shadow-[0_0_0_2px_#C9A84C]"
              )} />
              <div className="text-white font-bold text-sm mb-0.5">{label}</div>
              <div className="text-white/50 text-xs mb-0.5">
                {actor}
                {e.actorName ? ` · ${e.actorName}` : ""}
                {" · "}
                {formatDate(e.createdAt)}
              </div>
              {(e.fromValue || e.toValue) && (
                <div className="text-white/40 text-xs mb-0.5">
                  {e.fromValue || "—"} ← {e.toValue || "—"}
                </div>
              )}
              {e.reason && (
                <div className="text-white/40 text-xs italic">סיבה: {e.reason}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
