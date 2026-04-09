"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";

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
    <div ref={wrapperRef} dir="rtl" className="relative inline-block">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="התראות"
        className={cn(
          "relative inline-flex items-center justify-center w-10 h-10 rounded-full",
          "bg-transparent border border-white/10 text-white/80",
          "transition-all duration-200 hover:bg-white/5 hover:border-gold/40 hover:text-gold",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg-dark"
        )}
      >
        <Bell className="w-[18px] h-[18px]" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full text-[10px] min-w-[16px] h-4 px-1 inline-flex items-center justify-center font-bold border-2 border-bg-dark">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className={cn(
          "absolute top-12 left-0 w-[360px] max-h-[480px]",
          "bg-bg-dark-surface border border-white/10 rounded-card",
          "shadow-[0_10px_30px_rgba(0,0,0,0.5)]",
          "z-[1000] flex flex-col overflow-hidden",
          "animate-[modalEnter_0.2s_cubic-bezier(0.16,1,0.3,1)]"
        )}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 text-gold font-bold text-sm">
            התראות
          </div>

          {/* Items */}
          <div className="overflow-y-auto flex-1">
            {loading && (
              <div className="p-4 text-white/40 text-[13px] text-center">טוען...</div>
            )}
            {!loading && items.length === 0 && (
              <div className="py-8 px-6 text-white/40 text-[13px] text-center">אין התראות חדשות</div>
            )}
            {!loading &&
              items.map((n) => {
                const unread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={cn(
                      "px-4 py-3 border-b border-white/10 flex gap-2.5",
                      "transition-colors duration-150",
                      n.linkUrl ? "cursor-pointer hover:bg-white/[0.03]" : "cursor-default",
                      unread
                        ? "border-r-[3px] border-r-gold bg-gold/[0.04]"
                        : "border-r-[3px] border-r-transparent"
                    )}
                  >
                    <div className="text-lg leading-5 flex-shrink-0 mt-0.5">{n.icon || "🔔"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold text-[13px] mb-0.5 truncate">{n.title}</div>
                      <div className="text-white/50 text-xs leading-relaxed mb-1 line-clamp-2">{n.body}</div>
                      <div className="text-white/30 text-[11px]">{timeAgoHe(n.createdAt)}</div>
                    </div>
                    {unread && (
                      <div className="flex-shrink-0 mt-1">
                        <Badge variant="glow" size="xs">חדש</Badge>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-2">
            <button
              type="button"
              onClick={handleMarkAll}
              className={cn(
                "w-full bg-transparent text-gold border border-gold/40",
                "px-3 py-2 rounded-btn text-xs font-semibold",
                "transition-all duration-200",
                "hover:bg-gold/5 hover:border-gold/60",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              )}
            >
              סמני הכל כנקרא
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
