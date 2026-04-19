import type { Metadata } from "next";
import Link from "next/link";
import FindDesignerForm from "@/components/leads/FindDesignerForm";
import { Eyebrow, GoldText } from "@/components/ds";

export const metadata: Metadata = {
  title: "אני מחפש/ת מעצבת פנים — זירת האדריכלות",
  description:
    "לקוח פרטי? מלא/י טופס קצר וקבל/י עד 3 מעצבות פנים מומלצות מהקהילה שלנו — חינם, בלי מתווכים, תוך 48 שעות.",
  alternates: { canonical: "/find-designer" },
  openGraph: {
    type: "website",
    url: "/find-designer",
    title: "התאמה חינם למעצבת פנים מהקהילה",
    description: "עד 3 מעצבות מומלצות תוך 48 שעות. ללא עלות, ללא מתווכים.",
  },
};

export default function FindDesignerPage() {
  return (
    <main className="min-h-screen bg-bg">
      <section className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <header className="mb-10 text-center">
          <Eyebrow className="mb-3 inline-block">שירות התאמה חינם</Eyebrow>
          <h1 className="font-heading text-4xl sm:text-5xl text-text-primary leading-tight">
            מוצאים לך את <GoldText>המעצבת המתאימה</GoldText>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-text-secondary">
            מלא/י את הטופס הקצר, ומנהלת הקהילה תאתר עד 3 מעצבות מהקהילה שמתאימות לסגנון, לתקציב
            ולעיר שלך. הן ייצרו איתך קשר תוך 48 שעות. <strong>ללא עלות</strong>, ללא מתווכים,
            בלי פרסומות.
          </p>
        </header>

        <div className="rounded-card border border-border-subtle bg-bg-card p-6 sm:p-10 shadow-card">
          <FindDesignerForm />
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-3 text-center">
          <div className="rounded-card border border-border-subtle bg-bg-card p-5">
            <p className="font-heading text-2xl text-gold-dim">1</p>
            <p className="mt-1 text-sm text-text-secondary">ממלאים את הטופס בפחות מ-3 דקות</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-bg-card p-5">
            <p className="font-heading text-2xl text-gold-dim">2</p>
            <p className="mt-1 text-sm text-text-secondary">מנהלת הקהילה בוחרת 3 מעצבות שמתאימות</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-bg-card p-5">
            <p className="font-heading text-2xl text-gold-dim">3</p>
            <p className="mt-1 text-sm text-text-secondary">הן מתקשרות אליך תוך 48 שעות</p>
          </div>
        </section>

        <p className="mt-10 text-center text-sm text-text-muted">
          או אם את מעצבת פנים — <Link href="/register" className="text-gold-dim underline">הצטרפי לקהילה</Link>.
        </p>
      </section>
    </main>
  );
}
