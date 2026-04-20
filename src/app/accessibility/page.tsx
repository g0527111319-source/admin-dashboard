import Logo from "@/components/ui/Logo";

export const metadata = {
  title: "הצהרת נגישות | זירת האדריכלות",
  description: "הצהרת נגישות — זירת האדריכלות פועלת להנגשת האתר בהתאם לתקן הישראלי 5568",
};

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary" dir="rtl">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Logo size="sm" />
          <h1 className="text-2xl font-heading font-bold text-gold">
            הצהרת נגישות
          </h1>
        </div>

        <div className="card-glass space-y-6 text-sm leading-relaxed text-text-secondary">
          <p>
            זירת האדריכלות מחויבת לאפשר לכל אדם, כולל אנשים עם מוגבלויות,
            להשתמש באתר בצורה נוחה, שוויונית ומכובדת.
          </p>

          <h2 className="text-lg font-heading font-semibold text-text-primary">
            התאמות נגישות באתר
          </h2>
          <p>
            האתר עומד בדרישות תקנות שוויון זכויות לאנשים עם מוגבלות
            (התאמות נגישות לשירות), התשע&quot;ג-2013, ובהתאם לתקן הישראלי
            ת&quot;י 5568 המבוסס על הנחיות WCAG 2.0 ברמת AA.
          </p>

          <h2 className="text-lg font-heading font-semibold text-text-primary">
            כלי הנגישות באתר
          </h2>
          <ul className="list-disc pr-6 space-y-2">
            <li>הגדלה והקטנה של גודל הפונט (3 רמות: 100%, 120%, 140%)</li>
            <li>מצב ניגודיות גבוהה</li>
            <li>מצב גווני אפור</li>
            <li>הדגשת קישורים בקו תחתון</li>
            <li>החלפה לפונט קריא וברור</li>
            <li>איפוס כלל ההגדרות</li>
          </ul>
          <p>
            ניתן לגשת לכלי הנגישות דרך כפתור הנגישות (♿) הקבוע בפינה
            השמאלית-תחתונה של כל עמוד באתר.
          </p>

          <h2 className="text-lg font-heading font-semibold text-text-primary">
            פניות בנושא נגישות
          </h2>
          <p>
            אם נתקלת בבעיית נגישות באתר, או שיש לך הצעה לשיפור הנגישות,
            נשמח לשמוע ממך. ניתן לפנות אלינו בכל עת:
          </p>
          <ul className="list-disc pr-6 space-y-1">
            <li>
              דוא&quot;ל:{" "}
              <a href="mailto:z.adrichalut@gmail.com" className="text-gold hover:underline">
                z.adrichalut@gmail.com
              </a>
            </li>
          </ul>

          <h2 className="text-lg font-heading font-semibold text-text-primary">
            תאריך עדכון ההצהרה
          </h2>
          <p>הצהרה זו עודכנה לאחרונה בתאריך אפריל 2026.</p>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-gold text-sm hover:underline"
          >
            חזרה לעמוד הראשי
          </a>
        </div>
      </div>
    </div>
  );
}
