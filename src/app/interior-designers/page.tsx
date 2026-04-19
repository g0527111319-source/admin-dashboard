import type { Metadata } from "next";
import Link from "next/link";
import { TwistButton, Eyebrow, GoldText } from "@/components/ds";

export const metadata: Metadata = {
  title: "מעצבות פנים מומלצות בישראל | מאומתות עם דירוג אמיתי",
  description:
    "מחפשות מעצבת פנים מומלצת? זירת האדריכלות היא הקהילה הגדולה בישראל — כל המעצבות מאומתות, עם תיקי עבודות, דירוגי לקוחות אמיתיים ושקיפות מחירים. מצאו את המעצבת שמתאימה לכם.",
  keywords: [
    "מעצבת פנים",
    "מעצבות פנים מומלצות",
    "מעצבת פנים בישראל",
    "אדריכלית פנים",
    "אדריכלות פנים",
    "עיצוב פנים תל אביב",
    "עיצוב פנים חיפה",
    "עיצוב פנים ירושלים",
    "עיצוב פנים הרצליה",
    "עיצוב פנים רמת גן",
  ],
  alternates: { canonical: "/interior-designers" },
  openGraph: {
    type: "website",
    url: "/interior-designers",
    title: "מעצבות פנים מומלצות בישראל",
    description: "הקהילה הגדולה של מעצבות פנים מאומתות בישראל.",
  },
};

// .trim() defends against env vars saved with trailing \n.
const SITE_URL =
  (process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichalut.co.il").trim();

const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "מעצבות פנים מומלצות בישראל",
  url: `${SITE_URL}/interior-designers`,
  inLanguage: "he-IL",
  description:
    "קהילה מאומתת של מעצבות פנים ואדריכליות בישראל, עם דירוגי לקוחות ותיקי עבודות.",
  about: {
    "@type": "Service",
    serviceType: "Interior Design",
    areaServed: { "@type": "Country", name: "Israel" },
  },
};

const CITIES = [
  "תל אביב", "ירושלים", "חיפה", "הרצליה", "רמת גן", "גבעתיים",
  "רעננה", "כפר סבא", "ראשון לציון", "נתניה", "חולון", "אשדוד",
  "באר שבע", "פתח תקווה", "מודיעין", "רחובות", "הוד השרון",
];

const FAQ = [
  {
    q: "כמה עולה מעצבת פנים בישראל ב-2026?",
    a: "ייעוץ חד-פעמי: 800–2,500 ש\"ח. עיצוב דירה בלבד: 150–300 ש\"ח למ\"ר. עיצוב + ליווי מלא: 250–500 ש\"ח למ\"ר. אדריכלות פנים עם שינויים מבניים: 7%–12% מעלות הפרויקט.",
  },
  {
    q: "מה ההבדל בין מעצבת פנים לאדריכלית פנים?",
    a: "אדריכלית פנים בעלת תואר אקדמי של 4 שנים, מוסמכת לתכנון מלא כולל שינויים מבניים. מעצבת פנים לרוב בוגרת קורס מקצועי ומתמחה בעיצוב ללא שינויים מבניים.",
  },
  {
    q: "איך בודקים שמעצבת פנים אמינה?",
    a: "3 המלצות מלקוחות מהשנה האחרונה, תיק עבודות מלא של פרויקטים דומים, חוזה מפורט בכתב, ושקיפות מלאה של מחירים וחריגים.",
  },
  {
    q: "כמה זמן לוקח פרויקט של עיצוב דירה?",
    a: "דירה קטנה ללא שיפוץ מבני: 4–8 שבועות תכנון + 2–3 חודשי ביצוע. דירה עם שיפוץ מלא: 8–16 שבועות תכנון + 4–8 חודשי ביצוע.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function InteriorDesignersLandingPage() {
  return (
    <main className="min-h-screen bg-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <header className="mb-12 text-center">
          <Eyebrow className="mb-3 inline-block">מעצבות פנים מומלצות</Eyebrow>
          <h1 className="font-heading text-4xl sm:text-5xl text-text-primary">
            מעצבות פנים <GoldText>מומלצות</GoldText> בישראל — מאומתות, עם דירוג אמיתי
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-text-secondary">
            הקהילה הגדולה בישראל של מעצבות פנים ואדריכליות. כל המעצבות בפלטפורמה נבדקו,
            עם תיקי עבודות מעודכנים ודירוגי לקוחות אמיתיים. ללא פרסומות וללא תשלום על "מקומות ראשונים" —
            רק מקצועניות אמיתיות.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <TwistButton href="/" variant="primary" size="md">
              גלו את הקהילה
            </TwistButton>
            <TwistButton href="/blog/how-to-choose-interior-designer" variant="secondary" size="md">
              איך לבחור מעצבת
            </TwistButton>
          </div>
        </header>

        <section className="mb-16">
          <h2 className="font-heading text-2xl text-text-primary mb-6">
            מעצבות פנים לפי אזור
          </h2>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((city) => (
              <span
                key={city}
                className="rounded-full border border-border-subtle bg-bg-card px-4 py-2 text-sm text-text-secondary"
              >
                עיצוב פנים {city}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-text-muted">
            מחפשות מעצבת באזור ספציפי? סננו לפי מיקום בתוך הפלטפורמה.
          </p>
        </section>

        <section className="mb-16">
          <h2 className="font-heading text-2xl text-text-primary mb-6">
            למה זירת האדריכלות?
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="rounded-card border border-border-subtle bg-bg-card p-6">
              <h3 className="font-heading text-lg text-text-primary mb-2">מאומתות מראש</h3>
              <p className="text-sm text-text-secondary">
                כל מעצבת שנרשמת עוברת בדיקת רישיון מקצועי, תיק עבודות וקבלות לקוחות.
              </p>
            </div>
            <div className="rounded-card border border-border-subtle bg-bg-card p-6">
              <h3 className="font-heading text-lg text-text-primary mb-2">דירוגים אמיתיים</h3>
              <p className="text-sm text-text-secondary">
                ביקורות אמיתיות מלקוחות אמיתיים, לא חוות-דעת בתשלום.
              </p>
            </div>
            <div className="rounded-card border border-border-subtle bg-bg-card p-6">
              <h3 className="font-heading text-lg text-text-primary mb-2">שקיפות מחירים</h3>
              <p className="text-sm text-text-secondary">
                טווחי מחיר גלויים — בלי הפתעות, בלי עמלות סמויות.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="font-heading text-2xl text-text-primary mb-6">
            שאלות נפוצות
          </h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="rounded-card border border-border-subtle bg-bg-card p-5"
              >
                <summary className="cursor-pointer font-medium text-text-primary">
                  {item.q}
                </summary>
                <p className="mt-3 text-sm text-text-secondary">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
