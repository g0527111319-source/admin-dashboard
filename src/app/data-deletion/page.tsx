"use client";

import { useState } from "react";
import { GoldText } from "@/components/ds";

export default function DataDeletionPage() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !confirm) return;
    setSubmitting(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/data-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "שגיאה בשליחת הבקשה");
      }
      setStatus("success");
      setEmail("");
      setReason("");
      setConfirm(false);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "שגיאה לא ידועה");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen bg-bg-primary py-16 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-heading text-text-primary">בקשה <GoldText>למחיקת נתונים</GoldText></h1>
          <p className="text-text-muted text-sm mt-2">Data Deletion Request — Zirat Architecture</p>
        </div>

        <section className="space-y-3">
          <p className="text-text-secondary leading-relaxed">
            בהתאם למדיניות הפרטיות שלנו, באפשרותך לבקש בכל עת מחיקה מלאה של הנתונים האישיים שלך מהפלטפורמה, כולל:
          </p>
          <ul className="list-disc list-inside text-text-secondary space-y-1 leading-relaxed">
            <li>פרטי חשבון (שם, אימייל, טלפון, סיסמה מוצפנת)</li>
            <li>תוכן שיצרת (פרויקטים, לקוחות, חוזים, חתימות דיגיטליות, קבצים)</li>
            <li>אסימוני OAuth של Google (Google Calendar access/refresh tokens) ינותקו מיד וימחקו</li>
            <li>כל הרשומות המשויכות בבסיס הנתונים</li>
          </ul>
          <p className="text-text-secondary leading-relaxed">
            המחיקה תבוצע בתוך <strong>30 יום</strong> ממועד קבלת הבקשה. במהלך 30 הימים ניתן לבטל את הבקשה על ידי פנייה חוזרת באימייל.
          </p>
          <p className="text-text-secondary leading-relaxed text-sm">
            שים/י לב: לוגים של אבטחה נשמרים לכל היותר 90 יום לצרכי אבטחה וציות, ונמחקים אוטומטית. גיבויים של בסיס הנתונים נשמרים עד 30 יום ולאחר מכן נמחקים לצמיתות.
          </p>
        </section>

        {status === "success" ? (
          <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-6 space-y-2">
            <h2 className="text-lg font-heading text-green-400">הבקשה התקבלה</h2>
            <p className="text-text-secondary">
              בקשת המחיקה שלך התקבלה. אישור נשלח לכתובת האימייל שציינת, והצוות שלנו יפעל למחיקת הנתונים בתוך 30 יום.
            </p>
            <p className="text-text-muted text-sm">
              לשאלות, ניתן ליצור קשר ישיר ב-
              <a href="mailto:tamar@zirat.co.il" className="text-gold hover:underline">tamar@zirat.co.il</a>.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5 bg-bg-secondary border border-border-subtle rounded-lg p-6">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                כתובת האימייל של חשבונך <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                dir="ltr"
                className="w-full bg-bg-primary border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold"
              />
              <p className="text-text-muted text-xs mt-1">
                חובה להשתמש בכתובת שרשומה במערכת, אחרת לא נוכל לאמת את בעלותך על החשבון.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                סיבה (אופציונלי)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="אין חובה, אך נשמח לשמוע אם יש משהו ששנוכל לשפר"
                className="w-full bg-bg-primary border border-border-subtle rounded-lg px-4 py-2.5 text-text-primary focus:outline-none focus:border-gold resize-none"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
                className="mt-1 w-4 h-4 accent-gold"
              />
              <span className="text-sm text-text-secondary leading-relaxed">
                אני מאשר/ת שאני הבעלים של החשבון לעיל, ומבקש/ת למחוק את כל הנתונים המשויכים. אני מבין/ה שפעולה זו בלתי הפיכה לאחר 30 יום.
              </span>
            </label>

            {status === "error" && (
              <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-3 text-sm text-red-400">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !email || !confirm}
              className="btn-gold w-full"
            >
              {submitting ? "שולח..." : "שלח בקשת מחיקה"}
            </button>
          </form>
        )}

        <section className="pt-6 border-t border-border-subtle">
          <h2 className="text-lg font-heading text-text-primary mb-3">חיבור Google Calendar</h2>
          <p className="text-text-secondary leading-relaxed">
            אם חיברת את חשבון Google שלך לאפליקציה, באפשרותך לנתק אותו מיד:
          </p>
          <ul className="list-disc list-inside text-text-secondary space-y-1 leading-relaxed mt-2">
            <li>מתוך האפליקציה: לוח ניהול → CRM → יומן → &quot;ניתוק&quot;. הטוקנים נמחקים מיידית.</li>
            <li>מצד Google:{" "}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
                https://myaccount.google.com/permissions
              </a>
            </li>
          </ul>
        </section>

        <section className="pt-6 border-t border-border-subtle text-text-muted text-sm">
          <p>
            לפרטים מלאים על איסוף, שימוש, אחסון ומחיקה של נתונים ראה את{" "}
            <a href="/privacy" className="text-gold hover:underline">מדיניות הפרטיות המלאה</a>.
          </p>
          <p className="mt-2">
            יצירת קשר ישיר: <a href="mailto:tamar@zirat.co.il" className="text-gold hover:underline">tamar@zirat.co.il</a>
          </p>
        </section>

        <hr className="border-border-subtle" />

        <section className="text-text-secondary leading-relaxed text-sm space-y-2" dir="ltr">
          <h2 className="text-base font-heading text-text-primary">Data Deletion (English)</h2>
          <p>
            Under our privacy policy, any user may request complete deletion of their personal data from Zirat Architecture.
            Fill in the form above with the email address registered to your account, or send a request to{" "}
            <a href="mailto:tamar@zirat.co.il" className="text-gold hover:underline">tamar@zirat.co.il</a>
            {" "}with the subject &quot;Delete my account&quot;.
            Deletion is completed within 30 days and includes all profile data, user-generated content, Google OAuth tokens,
            and related records. Security logs are retained for at most 90 days and then purged. Backups are retained for at
            most 30 days and then permanently purged.
          </p>
          <p>
            To revoke Google Calendar access immediately, use the &quot;Disconnect&quot; button inside the app&apos;s CRM
            calendar settings, or go to{" "}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
              https://myaccount.google.com/permissions
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
