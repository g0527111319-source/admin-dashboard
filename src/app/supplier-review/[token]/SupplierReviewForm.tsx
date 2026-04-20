"use client";

import { useState } from "react";

type Consent = "ANONYMOUS" | "FULL" | "DECLINED";

export default function SupplierReviewForm({ token, supplierName }: { token: string; supplierName: string }) {
  const [text, setText] = useState("");
  const [consent, setConsent] = useState<Consent | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!text.trim()) {
      setError("נשמח לכמה מילים בביקורת לפני השליחה.");
      return;
    }
    if (!consent) {
      setError("אנא בחרי אחת משלוש האפשרויות לפני השליחה.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/supplier/reviews/token/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeTextComment: text.trim(),
          publishConsent: consent,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "שגיאה בשליחה");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">תודה רבה!</h2>
        <p className="text-gray-600">הביקורת שלך נשמרה. {supplierName} מודה לך על הזמן.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white/80 backdrop-blur rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
      <div>
        <label htmlFor="review" className="block text-sm font-semibold text-gray-800 mb-2">
          כמה מילים על החוויה מהעבודה המשותפת
        </label>
        <textarea
          id="review"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={`שתפי איך הייתה העבודה עם ${supplierName}...`}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8860B]/40 focus:border-[#B8860B] resize-y"
          required
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-gray-800 mb-2">פרסום הביקורת</legend>

        <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${consent === "FULL" ? "border-[#B8860B] bg-[#faf5e8]" : "border-gray-200 hover:border-gray-300"}`}>
          <input
            type="radio"
            name="consent"
            value="FULL"
            checked={consent === "FULL"}
            onChange={() => setConsent("FULL")}
            className="mt-1 accent-[#B8860B]"
          />
          <span className="text-sm text-gray-800">
            <strong>מאשרת לפרסם כולל שם מלא ופלאפון</strong>
            <span className="block text-xs text-gray-500 mt-0.5">
              הביקורת תופיע בכרטיס הביקור של {supplierName} עם פרטי הקשר שלי.
            </span>
          </span>
        </label>

        <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${consent === "ANONYMOUS" ? "border-[#B8860B] bg-[#faf5e8]" : "border-gray-200 hover:border-gray-300"}`}>
          <input
            type="radio"
            name="consent"
            value="ANONYMOUS"
            checked={consent === "ANONYMOUS"}
            onChange={() => setConsent("ANONYMOUS")}
            className="mt-1 accent-[#B8860B]"
          />
          <span className="text-sm text-gray-800">
            <strong>מאשרת לפרסם ללא פרטים מזהים</strong>
            <span className="block text-xs text-gray-500 mt-0.5">
              הביקורת תופיע ללא שם ופלאפון, רק הטקסט.
            </span>
          </span>
        </label>

        <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${consent === "DECLINED" ? "border-gray-400 bg-gray-50" : "border-gray-200 hover:border-gray-300"}`}>
          <input
            type="radio"
            name="consent"
            value="DECLINED"
            checked={consent === "DECLINED"}
            onChange={() => setConsent("DECLINED")}
            className="mt-1 accent-gray-500"
          />
          <span className="text-sm text-gray-800">
            <strong>לא מאשרת לפרסם</strong>
            <span className="block text-xs text-gray-500 mt-0.5">
              הביקורת תישאר רק בידי {supplierName} למטרות פנימיות.
            </span>
          </span>
        </label>
      </fieldset>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-gold w-full disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "שולח..." : "שליחת ביקורת"}
      </button>
    </form>
  );
}
