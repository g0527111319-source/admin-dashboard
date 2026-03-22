"use client";

import { useState, useEffect } from "react";
import { FileText, CheckCircle2, Loader2, ExternalLink } from "lucide-react";

export default function TermsConsentModal() {
  const [show, setShow] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if terms already accepted
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/designer/accept-terms");
        if (res.ok) {
          const data = await res.json();
          if (!data.accepted) {
            setShow(true);
          }
        }
      } catch {
        // If we can't check, don't block
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const res = await fetch("/api/designer/accept-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setShow(false);
      }
    } catch {
      // Retry on next load
    } finally {
      setAccepting(false);
    }
  };

  if (loading || !show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-border-subtle" dir="rtl">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-5">
          <FileText className="w-7 h-7 text-gold" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-heading text-text-primary text-center mb-2">
          תנאי שימוש
        </h2>
        <p className="text-text-muted text-center text-sm mb-6">
          על מנת להמשיך להשתמש במערכת, יש לאשר את תנאי השימוש
        </p>

        {/* Summary */}
        <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-3 text-sm text-text-secondary">
          <div className="flex gap-2">
            <span className="text-gold mt-0.5 flex-shrink-0">&#x2022;</span>
            <span>המידע נשמר במאגר מידע מאובטח. המערכת אינה מהווה שירות גיבוי.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gold mt-0.5 flex-shrink-0">&#x2022;</span>
            <span>השירות מסופק &quot;כפי שהוא&quot; ללא אחריות על זמינות או תקלות.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gold mt-0.5 flex-shrink-0">&#x2022;</span>
            <span>על המשתמש/ת לגבות נתונים באופן עצמאי.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gold mt-0.5 flex-shrink-0">&#x2022;</span>
            <span>המידע לא יימסר לצד שלישי ללא הסכמה.</span>
          </div>
        </div>

        {/* Link to full terms */}
        <div className="text-center mb-6">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-gold hover:text-amber-600 text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            קריאת תנאי השימוש המלאים
          </a>
        </div>

        {/* Accept button */}
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="btn-gold w-full flex items-center justify-center gap-2 py-3 text-base"
        >
          {accepting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle2 className="w-5 h-5" />
          )}
          {accepting ? "שומר..." : "אני מאשר/ת את תנאי השימוש"}
        </button>
      </div>
    </div>
  );
}
