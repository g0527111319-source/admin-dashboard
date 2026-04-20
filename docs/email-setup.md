# הגדרת שליחת מייל ללקוחות — מדריך שלב אחר שלב

**זמן כולל:** 15–30 דקות (רוב הזמן הוא המתנה להתפשטות DNS).
**דרוש:** גישה ל-Resend, ל-Vercel, ולפאנל ניהול DNS של הדומיין `ziratadrichalut.co.il`.

## הבעיה — למה רק ישראל גולדשמיד מקבל מיילים?

המערכת שולחת מיילים דרך [Resend](https://resend.com). כרגע הקוד מוגדר
לשלוח מהכתובת `noreply@resend.dev` — זו התיבה של Resend במצב sandbox.

**מצב sandbox ב-Resend חוסם שליחה לכל כתובת חוץ מזו של בעל החשבון.**
זו הגנה של Resend מפני שליחת spam מחשבונות לא מאומתים. לכן:

- ✅ מיילים לישראל גולדשמיד (בעל חשבון Resend) — עוברים
- ❌ מיילים ללקוחות / למעצבות אחרות — נחסמים בשקט

כדי לשלוח ללקוחות אמיתיים, **חובה לאמת דומיין ב-Resend** ולהגדיר את
המערכת להשתמש בו.

---

## שלב 1 · אימות הדומיין ב-Resend (5 דקות בצד שלך, ~15 דקות המתנת DNS)

1. פתחי https://resend.com/login והיכנסי לחשבון.
2. בצד שמאל → **Domains** → **Add Domain**.
3. הקלידי: `ziratadrichalut.co.il` → **Add**.
4. Resend תציג טבלה עם ערכי DNS שצריך להוסיף (3 רשומות TXT + אפשר 1 MX + 1 DKIM):
   ```
   Type   Name                        Value
   ----   ----                        -----
   MX     send.ziratadrichalut.co.il            feedback-smtp.us-east-1.amazonses.com   (priority 10)
   TXT    send.ziratadrichalut.co.il            "v=spf1 include:amazonses.com ~all"
   TXT    resend._domainkey.ziratadrichalut.co.il   p=MIGfMA0GCSqG...   (מחרוזת ארוכה)
   ```
   **השאירי את החלון פתוח — נחזור אליו.**

5. פתחי טאב חדש — פאנל ניהול ה-DNS של `ziratadrichalut.co.il`. לרוב זה:
   - **Cloudflare** (אם הדומיין עליהם)
   - **GoDaddy** (אם שם רכשת את הדומיין)
   - **Netim / Name.com / 013 / פרטנר / etc.** — תלוי איפה הדומיין
   - אם אינך בטוחה, הקלידי `whois ziratadrichalut.co.il` ב-https://whois.domaintools.com — יופיע שם הרשם.

6. העתיקי **אחת-אחת** את השורות מ-Resend לפאנל ה-DNS. לכל שורה:
   - בחרי Type (MX / TXT)
   - הדביקי את ה-Name (בלי הסיומת `.ziratadrichalut.co.il` — רוב הפאנלים מוסיפים אותה לבד, אז רק `send` או `resend._domainkey`)
   - הדביקי את ה-Value בדיוק כפי שמופיע

7. חזרי ל-Resend → לחצי **Verify DNS records**.
   - אם מופיעות כל השורות כירוקות (✅) — סיימת עם שלב 1.
   - אם חלק אדומות — חכי 5-10 דקות, רעני, ונסי שוב. DNS לוקח זמן להתפשט.

## שלב 2 · הגדרת משתני סביבה ב-Vercel (2 דקות)

1. פתחי https://vercel.com/dashboard → פרויקט `zirat-design` (או השם שלך).
2. **Settings** → **Environment Variables**.
3. לחצי **Add New**. הגדירי:
   ```
   Name:        FROM_EMAIL
   Value:       זירת האדריכלות <noreply@ziratadrichalut.co.il>
   Environment: Production, Preview, Development (סמני את שלושתם)
   ```
4. **Save**.
5. חזרי ללשונית **Deployments** → מצאי את ה-deploy האחרון → נקודות שלוש → **Redeploy**.
   זה טוען מחדש את משתני הסביבה כך שהם ייכנסו לתוקף (ה-env בלבד לא מופעלות עד ש-deploy רץ).

## שלב 3 · בדיקה (1 דקה)

**אפשרות א' — דרך הדשבורד (הכי קל):**

1. התחברי כאדמין.
2. פתחי בדפדפן (תוך כדי שאת מחוברת):
   ```
   https://zirat-design.vercel.app/api/admin/email/diagnose
   ```
   תראי JSON כזה:
   ```json
   {
     "config": {
       "fromEmail": "זירת האדריכלות <noreply@ziratadrichalut.co.il>",
       "isSandbox": false,
       "hasApiKey": true,
       ...
     },
     "issues": []
   }
   ```
   - ✅ `isSandbox: false` ו-`issues: []` — מעולה.
   - ❌ `isSandbox: true` — `FROM_EMAIL` לא התעדכן; חזרי לשלב 2 וודאי שעשית Redeploy.

**אפשרות ב' — שליחת מייל בדיקה בפועל:**

1. כנסי לחוזה כלשהו, החליפי את `clientEmail` בכתובת שלך (לא של ישראל).
2. לחצי "שלח במייל".
3. תוך 30 שניות המייל צריך להגיע.

**אפשרות ג' — curl ישיר (לטכנאיות):**

```
curl -X POST https://zirat-design.vercel.app/api/admin/email/diagnose \
  -H "Content-Type: application/json" \
  -H "Cookie: <הדביקי את ה-cookie של האדמין>" \
  -d '{"to": "עצמך@gmail.com"}'
```

## פתרון תקלות נפוצות

**"isSandbox עדיין true אחרי Redeploy"**
- ודאי שהגדרת `FROM_EMAIL` (לא `FROM` או `FROM_ADDRESS`).
- ודאי שסימנת את סביבת **Production** בהגדרת המשתנה.
- ודאי שהדומיין ב-Resend מופיע ירוק (Verified).

**"Resend מחזירה 'The domain is not verified'"**
- חזרי לשלב 1, לחצי "Verify DNS records" שוב.
- בפאנל ה-DNS — ודאי שלא הוספת רווחים בהתחלה/בסוף של הערכים.
- חכי עד שעה מלאה. לפעמים DNS זוחל לאט (במיוחד באורנג׳/012).

**"הדומיין מאומת אבל מיילים לא מגיעים בכלל"**
- בדקי ב-https://resend.com/logs את סטטוס המייל. אם כתוב `delivered` — המייל יצא, אולי הוא בספאם.
- אם כתוב `bounced` — הכתובת לא תקינה.
- אם לא מופיע כלום — הקוד לא מגיע עד לקריאת sendEmail. בדקי את Vercel logs.

**"לא מצליחה להיכנס ל-Resend"**
- ייתכן שהחשבון על שם ישראל גולדשמיד ולא שלך. בקשי ממנו לתת לך גישת Admin (https://resend.com/team).

## מה קורה בקוד כשהמייל נכשל?

מעתה (מקומיט `b1cf571` ואילך):

1. `lib/email.ts` מחזיר `{ success: false, message, sandbox }` במקום לבלוע שגיאות בשקט.
2. `/api/designer/crm/contracts/[id]` PATCH מחזיר `emailWarning` בגוף התשובה כשהמייל נכשל.
3. ה-UI של CRM מציג alert ברור לכל נכשלה שליחה, ומציע להעתיק את קישור החתימה ידנית.
4. הקישור לחתימה נגיש תמיד מהמודאל שנפתח אחרי לחיצת "שלח במייל" — גם אם המייל עצמו נחסם.

## השורה התחתונה

עד שהדומיין מאומת ו-`FROM_EMAIL` מוגדר: **תוכלי להמשיך לעבוד, פשוט להעתיק
את קישור החתימה מהמודאל ולשלוח ללקוח/ה ב-WhatsApp/SMS.** אחרי שהדומיין
מאומת — הכל ילך אוטומטית.
