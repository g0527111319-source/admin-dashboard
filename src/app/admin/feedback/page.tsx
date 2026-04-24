"use client";

import { useEffect, useState, useCallback } from "react";
import { Bug, Lightbulb, Loader2, ExternalLink, Trash2, Check, Mail, Monitor } from "lucide-react";

type FeedbackType = "BUG" | "FEATURE";
type FeedbackStatus = "NEW" | "READ" | "RESOLVED";

interface FeedbackItem {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  senderName: string | null;
  senderEmail: string | null;
  designerId: string | null;
  subject: string | null;
  message: string;
  imageUrl: string | null;
  pageUrl: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABEL: Record<FeedbackType, string> = {
  BUG: "תקלה",
  FEATURE: "הצעה",
};

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  NEW: "חדש",
  READ: "נקרא",
  RESOLVED: "טופל",
};

const STATUS_COLOR: Record<FeedbackStatus, string> = {
  NEW: "bg-red-500/10 text-red-500 border-red-500/20",
  READ: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  RESOLVED: "bg-green-500/10 text-green-500 border-green-500/20",
};

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"" | FeedbackType>("");
  const [statusFilter, setStatusFilter] = useState<"" | FeedbackStatus>("");
  const [preview, setPreview] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    try {
      const res = await fetch(`/api/admin/feedback?${params}`, { cache: "no-store" });
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: FeedbackStatus) => {
    await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
  };

  const remove = async (id: string) => {
    if (!confirm("למחוק את הדיווח?")) return;
    await fetch(`/api/admin/feedback?id=${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const counts = {
    total: items.length,
    bug: items.filter((i) => i.type === "BUG").length,
    feature: items.filter((i) => i.type === "FEATURE").length,
    newCount: items.filter((i) => i.status === "NEW").length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary">
          דיווחי תקלות והצעות לשיפור
        </h1>
        <p className="text-sm text-text-muted mt-1">
          דיווחים שמשתמשות שלחו דרך כפתורי "דיווח תקלה" ו"הצעה לשיפור" בכותרת הדשבורד.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="סה״כ" value={counts.total} />
        <StatCard label="חדשים" value={counts.newCount} accent="red" />
        <StatCard label="תקלות" value={counts.bug} />
        <StatCard label="הצעות" value={counts.feature} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "" | FeedbackType)}
          className="px-3 py-2 rounded-lg bg-bg-surface-2 border border-border-subtle text-text-primary"
        >
          <option value="">כל הסוגים</option>
          <option value="BUG">תקלות</option>
          <option value="FEATURE">הצעות</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | FeedbackStatus)}
          className="px-3 py-2 rounded-lg bg-bg-surface-2 border border-border-subtle text-text-primary"
        >
          <option value="">כל הסטטוסים</option>
          <option value="NEW">חדשים</option>
          <option value="READ">נקראו</option>
          <option value="RESOLVED">טופלו</option>
        </select>
        <button
          type="button"
          onClick={load}
          className="px-3 py-2 rounded-lg bg-bg-surface-2 hover:bg-bg-surface-3 text-text-primary border border-border-subtle"
        >
          רענון
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 flex items-center justify-center text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin ml-2" /> טוען...
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-text-muted">אין דיווחים להצגה</div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <article
              key={it.id}
              className="rounded-xl border border-border-subtle bg-bg-card p-4 sm:p-5 shadow-sm"
            >
              <header className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                    it.type === "BUG"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-gold/10 text-gold"
                  }`}
                >
                  {it.type === "BUG" ? <Bug className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                  {TYPE_LABEL[it.type]}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLOR[it.status]}`}
                >
                  {STATUS_LABEL[it.status]}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(it.createdAt).toLocaleString("he-IL")}
                </span>
                <div className="ms-auto flex items-center gap-1">
                  {it.status !== "READ" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(it.id, "READ")}
                      className="p-1.5 rounded-lg hover:bg-bg-surface-2 text-text-muted hover:text-amber-500"
                      title="סמן כנקרא"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                  )}
                  {it.status !== "RESOLVED" && (
                    <button
                      type="button"
                      onClick={() => updateStatus(it.id, "RESOLVED")}
                      className="p-1.5 rounded-lg hover:bg-bg-surface-2 text-text-muted hover:text-green-500"
                      title="סמן כטופל"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(it.id)}
                    className="p-1.5 rounded-lg hover:bg-bg-surface-2 text-text-muted hover:text-red-500"
                    title="מחק"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </header>

              {it.subject && (
                <h3 className="font-semibold text-text-primary mb-1">{it.subject}</h3>
              )}

              <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed mb-3">
                {it.message}
              </div>

              {it.imageUrl && (
                <button
                  type="button"
                  onClick={() => setPreview(it.imageUrl)}
                  className="block mb-3"
                  title="לחצי להגדלה"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.imageUrl}
                    alt="צילום מצורף"
                    className="max-h-48 rounded-lg border border-border-subtle"
                  />
                </button>
              )}

              <footer className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                {(it.senderName || it.senderEmail) && (
                  <span>
                    מאת: <b>{it.senderName || "—"}</b>
                    {it.senderEmail && <> · {it.senderEmail}</>}
                  </span>
                )}
                {it.pageUrl && (
                  <a
                    href={it.pageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-gold"
                  >
                    <ExternalLink className="w-3 h-3" /> {it.pageUrl}
                  </a>
                )}
                {it.userAgent && (
                  <span className="inline-flex items-center gap-1" title={it.userAgent}>
                    <Monitor className="w-3 h-3" /> {shortUA(it.userAgent)}
                  </span>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: "red" }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-4">
      <div className="text-xs text-text-muted">{label}</div>
      <div
        className={`text-2xl font-bold ${accent === "red" ? "text-red-500" : "text-text-primary"}`}
      >
        {value}
      </div>
    </div>
  );
}

function shortUA(ua: string): string {
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua)) return "Safari";
  return "Browser";
}
