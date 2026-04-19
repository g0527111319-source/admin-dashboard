import type { Metadata } from "next";
import Link from "next/link";
import { TwistButton, Eyebrow, GoldText } from "@/components/ds";

export const metadata: Metadata = {
  title: "קהילה למעצבות פנים: הביאו עוד לקוחות ותצמחו כמקצועיות",
  description:
    "את מעצבת פנים או אדריכלית? הצטרפי לזירת האדריכלות — קהילה של מאות מעצבות, הפניות הדדיות, ספקים מאומתים, אירועים וסדנאות, CRM מובנה ותיק עבודות דיגיטלי. צמיחה אמיתית.",
  keywords: [
    "קהילה למעצבות פנים",
    "מעצבות פנים עצמאיות",
    "עסק עיצוב פנים",
    "תמחור מעצבת פנים",
    "CRM למעצבת",
    "לקוחות למעצבת",
    "קורסים למעצבות",
    "אירועים לאדריכליות",
  ],
  alternates: { canonical: "/for-designers" },
  openGraph: {
    type: "website",
    url: "/for-designers",
    title: "קהילת מעצבות פנים מובילה בישראל",
    description: "הצטרפי וצמחי — הפניות, ספקים, CRM ואירועים במקום אחד.",
  },
};

const benefits = [
  { t: "הפניות הדדיות", d: "מעצבות חברות מעבירות אחת לשנייה לקוחות שלא מתאימים להן — צמיחה אורגנית ואיכותית." },
  { t: "ספקים מאומתים", d: "רשימה עדכנית של ספקים ובעלי מקצוע שנבדקו ע\"י הקהילה. עם מחירים ועדויות." },
  { t: "CRM מובנה", d: "ניהול לקוחות, פרויקטים, הצעות מחיר, חוזים וגבייה — הכול במערכת אחת." },
  { t: "תיק עבודות דיגיטלי", d: "עמוד אישי מקצועי שמופיע בחיפושי Google, עם גלריית פרויקטים ודירוגים." },
  { t: "אירועים מקצועיים", d: "מפגשי ערב, הרצאות מומחים, סיורים מעצוביים, שיתופי פעולה עם מותגים מובילים." },
  { t: "סדנאות ותוכן", d: "גישה לקורסים פנימיים על תמחור, ניהול פרויקטים, שיווק ורשתות חברתיות." },
];

export default function ForDesignersLandingPage() {
  return (
    <main className="min-h-screen bg-bg">
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <header className="mb-14 text-center">
          <Eyebrow className="mb-3 inline-block">למעצבות פנים</Eyebrow>
          <h1 className="font-heading text-4xl sm:text-5xl text-text-primary leading-tight">
            הקהילה המקצועית שמעצבת לך <GoldText>עסק מרוויח</GoldText>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-text-secondary">
            מעצבת פנים מוכשרת ששווקית לבד שורפת אנרגיה על דברים הלא-נכונים. בקהילה את חלק
            ממאות מעצבות שמחלקות לקוחות, ספקים, ידע ותוכנות — וצומחות ביחד.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <TwistButton href="/register" variant="primary" size="lg">
              הצטרפי לקהילה
            </TwistButton>
            <Link
              href="/blog/interior-designer-business-pricing"
              className="rounded-btn border border-border-subtle px-6 py-3 font-medium text-text-primary hover:border-gold transition"
            >
              מדריך תמחור
            </Link>
          </div>
        </header>

        <section className="mb-16 grid gap-6 sm:grid-cols-2">
          {benefits.map((b) => (
            <article
              key={b.t}
              className="rounded-card border border-border-subtle bg-bg-card p-6 shadow-card"
            >
              <h2 className="font-heading text-xl text-text-primary mb-2">{b.t}</h2>
              <p className="text-text-secondary">{b.d}</p>
            </article>
          ))}
        </section>

        <section className="rounded-card border border-gold/30 bg-gradient-to-br from-bg-card to-bg-surface p-10 text-center">
          <h2 className="font-heading text-3xl text-text-primary mb-3">
            חברות ממוצעת מדווחת על עלייה של 40% בהכנסה בשנה הראשונה
          </h2>
          <p className="text-text-secondary mb-8">
            בעיקר בזכות הפניות, שדרוג תמחור, וגישה לספקים במחירים של קהילה.
          </p>
          <TwistButton href="/register" variant="primary" size="lg">
            התחילי בחינם
          </TwistButton>
        </section>
      </section>
    </main>
  );
}
