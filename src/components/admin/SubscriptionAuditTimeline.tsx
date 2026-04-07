"use client";

import { useEffect, useState } from "react";

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

const GOLD = "#C9A84C";
const PANEL = "#141414";
const BORDER = "#2a2a2a";
const TEXT = "#e5e5e5";
const MUTED = "#888";

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
      <div dir="rtl" style={{ color: MUTED, padding: 16, fontSize: 13 }}>
        טוען היסטוריה...
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" style={{ color: "#e53935", padding: 16, fontSize: 13 }}>
        {error}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div dir="rtl" style={{ color: MUTED, padding: 16, fontSize: 13, textAlign: "center" }}>
        אין עדיין היסטוריה
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div
        style={{
          color: GOLD,
          fontWeight: 700,
          fontSize: 16,
          marginBottom: 16,
        }}
      >
        יומן ביקורת
      </div>
      <div style={{ position: "relative", paddingRight: 24 }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 8,
            width: 2,
            background: BORDER,
          }}
        />
        {entries.map((e) => {
          const label = ACTION_LABELS[e.action] || e.action;
          const actor = ACTOR_LABELS[e.actorType] || e.actorType;
          return (
            <div
              key={e.id}
              style={{
                position: "relative",
                paddingBottom: 18,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  right: -20,
                  top: 4,
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: GOLD,
                  border: `2px solid ${PANEL}`,
                  boxShadow: `0 0 0 2px ${GOLD}`,
                }}
              />
              <div style={{ color: TEXT, fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                {label}
              </div>
              <div style={{ color: MUTED, fontSize: 12, marginBottom: 2 }}>
                {actor}
                {e.actorName ? ` · ${e.actorName}` : ""}
                {" · "}
                {formatDate(e.createdAt)}
              </div>
              {(e.fromValue || e.toValue) && (
                <div style={{ color: "#aaa", fontSize: 12, marginBottom: 2 }}>
                  {e.fromValue || "—"} ← {e.toValue || "—"}
                </div>
              )}
              {e.reason && (
                <div style={{ color: "#aaa", fontSize: 12, fontStyle: "italic" }}>
                  סיבה: {e.reason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
