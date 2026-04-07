"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  icon?: string | null;
  readAt?: string | null;
  createdAt: string;
};

type Props = {
  userId: string;
  userType?: "designer" | "admin";
};

const GOLD = "#C9A84C";
const DARK = "#0a0a0a";
const PANEL = "#141414";
const BORDER = "#2a2a2a";
const TEXT = "#e5e5e5";
const MUTED = "#888";

function timeAgoHe(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    const diff = Math.max(0, Date.now() - then);
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return "לפני כמה שניות";
    const min = Math.floor(sec / 60);
    if (min < 60) return `לפני ${min} דקות`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `לפני ${hr} שעות`;
    const days = Math.floor(hr / 24);
    if (days < 7) return `לפני ${days} ימים`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `לפני ${weeks} שבועות`;
    const months = Math.floor(days / 30);
    if (months < 12) return `לפני ${months} חודשים`;
    const years = Math.floor(days / 365);
    return `לפני ${years} שנים`;
  } catch {
    return "";
  }
}

export default function NotificationBell({ userId, userType = "designer" }: Props) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const r = await fetch(
        `/api/notifications/unread-count?userId=${encodeURIComponent(userId)}&userType=${userType}`,
        { cache: "no-store" }
      );
      if (!r.ok) return;
      const j = await r.json();
      setCount(j.count || 0);
    } catch {
      // silent
    }
  }, [userId, userType]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/notifications?userId=${encodeURIComponent(userId)}&userType=${userType}&limit=10`,
        { cache: "no-store" }
      );
      if (r.ok) {
        const j = await r.json();
        setItems(j.notifications || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [userId, userType]);

  useEffect(() => {
    fetchCount();
    const i = setInterval(fetchCount, 60000);
    return () => clearInterval(i);
  }, [fetchCount]);

  useEffect(() => {
    if (open) fetchList();
  }, [open, fetchList]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleMarkAll = async () => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, userType, all: true }),
      });
      setCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch {
      // silent
    }
  };

  const handleItemClick = async (n: Notification) => {
    try {
      if (!n.readAt) {
        await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: n.id, userId, userType }),
        });
        setCount((c) => Math.max(0, c - 1));
      }
      if (n.linkUrl) {
        window.location.href = n.linkUrl;
      }
    } catch {
      // silent
    }
  };

  return (
    <div ref={wrapperRef} dir="rtl" style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="התראות"
        style={{
          background: "transparent",
          border: `1px solid ${BORDER}`,
          color: TEXT,
          width: 40,
          height: 40,
          borderRadius: "50%",
          cursor: "pointer",
          fontSize: 18,
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span role="img" aria-label="bell">🔔</span>
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              background: "#e53935",
              color: "#fff",
              borderRadius: 999,
              fontSize: 10,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              border: `2px solid ${DARK}`,
            }}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 0,
            width: 360,
            maxHeight: 480,
            background: PANEL,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: `1px solid ${BORDER}`,
              color: GOLD,
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            התראות
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && (
              <div style={{ padding: 16, color: MUTED, fontSize: 13, textAlign: "center" }}>
                טוען...
              </div>
            )}
            {!loading && items.length === 0 && (
              <div style={{ padding: 24, color: MUTED, fontSize: 13, textAlign: "center" }}>
                אין התראות חדשות
              </div>
            )}
            {!loading &&
              items.map((n) => {
                const unread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${BORDER}`,
                      cursor: n.linkUrl ? "pointer" : "default",
                      borderRight: unread ? `3px solid ${GOLD}` : "3px solid transparent",
                      background: unread ? "rgba(201,168,76,0.05)" : "transparent",
                      display: "flex",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontSize: 20, lineHeight: "20px" }}>
                      {n.icon || "🔔"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: TEXT, fontWeight: 700, fontSize: 13, marginBottom: 2 }}>
                        {n.title}
                      </div>
                      <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.4, marginBottom: 4 }}>
                        {n.body}
                      </div>
                      <div style={{ color: "#666", fontSize: 11 }}>{timeAgoHe(n.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, padding: 8 }}>
            <button
              type="button"
              onClick={handleMarkAll}
              style={{
                width: "100%",
                background: "transparent",
                color: GOLD,
                border: `1px solid ${GOLD}`,
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              סמני הכל כנקרא
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
