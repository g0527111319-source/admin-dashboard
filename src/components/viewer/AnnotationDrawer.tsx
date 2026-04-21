"use client";

// ==========================================
// AnnotationDrawer — right-side panel for the active pin's thread
// ==========================================
// Shows: the original question, all comments in order, a reply input,
// and (for designers) status-change buttons. Polls via SWR in the
// parent — this component is presentational.

import { useState } from "react";

export type Comment = {
  id: string;
  body: string;
  authorType: "client" | "designer";
  authorName: string;
  createdAt: string;
};

export type AnnotationThread = {
  id: string;
  label?: string | null;
  question?: string | null;
  status: "OPEN" | "ANSWERED" | "RESOLVED" | "PINNED";
  createdByType: "client" | "designer";
  createdAt: string;
  expiresAt: string;
  comments: Comment[];
};

type Props = {
  annotation: AnnotationThread | null;
  viewerRole: "client" | "designer";
  onClose: () => void;
  onReply: (body: string) => Promise<void>;
  onStatusChange?: (status: AnnotationThread["status"]) => Promise<void>;
  onDelete?: () => Promise<void>;
  clientName?: string;
  onClientNameChange?: (name: string) => void;
};

const STATUS_LABELS: Record<AnnotationThread["status"], string> = {
  OPEN: "פתוח",
  ANSWERED: "נענה",
  RESOLVED: "נפתר",
  PINNED: "חשוב 📌",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeLeftBadge(expiresAt: string, status: AnnotationThread["status"]): string | null {
  if (status === "PINNED") return "קבוע";
  if (status === "RESOLVED") return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "פג";
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours >= 1) return `נמחק בעוד ${hours} שעות`;
  const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
  return `נמחק בעוד ${mins} דקות`;
}

