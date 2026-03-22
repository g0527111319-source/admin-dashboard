import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "תנאי שימוש | זירת האדריכלות",
  description: "תנאי שימוש באתר זירת האדריכלות",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-heading text-text-primary mb-2">
            תנאי שימוש
          </h1>
          <p className="text-text-muted text-sm">
            עדכון אחרון: מרץ 2026
          </p>
        </div>

        <div className="bg-white border border-border-subtle rounded-card p-8 shadow-sm space-y-10 leading-relaxed text-text-secondary">

          {/* Section 1: Database */}
          <section>
            <h2 className="text-xl font-heading text-text-primary mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center text-sm font-bold">1</span>
              מאגר מידע
            </h2>
            <ul className="space-y-3 list-none">
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>המידע המוזן למערכת נשמר במאגר מידע מאובטח המנוהל על ידי זירת האדריכלות. אנו נוקטים באמצעי אבטחה סבירים לשמירה על המידע.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>המשתמש/ת אחראי/ת באופן בלעדי לנתונים שהוא/היא מזין/ה למערכת, לרבות פרטי לקוחות, פרטי פרויקטים, מסמכים ותמונות.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>
                  <strong className="text-text-primary">המערכת אינה מהווה שירות גיבוי.</strong> על המשתמש/ת לגבות באופן עצמאי ובאופן שוטף כל נתון חשוב. זירת האדריכלות אינה אחראית לאובדן מידע מכל סיבה שהיא.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>הנתונים שייכים למשתמש/ת ויימחקו לפי בקשה מפורשת. ניתן לפנות אלינו בכל עת לבקשת מחיקת מידע.</span>
              </li>
            </ul>
          </section>

          {/* Section 2: Usage */}
          <section>
            <h2 className="text-xl font-heading text-text-primary mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center text-sm font-bold">2</span>
              שימוש באתר
            </h2>
            <ul className="space-y-3 list-none">
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>
                  האתר והשירותים הנלווים מסופקים <strong className="text-text-primary">&quot;כפי שהם&quot; (AS IS)</strong> ללא כל מצג או התחייבות, מפורשת או משתמעת, לרבות התאמה למטרה מסוימת.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>בעלי האתר ומפעיליו אינם אחראים לכל נזק ישיר, עקיף, מקרי, תוצאתי או מיוחד הנובע מהשימוש באתר או מחוסר היכולת להשתמש בו.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>אין התחייבות לזמינות רציפה של המערכת. ייתכנו תקלות, הפסקות תחזוקה או שינויים בשירות ללא הודעה מוקדמת.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>זירת האדריכלות שומרת לעצמה את הזכות להפסיק את השירות או לשנות את תנאיו בכל עת, לפי שיקול דעתה הבלעדי.</span>
              </li>
            </ul>
          </section>

          {/* Section 3: Liability */}
          <section>
            <h2 className="text-xl font-heading text-text-primary mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center text-sm font-bold">3</span>
              הסרת אחריות
            </h2>
            <ul className="space-y-3 list-none">
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>בשימוש באתר, המשתמש/ת מוותר/ת על כל תביעה, דרישה או טענה כנגד בעלי האתר, מפעיליו ועובדיו בקשר לשימוש במערכת.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>אין אחריות על אובדן מידע, לרבות מחיקה בשוגג, כשל טכני, או כל סיבה אחרת.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>אין אחריות על שגיאות במערכת, חישובים שגויים, או כל תוצאה הנובעת מתפקוד לקוי של המערכת.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>
                  <strong className="text-text-primary">המשתמש/ת מסכים/ה לגבות נתונים באופן עצמאי</strong> ומוותר/ת על כל טענה בגין אובדן מידע שלא גובה.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 4: Privacy */}
          <section>
            <h2 className="text-xl font-heading text-text-primary mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-gold/10 text-gold flex items-center justify-center text-sm font-bold">4</span>
              פרטיות
            </h2>
            <ul className="space-y-3 list-none">
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>המידע האישי של המשתמש/ת לא יימסר לצד שלישי ללא הסכמה מפורשת, למעט כנדרש על פי דין.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>האתר עושה שימוש בקוקיז (Cookies) לצורכי תפעול, אבטחה ושיפור חוויית השימוש.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>לכל משתמש/ת הזכות לבקש מחיקת מידע אישי מהמערכת בכל עת. בקשת מחיקה תטופל תוך זמן סביר.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gold mt-1 flex-shrink-0">&#x2022;</span>
                <span>מידע אנונימי ומצרפי עשוי לשמש לצורכי שיפור השירות וניתוח סטטיסטי, ללא זיהוי אישי של המשתמש/ת.</span>
              </li>
            </ul>
          </section>

          {/* Footer note */}
          <div className="border-t border-border-subtle pt-6 text-sm text-text-muted text-center">
            <p>
              השימוש באתר מהווה הסכמה לכלל התנאים המפורטים לעיל.
            </p>
            <p className="mt-1">
              לשאלות ובירורים ניתן לפנות אלינו בכל עת.
            </p>
          </div>
        </div>

        {/* Back link */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-gold hover:text-amber-600 text-sm transition-colors"
          >
            חזרה לדף הבית
          </a>
        </div>
      </div>
    </div>
  );
}
