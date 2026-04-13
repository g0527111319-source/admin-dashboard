export const metadata = { title: "מדיניות פרטיות | זירת האדריכלות" };

export default function PrivacyPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-bg-primary py-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-heading text-text-primary">מדיניות פרטיות</h1>
        <p className="text-text-muted text-sm">עדכון אחרון: אפריל 2026</p>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">1. כללי</h2>
          <p className="text-text-secondary leading-relaxed">
            זירת האדריכלות (&quot;האתר&quot;) מכבדת את פרטיות המשתמשים. מדיניות זו מפרטת כיצד אנו אוספים, משתמשים ומגנים על המידע האישי שלך.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">2. מידע שאנו אוספים</h2>
          <ul className="list-disc list-inside text-text-secondary space-y-2 leading-relaxed">
            <li>פרטי הרשמה: שם מלא, כתובת אימייל, מספר טלפון</li>
            <li>פרטים מקצועיים: תחום עיסוק, אזור פעילות, ניסיון</li>
            <li>נתוני שימוש: פעילות באתר, העדפות, אינטראקציות</li>
            <li>מידע מ-Google: במידה ואתה מתחבר דרך Google, אנו מקבלים את שמך, אימייל ותמונת הפרופיל. בעת חיבור ל-Google Calendar, אנו ניגשים ליומן שלך לצורך סנכרון אירועים בלבד.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">3. שימוש במידע</h2>
          <p className="text-text-secondary leading-relaxed">
            אנו משתמשים במידע שלך כדי לספק את שירותי הפלטפורמה, לשפר את חוויית המשתמש, לאפשר תקשורת בין מעצבים וספקים, ולנהל את חשבונך. לא נמכור או נשתף את המידע שלך עם צדדים שלישיים שלא לצורך מתן השירות.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">4. Google API</h2>
          <p className="text-text-secondary leading-relaxed">
            השימוש במידע המתקבל מ-Google APIs כפוף ל-
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Google API Services User Data Policy</a>,
            כולל דרישות השימוש המוגבל (Limited Use). אנו ניגשים ליומן Google שלך אך ורק לצורך סנכרון אירועים שיצרת בפלטפורמה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">5. אבטחת מידע</h2>
          <p className="text-text-secondary leading-relaxed">
            אנו נוקטים אמצעי אבטחה מתאימים כדי להגן על המידע שלך, כולל הצפנת נתונים, גישה מוגבלת ומעקב אחר פעילות חשודה.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">6. זכויות המשתמש</h2>
          <p className="text-text-secondary leading-relaxed">
            באפשרותך לבקש לעיין, לתקן או למחוק את המידע האישי שלך בכל עת על ידי פנייה אלינו בכתובת: tamar@zirat.co.il
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">7. יצירת קשר</h2>
          <p className="text-text-secondary leading-relaxed">
            לשאלות בנוגע למדיניות הפרטיות, ניתן לפנות אלינו בכתובת: tamar@zirat.co.il
          </p>
        </section>
      </div>
    </div>
  );
}
