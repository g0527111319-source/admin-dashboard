"use client";

/**
 * MeetingFollowUp — dialog/drawer used after a meeting ends.
 *
 * Usage: caller provides eventId; on mount we fetch a draft from
 *   /api/designer/crm/follow-up?eventId=...
 * The designer can:
 *   - edit the text directly
 *   - swap in one of the template suggestions
 *   - send via chat (persisted to project messages), email (copy),
 *     or whatsapp (opens wa.me with pre-filled body)
 *
 * The component is intentionally a thin orchestrator; formatting and
 * templates live on the server for consistency.
 */

import { useEffect, useState } from "react";
import {
  Sparkles,
  Send,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Phone,
  Loader2,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface Draft {
  draft: string;
  variables: Record<string, string>;
  suggestions: Array<{ key: string; label: string; body: string }>;
  event: {
    id: string;
    title: string;
    startAt: string;
    clientName: string | null;
    clientId: string | null;
    projectId: string | null;
  };
}

type Method = "chat" | "email" | "whatsapp";

export default function MeetingFollowUp({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose?: () => void;
}) {
  const [data, setData] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [method, setMethod] = useState<Method>("chat");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/designer/crm/follow-up?eventId=${encodeURIComponent(eventId)}`
        );
        if (!cancelled && res.ok) {
          const j = (await res.json()) as Draft;
          setData(j);
          setText(j.draft);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const applyTemplate = (body: string) => setText(body);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const send = async () => {
    if (!data) return;
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/designer/crm/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, message: text, method }),
      });
      const j = await res.json();
      if (res.ok) {
        setStatus(j.hint || "נשלח בהצלחה");
        if (method === "whatsapp") {
          // Open wa.me best-effort — client phone pulled from server when available
          const phone = j.phone || "";
          const urlPhone = String(phone).replace(/[^\d]/g, "");
          const waUrl = `https://wa.me/${urlPhone}?text=${encodeURIComponent(text)}`;
          window.open(waUrl, "_blank", "noopener");
        }
        if (method === "email") {
          await copy();
        }
      } else {
        setStatus(j.error || "שגיאה בשליחה");
      }
    } catch {
      setStatus("שגיאה ברשת");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl bg-bg-card border border-border-subtle rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.4)] overflow-hidden animate-[modalEnter_0.25s_cubic-bezier(0.16,1,0.3,1)] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-text-primary">
                סיכום פגישה ושליחה
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {data?.event.title}
                {data?.event.clientName ? ` · ${data.event.clientName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-surface-2 text-text-muted"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-40" />
            </div>
          ) : !data ? (
            <p className="text-sm text-text-muted">לא ניתן לטעון את הפגישה.</p>
          ) : (
            <>
              {/* Template suggestions */}
              <div className="flex items-center gap-2 flex-wrap">
                {data.suggestions.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => applyTemplate(s.body)}
                    className="px-3 py-1.5 text-xs rounded-full bg-bg-surface-2/60 hover:bg-gold/10 hover:text-gold border border-border-subtle transition-colors"
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => applyTemplate(data.draft)}
                  className="px-3 py-1.5 text-xs rounded-full bg-gold/10 text-gold border border-gold/30 hover:bg-gold/15 transition-colors"
                >
                  טיוטה ברירת מחדל
                </button>
              </div>

              {/* Method picker */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-surface-2/50 border border-border-subtle w-fit">
                {(
                  [
                    { key: "chat", label: "צ'אט", Icon: MessageCircle },
                    { key: "email", label: "מייל", Icon: Mail },
                    { key: "whatsapp", label: "WhatsApp", Icon: Phone },
                  ] as const
                ).map(({ key, label, Icon }) => {
                  const active = method === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethod(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        active
                          ? "bg-gold text-white font-semibold"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Textarea */}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                className="input-field w-full resize-y font-normal leading-relaxed"
                dir="rtl"
              />

              {status && (
                <div className="text-sm text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                  {status}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border-subtle bg-bg-surface-2/30">
          <button
            type="button"
            onClick={copy}
            disabled={!text}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-border-subtle hover:bg-bg-surface-2 transition-colors disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" /> הועתק
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" /> העתק
              </>
            )}
          </button>
          <button
            type="button"
            onClick={send}
            disabled={sending || !text || !data}
            className="btn-gold flex items-center gap-1.5 !px-4 !py-2 !text-sm"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {method === "chat"
              ? "שלחי לצ'אט"
              : method === "email"
                ? "העתק למייל"
                : "פתחי ב-WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
}
