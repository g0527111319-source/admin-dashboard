"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Options — mirrored from src/lib/leads.ts. Duplicated (not imported) to
// keep this file pure client-side without dragging the email/prisma lib in.
const TIMING_OPTIONS = [
  { value: "immediate", label: "מיידי — הכי מוקדם שאפשר" },
  { value: "1-3months", label: "תוך 1-3 חודשים" },
  { value: "research", label: "עדיין בשלב מחקר ראשוני" },
];

const STYLE_OPTIONS = [
  { value: "modern", label: "מודרני" },
  { value: "classic", label: "קלאסי" },
  { value: "scandi", label: "סקנדינבי" },
  { value: "industrial", label: "תעשייתי" },
  { value: "unsure", label: "עדיין לא בטוח/ה" },
];

const inputCls =
  "mt-1 w-full rounded-lg border border-border-subtle bg-white px-3 py-2.5 text-text-primary placeholder:text-text-muted focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/25 transition";

const labelCls = "block text-sm font-medium text-text-secondary";

export default function FindDesignerForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      firstName: fd.get("firstName"),
      lastName: fd.get("lastName"),
      phone: fd.get("phone"),
      email: fd.get("email"),
      city: fd.get("city"),
      address: fd.get("address"),
      sizeSqm: fd.get("sizeSqm"),
      scope: fd.get("scope"),
      renovationBudget: fd.get("renovationBudget"),
      designerBudget: fd.get("designerBudget"),
      startTiming: fd.get("startTiming"),
      stylePreference: fd.get("stylePreference"),
      additionalNotes: fd.get("additionalNotes"),
      consent: fd.get("consent") === "on",
      website: fd.get("website"), // honeypot
    };

    try {
      const res = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "שגיאה בשליחה. נסי שוב.");
        setSubmitting(false);
        return;
      }
      router.push("/find-designer/thank-you");
    } catch {
      setError("שגיאת רשת. בדקי חיבור ונסי שוב.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-2" noValidate>
      {/* Honeypot — hidden from users, bots fill it */}
      <div className="hidden" aria-hidden="true">
        <label>
          אל תמלא/י
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label htmlFor="firstName" className={labelCls}>שם פרטי *</label>
        <input id="firstName" name="firstName" type="text" required minLength={2} className={inputCls} autoComplete="given-name" />
      </div>
      <div>
        <label htmlFor="lastName" className={labelCls}>שם משפחה *</label>
        <input id="lastName" name="lastName" type="text" required minLength={2} className={inputCls} autoComplete="family-name" />
      </div>

      <div>
        <label htmlFor="phone" className={labelCls}>טלפון *</label>
        <input id="phone" name="phone" type="tel" required className={inputCls} autoComplete="tel" placeholder="05X-XXXXXXX" />
      </div>
      <div>
        <label htmlFor="email" className={labelCls}>אימייל *</label>
        <input id="email" name="email" type="email" required className={inputCls} autoComplete="email" />
      </div>

      <div>
        <label htmlFor="city" className={labelCls}>עיר *</label>
        <input id="city" name="city" type="text" required className={inputCls} placeholder="תל אביב" />
      </div>
      <div>
        <label htmlFor="sizeSqm" className={labelCls}>גודל הנכס (מ״ר)</label>
        <input id="sizeSqm" name="sizeSqm" type="number" min={10} max={5000} className={inputCls} placeholder="90" />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="address" className={labelCls}>כתובת הנכס *</label>
        <input id="address" name="address" type="text" required className={inputCls} placeholder="רחוב, מספר, קומה, דירה" autoComplete="street-address" />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="scope" className={labelCls}>מה כולל השיפוץ? *</label>
        <textarea id="scope" name="scope" required minLength={5} rows={3} className={inputCls} placeholder="לדוגמה: שיפוץ מטבח + סלון, החלפת רצפה, חדרי אמבטיה…" />
      </div>

      <div>
        <label htmlFor="renovationBudget" className={labelCls}>תקציב לשיפוץ (₪)</label>
        <input id="renovationBudget" name="renovationBudget" type="text" inputMode="numeric" className={inputCls} placeholder="350,000" />
      </div>
      <div>
        <label htmlFor="designerBudget" className={labelCls}>תקציב למעצבת (₪)</label>
        <input id="designerBudget" name="designerBudget" type="text" inputMode="numeric" className={inputCls} placeholder="25,000" />
      </div>

      <div>
        <label htmlFor="startTiming" className={labelCls}>מתי תרצו להתחיל?</label>
        <select id="startTiming" name="startTiming" className={inputCls} defaultValue="">
          <option value="" disabled>בחרי</option>
          {TIMING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="stylePreference" className={labelCls}>סגנון מועדף</label>
        <select id="stylePreference" name="stylePreference" className={inputCls} defaultValue="">
          <option value="" disabled>בחרי</option>
          {STYLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="additionalNotes" className={labelCls}>
          דגש נוסף שחשוב לך להדגיש
        </label>
        <textarea
          id="additionalNotes"
          name="additionalNotes"
          rows={3}
          className={inputCls}
          placeholder="למשל: חיות מחמד, דרישות נגישות, זמינות בערב בלבד, העדפות ספציפיות…"
        />
      </div>

      <div className="sm:col-span-2 rounded-lg border border-border-subtle bg-bg-surface p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-gold" />
          <span className="text-sm text-text-secondary">
            אני מאשר/ת שהפרטים שלי יועברו עד 3 מעצבות פנים של הקהילה לטובת יצירת קשר בלבד, בהתאם
            ל<a href="/privacy" className="text-gold-dim underline" target="_blank">מדיניות הפרטיות</a>.
          </span>
        </label>
      </div>

      {error && (
        <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="sm:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-btn bg-gold px-10 py-3 text-base font-medium text-bg-dark hover:bg-gold-light disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {submitting ? "שולחת…" : "שליחה — מתחילים לחפש"}
        </button>
      </div>
    </form>
  );
}
