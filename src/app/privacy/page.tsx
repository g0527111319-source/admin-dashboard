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
            זירת האדריכלות (&quot;האתר&quot;, &quot;השירות&quot;, &quot;אנחנו&quot;) מפעילה פלטפורמה למעצבי פנים ואדריכלים, בכתובת
            <a href="https://zirat-design.vercel.app" className="text-gold hover:underline"> https://zirat-design.vercel.app</a>.
            מדיניות זו מפרטת אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם, כיצד אנו מאחסנים ומגנים עליהם, עם מי אנו חולקים אותם וכיצד ניתן לבקש למחוק אותם.
            מדיניות זו חלה על כל המשתמשים באתר ובמיוחד על משתמשים שמחברים את חשבון Google שלהם לשירות.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">2. מידע שאנו אוספים</h2>
          <ul className="list-disc list-inside text-text-secondary space-y-2 leading-relaxed">
            <li><strong>פרטי חשבון:</strong> שם מלא, כתובת אימייל, מספר טלפון, סיסמה מוצפנת (bcrypt).</li>
            <li><strong>פרטים מקצועיים:</strong> תחום עיסוק, אזור פעילות, שם עסק, ניסיון, תמונת פרופיל.</li>
            <li><strong>תוכן משתמש:</strong> פרויקטים, לקוחות, חוזים, חתימות דיגיטליות, מסמכים שהעלת, קבצי PDF, תמונות עיצוב ותוכן משובץ אחר.</li>
            <li><strong>נתוני שימוש:</strong> כתובת IP, user-agent, לוגים של פעולות מרכזיות (התחברות, חתימה על חוזה).</li>
            <li><strong>מידע מ-Google (אופציונלי, רק בהסכמתך):</strong> ראה סעיף 4 להלן.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">3. כיצד אנו משתמשים במידע</h2>
          <ul className="list-disc list-inside text-text-secondary space-y-2 leading-relaxed">
            <li>לספק ולתחזק את שירותי הפלטפורמה (ניהול פרויקטים, CRM, חוזים, יומן פגישות).</li>
            <li>לאמת את זהותך בעת התחברות.</li>
            <li>לשלוח הודעות תפעוליות (אישור חתימה על חוזה, תזכורות, חיבור חוזר).</li>
            <li>לשפר את הפלטפורמה ולאבחן תקלות באמצעות לוגים טכניים.</li>
            <li>לציית לדרישות חוק רלוונטיות.</li>
          </ul>
          <p className="text-text-secondary leading-relaxed">
            <strong>אנחנו לא משתמשים בנתוני משתמש, ובפרט לא בנתוני Google, לצורכי אימון מודלים של בינה מלאכותית, פרסום, פרופיילינג שיווקי, או כל שימוש שאיננו מתן השירות שהמשתמש ביקש.</strong>
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">4. שימוש ב-Google API ונתוני משתמש של Google</h2>
          <p className="text-text-secondary leading-relaxed">
            השימוש שלנו במידע המתקבל מ-Google APIs כפוף ל-
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Google API Services User Data Policy</a>,
            כולל דרישות <strong>Limited Use</strong>.
          </p>

          <h3 className="text-lg font-heading text-text-primary pt-2">4.1 הנתונים שאנו ניגשים אליהם (Data Accessed)</h3>
          <ul className="list-disc list-inside text-text-secondary space-y-2 leading-relaxed">
            <li>
              <strong>Scope: <code>openid email profile</code></strong> — משמש להתחברות (&quot;Sign in with Google&quot;). אנו מקבלים: מזהה Google ייחודי (sub), כתובת אימייל, שם מלא ותמונת פרופיל ציבורית.
            </li>
            <li>
              <strong>Scope: <code>https://www.googleapis.com/auth/calendar</code></strong> — משמש לסנכרון יומן, רק לאחר שהמשתמש לוחץ במפורש על &quot;חבר את Google Calendar&quot; בהגדרות ה-CRM. באמצעות scope זה אנו יכולים ליצור, לקרוא, לעדכן ולמחוק אירועים ביומן הראשי של המשתמש ב-Google Calendar.
            </li>
          </ul>

          <h3 className="text-lg font-heading text-text-primary pt-2">4.2 כיצד אנו משתמשים בנתוני Google (Data Usage)</h3>
          <ul className="list-disc list-inside text-text-secondary space-y-2 leading-relaxed">
            <li><strong>נתוני פרופיל (email/name/picture):</strong> יוצרים או מאתרים חשבון משתמש בפלטפורמה, ומציגים את שמך ותמונתך בממשק שלך בלבד.</li>
            <li><strong>Google Calendar:</strong> יוצרים ומעדכנים אירועי פגישות שהמעצב יצר בתוך ה-CRM של זירת האדריכלות, כך שיופיעו גם ב-Google Calendar האישי שלו. איננו קוראים אירועים שלא נוצרו על ידי השירות, ואיננו מנתחים את תוכן היומן מעבר לסנכרון האירועים שיצרת בפלטפורמה.</li>
            <li>הגישה היא לצורך הפעולה שהמשתמש ביקש בלבד, ואיננה משמשת לפרסום, מכירה, או אימון מודלים של AI.</li>
          </ul>

          <h3 className="text-lg font-heading text-text-primary pt-2">4.3 שיתוף נתוני Google עם צדדים שלישיים (Data Sharing)</h3>
          <p className="text-text-secondary leading-relaxed">
            <strong>איננו מוכרים, משכירים, או מעבירים נתוני Google של משתמשים לצדדים שלישיים.</strong> נתוני Google מועברים רק חזרה אל Google (לצורך יצירת אירוע ביומן המשתמש) ונשמרים אצל ספקי תשתית מוגדרים שאיתם יש לנו הסכמי עיבוד נתונים:
          </p>
          <ul className="list-disc list-inside text-text-secondary space-y-2 leading-relaxed">
            <li>Vercel (אירוח ונקודות קצה סרברלס) — עיבוד בזמן הרצה.</li>
            <li>ספק מסד נתונים (PostgreSQL מנוהל) — אחסון אסימוני גישה ורענון מוצפנים.</li>
            <li>Cloudflare R2 — אחסון מסמכים וקבצי PDF שהמשתמש העלה; לא משמש לאחסון נתוני Google.</li>
            <li>Resend — משמש לשליחת אימיילים תפעוליים; כתובת האימייל של המשתמש מועברת אליו רק לצורך שליחת ההודעה.</li>
          </ul>
          <p className="text-text-secondary leading-relaxed">
            שימוש שלנו בנתוני Google מוגבל ל-<strong>Limited Use</strong>: איננו מעבירים נתונים אלה לצדדים שלישיים מלבד הנדרש למתן השירות שהמשתמש ביקש, לציות לחוק, או לצרכי אבטחה.
          </p>

          <h3 className="text-lg font-heading text-text-primary pt-2">4.4 אחסון והגנה על נתונים (Data Storage &amp; Protection)</h3>
          <ul className="list-disc list-inside text-text-secondary space-y-2 leading-relaxed">
            <li>אסימוני OAuth (access token + refresh token) נשמרים בעמודה ייעודית בבסיס הנתונים, עם הצפנה בתעבורה (TLS 1.2+) ובמנוחה (הצפנה ברמת הדיסק של ספק ה-PostgreSQL).</li>
            <li>גישה לבסיס הנתונים מוגבלת למפתחת היחידה של האתר באמצעות אישורים ייחודיים.</li>
            <li>אנו משתמשים ב-HTTPS בלבד, הצפנת סיסמאות עם bcrypt, וכותרות אבטחה (HSTS, X-Frame-Options, CSP-relevant).</li>
            <li>פעולות רגישות (חתימה על חוזה, התחברות) נרשמות ביומן ביקורת עם חותמת זמן ו-IP.</li>
          </ul>

          <h3 className="text-lg font-heading text-text-primary pt-2">4.5 שמירת מידע ומחיקה (Data Retention &amp; Deletion)</h3>
          <ul className="list-disc list-inside text-text-secondary space-y-2 leading-relaxed">
            <li><strong>חשבון פעיל:</strong> נתוני הפרופיל והתוכן שיצרת נשמרים כל עוד החשבון שלך פעיל.</li>
            <li><strong>Google Calendar tokens:</strong> נמחקים אוטומטית ברגע שתלחץ על &quot;ניתוק&quot; במסך הגדרות ה-CRM, או תבטל את הגישה ב-
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Google Account permissions</a>.
            </li>
            <li><strong>בקשת מחיקה מלאה של החשבון:</strong> ניתן בכל עת דרך
              {" "}<a href="/data-deletion" className="text-gold hover:underline font-semibold">טופס מחיקת הנתונים הציבורי שלנו</a>
              {" "}או על ידי שליחת אימייל ל-
              <a href="mailto:tamar@zirat.co.il" className="text-gold hover:underline">tamar@zirat.co.il</a>
              {" "}עם הנושא &quot;Delete my account&quot;. המחיקה תבוצע בתוך 30 יום ותכלול את כל נתוני הפרופיל, התוכן, הטוקנים של Google, והרשומות המשויכות. לוגים של אבטחה ישמרו לכל היותר 90 יום לצרכי אבטחה וציות.
            </li>
            <li><strong>Backups:</strong> עותקי גיבוי של בסיס הנתונים נשמרים עד 30 יום ולאחר מכן נמחקים לצמיתות.</li>
          </ul>
          <div className="mt-4 p-4 bg-gold/5 border border-gold/30 rounded-lg">
            <p className="text-text-primary leading-relaxed">
              <strong>לנוחותך:</strong> טופס ציבורי למחיקת נתונים זמין בכל עת ב-
              {" "}<a href="/data-deletion" className="text-gold hover:underline font-semibold">/data-deletion</a>.
              אין צורך להיות מחובר/ת כדי להגיש בקשה.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">5. עוגיות (Cookies)</h2>
          <p className="text-text-secondary leading-relaxed">
            האתר משתמש בעוגיות הכרחיות לתפקוד (session, CSRF). איננו משתמשים בעוגיות פרסום, בעוגיות צד שלישי לצורך פרופיילינג, או ב-trackers שיווקיים.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">6. זכויות המשתמש</h2>
          <p className="text-text-secondary leading-relaxed">
            בכל עת באפשרותך לבקש: לעיין במידע שלנו עליך, לתקן מידע שגוי, לייצא את המידע, או למחוק את המידע באופן מלא. הפנייה בדוא&quot;ל אל
            <a href="mailto:tamar@zirat.co.il" className="text-gold hover:underline"> tamar@zirat.co.il</a>.
            אם חיברת את חשבון Google שלך, באפשרותך בכל עת לבטל את הגישה של זירת האדריכלות דרך
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline"> https://myaccount.google.com/permissions</a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">7. אבטחת מידע</h2>
          <p className="text-text-secondary leading-relaxed">
            אנו נוקטים אמצעי אבטחה מקובלים בתעשייה: הצפנה בתעבורה (TLS), הצפנה במנוחה ברמת ספק התשתית, הצפנת סיסמאות (bcrypt), בקרת גישה מבוססת-תפקיד, ותיעוד פעולות רגישות. במקרה של חשד לפריצה המשפיעה על נתוני משתמש, נודיע למשתמשים הרלוונטיים בהתאם לחוק.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">8. קטינים</h2>
          <p className="text-text-secondary leading-relaxed">
            השירות מיועד למשתמשים מעל גיל 18. אנו לא אוספים ביודעין מידע מקטינים.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">9. שינויים במדיניות</h2>
          <p className="text-text-secondary leading-relaxed">
            נעדכן מדיניות זו מעת לעת. תאריך העדכון האחרון מופיע בראש הדף. שינויים מהותיים ימסרו למשתמשים הרשומים באמצעות אימייל.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">10. יצירת קשר</h2>
          <p className="text-text-secondary leading-relaxed">
            אחראית הגנת הפרטיות: תמר. לכל שאלה בנושא פרטיות, אבטחה או מחיקת מידע:
            <a href="mailto:tamar@zirat.co.il" className="text-gold hover:underline"> tamar@zirat.co.il</a>.
          </p>
        </section>

        <hr className="border-border-subtle" />

        <section className="space-y-3">
          <h2 className="text-xl font-heading text-text-primary">Privacy Policy (English Summary for Google Verification)</h2>
          <p className="text-text-secondary leading-relaxed" dir="ltr">
            Zirat Architecture operates the platform at
            <a href="https://zirat-design.vercel.app" className="text-gold hover:underline"> https://zirat-design.vercel.app</a>.
          </p>
          <p className="text-text-secondary leading-relaxed" dir="ltr">
            <strong>Data Accessed from Google:</strong> We request the OAuth scopes <code>openid email profile</code> for sign-in (Google account ID, email, name, profile picture) and <code>https://www.googleapis.com/auth/calendar</code> (only when the user explicitly connects Google Calendar in the CRM settings) to create and update calendar events on the user&apos;s primary calendar.
          </p>
          <p className="text-text-secondary leading-relaxed" dir="ltr">
            <strong>Data Usage:</strong> Profile data is used to create/identify the user&apos;s account and render their display name/avatar in the UI. Calendar access is used only to push meeting events that the designer created inside our CRM to their Google Calendar. We do not read, analyze, or repurpose the user&apos;s Google Calendar content.
          </p>
          <p className="text-text-secondary leading-relaxed" dir="ltr">
            <strong>Data Sharing:</strong> We do not sell, rent, or transfer Google user data to any third party. Data is only transmitted back to Google APIs as required to perform the user-requested action. Subprocessors (Vercel, PostgreSQL provider, Cloudflare R2, Resend) handle infrastructure only and do not receive Google user data beyond what is necessary for the service to function.
          </p>
          <p className="text-text-secondary leading-relaxed" dir="ltr">
            <strong>Data Storage &amp; Protection:</strong> OAuth tokens are stored in our managed PostgreSQL database, encrypted in transit (TLS 1.2+) and at rest. Access is restricted to the site operator. We do not use Google user data for AI/ML model training, advertising, or marketing profiling.
          </p>
          <p className="text-text-secondary leading-relaxed" dir="ltr">
            <strong>Data Retention &amp; Deletion:</strong> Users can disconnect Google Calendar at any time from the CRM settings (which deletes the stored tokens immediately) or from
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline"> https://myaccount.google.com/permissions</a>.
            Full account deletion can be requested via our public
            {" "}<a href="/data-deletion" className="text-gold hover:underline font-semibold">Data Deletion form</a>
            {" "}or by emailing
            <a href="mailto:tamar@zirat.co.il" className="text-gold hover:underline"> tamar@zirat.co.il</a>
            {" "}with the subject &quot;Delete my account&quot;; deletion is completed within 30 days and includes all Google OAuth tokens, profile data, and user-generated content.
          </p>
          <p className="text-text-secondary leading-relaxed" dir="ltr">
            <strong>Limited Use:</strong> Our use of information received from Google APIs adheres to the
            <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline"> Google API Services User Data Policy</a>, including the Limited Use requirements.
          </p>
        </section>
      </div>
    </div>
  );
}
