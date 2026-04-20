import { GoldText } from "@/components/ds";

export const metadata = { title: "תנאי שימוש | זירת האדריכלות" };

export default function TermsPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-bg-primary py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-heading text-text-primary">תנאי <GoldText>שימוש</GoldText></h1>
        <p className="text-text-muted text-sm">עדכון אחרון: אפריל 2026</p>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">1. כללי</h2>
          <p className="text-text-secondary leading-relaxed">
            ברוכים הבאים לזירת האדריכלות. השימוש בפלטפורמה כפוף לתנאים המפורטים להלן. עצם השימוש באתר מהווה הסכמה לתנאים אלה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">2. תיאור השירות</h2>
          <p className="text-text-secondary leading-relaxed">
            זירת האדריכלות היא פלטפורמה קהילתית המחברת מעצבי פנים וספקים בתחום העיצוב והאדריכלות. הפלטפורמה מציעה כלי ניהול, שיתוף פעולה ותקשורת בין חברי הקהילה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">3. הרשמה וחשבון</h2>
          <p className="text-text-secondary leading-relaxed">
            על מנת להשתמש בשירותים, עליך להירשם ולספק מידע מדויק ומעודכן. אתה אחראי לשמירה על סודיות פרטי הכניסה לחשבונך.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">4. שימוש מותר</h2>
          <p className="text-text-secondary leading-relaxed">
            השימוש בפלטפורמה מותר למטרות מקצועיות חוקיות בלבד. אין להשתמש בפלטפורמה לצרכים בלתי חוקיים, להטעיה, או לפגיעה במשתמשים אחרים.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">5. קניין רוחני</h2>
          <p className="text-text-secondary leading-relaxed">
            כל התוכן, העיצוב והקוד של הפלטפורמה שייכים לזירת האדריכלות. תוכן שמועלה על ידי משתמשים נשאר בבעלותם, אך הם מעניקים לפלטפורמה רישיון שימוש לצורך הפעלת השירות.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">6. הגבלת אחריות</h2>
          <p className="text-text-secondary leading-relaxed">
            הפלטפורמה מסופקת &quot;כמות שהיא&quot;. אנו לא אחראים לנזקים ישירים או עקיפים הנובעים מהשימוש בשירות.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">7. יצירת קשר</h2>
          <p className="text-text-secondary leading-relaxed">
            לשאלות בנוגע לתנאי השימוש, ניתן לפנות אלינו בכתובת:{" "}
            <a href="mailto:z.adrichalut@gmail.com" className="text-gold hover:underline">z.adrichalut@gmail.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}