export default function AnnotationDrawer({
  annotation,
  viewerRole,
  onClose,
  onReply,
  onStatusChange,
  onDelete,
  clientName,
  onClientNameChange,
}: Props) {
  const [replyBody, setReplyBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!annotation) return null;

  async function handleSend() {
    const body = replyBody.trim();
    if (!body) return;
    if (viewerRole === "client" && !clientName?.trim()) {
      setError("נא להזין שם לפני שליחה");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onReply(body);
      setReplyBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשליחה");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(s: AnnotationThread["status"]) {
    if (!onStatusChange) return;
    setBusy(true);
    try {
      await onStatusChange(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשינוי");
    } finally {
      setBusy(false);
    }
  }

  const timeBadge = timeLeftBadge(annotation.expiresAt, annotation.status);

  return (
    <aside
      dir="rtl"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: "min(420px, 90vw)",
        background: "#FAFAF8",
        borderLeft: "1px solid #E5E1D4",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Heebo, system-ui, sans-serif",
        color: "#1A1A1A",
        zIndex: 30,
      }}
    >
      {/* Header */}
      <header style={{ padding: "16px 20px", borderBottom: "1px solid #E5E1D4" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3
            style={{
              fontFamily: "'Frank Ruhl Libre', serif",
              fontSize: 20,
              fontWeight: 500,
              margin: 0,
              color: "#8B6914",
            }}
          >
            {annotation.label || "הערה"}
          </h3>
          <button
            onClick={onClose}
            aria-label="סגור"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 24,
              cursor: "pointer",
              color: "#8B6914",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 6,
            fontSize: 12,
            fontFamily: "Rubik, sans-serif",
            color: "#8B6914",
          }}
        >
          <span
            style={{
              padding: "2px 8px",
              background: annotation.status === "PINNED" ? "#1A1A1A" : "#F5F1E8",
              color: annotation.status === "PINNED" ? "#FAFAF8" : "#8B6914",
              borderRadius: 10,
            }}
          >
            {STATUS_LABELS[annotation.status]}
          </span>
          {timeBadge && <span>⏱ {timeBadge}</span>}
        </div>
      </header>

      {/* Thread */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {annotation.question && (
          <div
            style={{
              background: "#F5F1E8",
              borderRight: "3px solid #C9A84C",
              padding: "12px 14px",
              borderRadius: 4,
              marginBottom: 16,
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            {annotation.question}
            <div
              style={{
                fontSize: 11,
                color: "#8B6914",
                marginTop: 6,
                fontFamily: "Rubik, sans-serif",
              }}
            >
              {formatTime(annotation.createdAt)}
            </div>
          </div>
        )}

        {annotation.comments.map((c) => {
          const mine =
            (viewerRole === "designer" && c.authorType === "designer") ||
            (viewerRole === "client" && c.authorType === "client");
          return (
            <div
              key={c.id}
              style={{
                display: "flex",
                justifyContent: mine ? "flex-start" : "flex-end",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  background: c.authorType === "designer" ? "#1A1A1A" : "#FFFFFF",
                  color: c.authorType === "designer" ? "#FAFAF8" : "#1A1A1A",
                  border: c.authorType === "designer" ? "none" : "1px solid #E5E1D4",
                  padding: "10px 14px",
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                <div
                  style={{
                    fontFamily: "Rubik, sans-serif",
                    fontSize: 11,
                    opacity: 0.8,
                    marginBottom: 4,
                  }}
                >
                  {c.authorName} · {formatTime(c.createdAt)}
                </div>
                {c.body}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      <div style={{ borderTop: "1px solid #E5E1D4", padding: 16, background: "#F5F1E8" }}>
        {viewerRole === "client" && onClientNameChange && (
          <input
            value={clientName || ""}
            onChange={(e) => onClientNameChange(e.target.value)}
            placeholder="השם שלך"
            maxLength={80}
            style={{
              width: "100%",
              padding: "8px 12px",
              marginBottom: 8,
              border: "1px solid #E5E1D4",
              borderRadius: 8,
              background: "#FAFAF8",
              fontFamily: "Heebo, sans-serif",
              fontSize: 14,
            }}
          />
        )}
        <textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder={viewerRole === "designer" ? "תגובת המעצבת..." : "תגובה..."}
          maxLength={1000}
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #E5E1D4",
            borderRadius: 8,
            background: "#FAFAF8",
            fontFamily: "Heebo, sans-serif",
            fontSize: 14,
            resize: "vertical",
          }}
        />
        {error && (
          <div style={{ color: "#B00020", fontSize: 13, marginTop: 6 }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button
            onClick={handleSend}
            disabled={busy || !replyBody.trim()}
            style={{
              padding: "8px 18px",
              background: "#C9A84C",
              color: "#1A1A1A",
              border: "none",
              borderRadius: 8,
              fontFamily: "Rubik, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              cursor: busy || !replyBody.trim() ? "not-allowed" : "pointer",
              opacity: busy || !replyBody.trim() ? 0.5 : 1,
            }}
          >
            {busy ? "שולח..." : "שלח"}
          </button>

          {viewerRole === "designer" && onStatusChange && (
            <>
              <button
                onClick={() => handleStatus("RESOLVED")}
                disabled={busy || annotation.status === "RESOLVED"}
                style={{
                  padding: "8px 14px",
                  background: "#B8D4B8",
                  border: "1px solid #6B8E6B",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                סמן נפתר
              </button>
              <button
                onClick={() => handleStatus(annotation.status === "PINNED" ? "OPEN" : "PINNED")}
                disabled={busy}
                style={{
                  padding: "8px 14px",
                  background: annotation.status === "PINNED" ? "#1A1A1A" : "transparent",
                  color: annotation.status === "PINNED" ? "#FAFAF8" : "#1A1A1A",
                  border: "1px solid #1A1A1A",
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {annotation.status === "PINNED" ? "ביטול קיבוע" : "📌 שמור"}
              </button>
              {onDelete && (
                <button
                  onClick={onDelete}
                  disabled={busy}
                  style={{
                    padding: "8px 14px",
                    background: "transparent",
                    border: "1px solid #B00020",
                    color: "#B00020",
                    borderRadius: 8,
                    fontSize: 13,
                    cursor: "pointer",
                    marginInlineStart: "auto",
                  }}
                >
                  מחק
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
