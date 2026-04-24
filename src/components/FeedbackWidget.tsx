"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bug, Lightbulb, X, Upload, Loader2, Check } from "lucide-react";

type FeedbackType = "BUG" | "FEATURE";

export default function FeedbackWidget() {
  const [openType, setOpenType] = useState<FeedbackType | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenType("BUG")}
        className="relative p-2 rounded-xl hover:bg-bg-surface-2 transition-colors text-text-muted hover:text-red-500"
        aria-label="דיווח על תקלה"
        title="דיווח על תקלה"
      >
        <Bug className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={() => setOpenType("FEATURE")}
        className="relative p-2 rounded-xl hover:bg-bg-surface-2 transition-colors text-text-muted hover:text-gold"
        aria-label="הצעה לשיפור"
        title="הצעה לשיפור"
      >
        <Lightbulb className="w-5 h-5" />
      </button>

      {openType && (
        <FeedbackModal
          type={openType}
          onClose={() => setOpenType(null)}
        />
      )}
    </>
  );
}

function FeedbackModal({ type, onClose }: { type: FeedbackType; onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const label = type === "BUG" ? "דיווח על תקלה" : "הצעה לשיפור";
  const placeholderMsg =
    type === "BUG"
      ? "תארי את התקלה — מה קרה, איפה, ומה את מצפה שיקרה?"
      : "תארי את ההצעה — מה לשפר, היכן, ולמה זה יועיל?";

  const onPickImage = (file: File | null) => {
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const submit = async () => {
    setError(null);
    const trimmed = message.trim();
    if (!trimmed || trimmed.length < 3) {
      setError("יש להזין תיאור");
      return;
    }
    setSubmitting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        fd.append("folder", "feedback");
        fd.append("category", "any");
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (!up.ok) {
          const j = await up.json().catch(() => ({}));
          throw new Error(j.error || "כשל בהעלאת התמונה");
        }
        const data = await up.json();
        imageUrl = data.url as string;
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          subject: subject.trim() || undefined,
          message: trimmed,
          imageUrl: imageUrl || undefined,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "כשל בשליחה");
      }
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשליחה");
    } finally {
      setSubmitting(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-[10001] bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      dir="rtl"
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 bg-bg-card border border-border-subtle shadow-2xl w-[calc(100%-1rem)] sm:w-full sm:max-w-lg flex flex-col rounded-2xl"
        style={{
          top: "max(0.5rem, env(safe-area-inset-top))",
          maxHeight: "calc(100dvh - max(1rem, env(safe-area-inset-top)) - max(1rem, env(safe-area-inset-bottom)))",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle bg-bg-card flex-shrink-0">
          <h2 className="font-heading font-bold text-text-primary flex items-center gap-2">
            {type === "BUG" ? <Bug className="w-5 h-5 text-red-500" /> : <Lightbulb className="w-5 h-5 text-gold" />}
            {label}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg hover:bg-bg-surface-2 text-text-muted disabled:opacity-50"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="inline-flex w-14 h-14 rounded-full bg-green-500/10 text-green-500 items-center justify-center mb-3">
              <Check className="w-7 h-7" />
            </div>
            <div className="font-semibold text-text-primary">תודה! הדיווח נשלח</div>
            <div className="text-sm text-text-muted mt-1">נחזור אלייך בהקדם</div>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  נושא (אופציונלי)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={120}
                  placeholder={type === "BUG" ? "לדוגמה: כפתור שמירה לא עובד" : "לדוגמה: להוסיף סינון לפי תאריך"}
                  className="w-full px-3 py-2 rounded-lg bg-bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  תיאור <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder={placeholderMsg}
                  className="w-full px-3 py-2 rounded-lg bg-bg-surface-2 border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-gold/40 resize-y min-h-[110px]"
                />
                <div className="text-[11px] text-text-muted mt-1 text-left">
                  {message.length} / 5000
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  תמונה {type === "FEATURE" ? "(מומלץ — מיקום השינוי)" : "(אופציונלי)"}
                </label>
                {imagePreview ? (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="תצוגה מקדימה"
                      className="max-h-32 rounded-lg border border-border-subtle"
                    />
                    <button
                      type="button"
                      onClick={() => onPickImage(null)}
                      className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                      aria-label="הסרת תמונה"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-surface-2 hover:bg-bg-surface-3 border border-dashed border-border-subtle text-text-muted hover:text-text-primary transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">בחרי תמונה</span>
                  </button>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    onPickImage(f);
                    e.target.value = "";
                  }}
                />
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle bg-bg-card flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface-2 disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-gold hover:bg-gold-dark text-black font-semibold disabled:opacity-60 inline-flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                שליחה
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
