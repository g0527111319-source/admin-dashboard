"use client";

/**
 * BatchPostScheduler — supplier-facing tool to queue multiple posts at once.
 *
 * Flow:
 *  1. Supplier adds N caption+image cards.
 *  2. Picks a start date + cadence + time-slot.
 *  3. We preview the resulting schedule (dates) and POST to
 *     /api/supplier/posts/batch-schedule. All posts are PENDING for admin
 *     approval.
 *
 * No uploads here — the supplier pastes image URLs they already uploaded.
 * This keeps the component simple and side-effect free; the real upload flow
 * stays in the single-post form.
 */

import { useMemo, useState } from "react";
import {
  CalendarPlus,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Clock,
} from "lucide-react";

type Cadence = "daily" | "weekdays" | "every-other-day" | "weekly";

interface Draft {
  caption: string;
  images: string; // comma-separated URLs
}

const TIME_SLOTS = ["10:30", "13:30", "20:30"];
const CADENCES: Array<{ key: Cadence; label: string }> = [
  { key: "daily", label: "כל יום" },
  { key: "weekdays", label: "א׳-ה׳ (דלוג על סופ״ש)" },
  { key: "every-other-day", label: "כל יומיים" },
  { key: "weekly", label: "שבועי" },
];

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function advanceDate(d: Date, c: Cadence): Date {
  const next = new Date(d);
  switch (c) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "every-other-day":
      next.setDate(next.getDate() + 2);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "weekdays":
      do {
        next.setDate(next.getDate() + 1);
      } while (next.getDay() === 5 || next.getDay() === 6);
      break;
  }
  return next;
}

export default function BatchPostScheduler({
  supplierId,
  onDone,
}: {
  supplierId: string;
  onDone?: (stats: { created: number }) => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>([
    { caption: "", images: "" },
  ]);
  const [startDate, setStartDate] = useState(todayISO());
  const [cadence, setCadence] = useState<Cadence>("weekdays");
  const [timeSlot, setTimeSlot] = useState("10:30");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const scheduled = useMemo(() => {
    let cursor = new Date(startDate);
    return drafts.map((d, i) => {
      const at = new Date(cursor);
      cursor = advanceDate(cursor, cadence);
      return { draft: d, date: at, idx: i };
    });
  }, [drafts, startDate, cadence]);

  const addRow = () =>
    setDrafts((prev) => [...prev, { caption: "", images: "" }]);

  const removeRow = (i: number) =>
    setDrafts((prev) => prev.filter((_, idx) => idx !== i));

  const updateRow = (i: number, patch: Partial<Draft>) =>
    setDrafts((prev) =>
      prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d))
    );

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const posts = drafts
        .filter((d) => d.caption.trim() || d.images.trim())
        .map((d) => ({
          caption: d.caption.trim() || undefined,
          images: d.images
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean),
        }));
      if (posts.length === 0) {
        setStatus("יש למלא לפחות פוסט אחד");
        setBusy(false);
        return;
      }

      const res = await fetch("/api/supplier/posts/batch-schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-supplier-id": supplierId,
        },
        body: JSON.stringify({
          supplierId,
          posts,
          startDate,
          cadence,
          timeSlot,
        }),
      });
      const j = await res.json();
      if (res.ok) {
        setStatus(`נוצרו ${j.created} פוסטים ממתינים לאישור`);
        onDone?.({ created: j.created });
      } else {
        setStatus(j.error || "שגיאה");
      }
    } catch {
      setStatus("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div>
        <h2 className="font-heading font-bold text-lg text-text-primary flex items-center gap-2">
          <CalendarPlus className="w-5 h-5 text-gold" />
          תזמון מרובה — פוסט לכל יום, בקליק אחד
        </h2>
        <p className="text-sm text-text-muted mt-1">
          הוסיפי כמה פוסטים שתרצי, ובחרי תאריך התחלה + קצב. המערכת תפזר אותם
          בלוח הזמנים שלך. כל הפוסטים עוברים לאישור הנהלה לפני פרסום.
        </p>
      </div>

      {/* Schedule controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-bg-surface-2/40 border border-border-subtle">
        <div>
          <label className="text-xs text-text-muted">תאריך התחלה</label>
          <input
            type="date"
            className="input-field w-full mt-1"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={todayISO()}
          />
        </div>
        <div>
          <label className="text-xs text-text-muted">קצב פרסום</label>
          <select
            className="input-field w-full mt-1"
            value={cadence}
            onChange={(e) => setCadence(e.target.value as Cadence)}
          >
            {CADENCES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-text-muted flex items-center gap-1">
            <Clock className="w-3 h-3" />
            שעת פרסום
          </label>
          <div className="flex gap-1 mt-1">
            {TIME_SLOTS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimeSlot(t)}
                className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                  timeSlot === t
                    ? "bg-gold text-white border-gold font-semibold"
                    : "border-border-subtle text-text-secondary hover:border-gold/40"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Draft rows */}
      <div className="space-y-3">
        {drafts.map((d, i) => (
          <div
            key={i}
            className="relative p-4 rounded-xl bg-bg-card border border-border-subtle"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text-muted">
                פוסט #{i + 1}{" "}
                <span className="text-gold">
                  ·{" "}
                  {scheduled[i]?.date
                    ? new Intl.DateTimeFormat("he-IL", {
                        weekday: "short",
                        day: "numeric",
                        month: "numeric",
                      }).format(scheduled[i].date)
                    : ""}{" "}
                  · {timeSlot}
                </span>
              </span>
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  aria-label="הסר"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <textarea
              placeholder="כיתוב לפוסט…"
              value={d.caption}
              onChange={(e) => updateRow(i, { caption: e.target.value })}
              rows={3}
              className="input-field w-full mb-2"
            />
            <input
              type="text"
              placeholder="כתובות תמונות — מופרדות בפסיק"
              value={d.images}
              onChange={(e) => updateRow(i, { images: e.target.value })}
              className="input-field w-full"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        disabled={drafts.length >= 30}
        className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-subtle text-text-muted hover:border-gold/40 hover:text-gold hover:bg-gold/5 transition-colors disabled:opacity-40"
      >
        <Plus className="w-4 h-4" />
        הוסף פוסט נוסף
        <span className="text-xs text-text-faint">({drafts.length}/30)</span>
      </button>

      {status && (
        <div
          className={`text-sm rounded-lg px-3 py-2 border ${
            status.includes("שגיאה")
              ? "text-red-600 bg-red-500/10 border-red-500/20"
              : "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
          }`}
        >
          {status}
        </div>
      )}

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="btn-gold flex items-center gap-2 !px-5 !py-3 !text-sm"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          שלחי לאישור
        </button>
      </div>
    </div>
  );
}
