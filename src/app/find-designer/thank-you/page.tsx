import type { Metadata } from "next";
import { TwistButton, GoldText } from "@/components/ds";

export const metadata: Metadata = {
  title: "קיבלנו את הבקשה שלך — זירת האדריכלות",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-6 py-16">
      <div className="max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl text-text-primary">קיבלנו את <GoldText>הבקשה שלך</GoldText> 🎉</h1>
        <p className="mt-5 text-text-secondary text-lg leading-relaxed">
          מנהלת הקהילה תעבור על הפרטים ותפנה את הבקשה שלך למעצבות המתאימות ביותר תוך
          <strong> 48 שעות</strong>. שלחנו לך מייל אישור — בדקי גם בתיבת הספאם.
        </p>
        <p className="mt-4 text-text-secondary text-lg leading-relaxed">
          עד 3 מעצבות ייצרו איתך קשר ישירות. בחרי את מי שהכי מתאימה לסגנון ולתקציב שלך.
        </p>
        <div className="mt-10">
          <TwistButton href="/" variant="secondary" size="md">
            חזרה לדף הבית
          </TwistButton>
        </div>
      </div>
    </main>
  );
}
