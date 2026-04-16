# המשימה האחת שלך — מדריך מפורט

**זמן כולל מוערך:** 20–25 דקות
**קושי:** נמוך (רק קליקים וקריאה)
**הכל השאר** — מדיניות פרטיות, טופס מחיקה, middleware, קישורים באתר, טיוטת התגובה — **כבר בוצע ופרוס בפרודקשן.**

---

## לפני שמתחילים — דבר אחד לוודא (30 שניות)

פתחי את אלה בדפדפן — שלושתם חייבים להיטען (לא להפנות ל-login):

- https://zirat-design.vercel.app/ ← עמוד הבית
- https://zirat-design.vercel.app/privacy ← מדיניות פרטיות
- https://zirat-design.vercel.app/data-deletion ← טופס מחיקת נתונים

אם אחד מהם לא נטען, תכתבי לי ונתקן. אם כולם נטענים — ממשיכים.

---

## שלב 1 · אימות דומיין ב-Google Search Console (2 דקות)

המטא-תג של Google כבר מוטמע באתר. צריך רק ללחוץ "Verify".

1. פתחי https://search.google.com/search-console ← היכנסי עם **חשבון ה-Google שאיתו פתחת את פרויקט OAuth** (crypto-resolver-446615-n1).
2. בפינה השמאלית למעלה — הדרופדאון של הפרופרטיז. האם `zirat-design.vercel.app` כבר שם?
   - **אם כן** ← פתחי אותו, גשי ל-**Settings** (סמל גלגל שיניים בצד), ותחת **Ownership verification** וודאי שהסטטוס "Verified" (✅). אם כן, דלגי לשלב 2. אם לא — לחצי **Verify**.
   - **אם לא** ← לחצי **Add property** → בחרי **URL prefix** → הדביקי:
     ```
     https://zirat-design.vercel.app/
     ```
     לחצי **Continue**. בחרי את השיטה **HTML tag**. תופיע תיבה עם המטא-תג.
     - **בדקי את ה-`content=`** — אם הוא זהה ל- `yfcoIh96qYOARTamBbB2-Tq1ZTWaNmkdUce1stOym1s` (זה התג שמוטמע באתר שלך כרגע), לחצי **Verify** ותקבלי ✅ מיידית.
     - **אם ה-`content=` שונה**, תכתבי לי את הערך החדש ואני אעדכן את האתר תוך דקה.

## שלב 2 · הוספת הדומיין לפרויקט Google Cloud (2 דקות)

1. פתחי https://console.cloud.google.com/apis/credentials/domainverification?project=crypto-resolver-446615-n1
2. אם `zirat-design.vercel.app` לא ברשימה ← לחצי **Add domain** → הדביקי `zirat-design.vercel.app` → **Save**. זה אמור להצליח מיד כי השלמת את שלב 1.
3. פתחי גם https://console.cloud.google.com/apis/credentials/consent?project=crypto-resolver-446615-n1
4. תחת **Authorized domains** — אם `zirat-design.vercel.app` לא מופיע, הוסיפי (**Add domain** → הדביקי → Save).

## שלב 3 · הקלטת סרטון הדגמה (10–12 דקות)

זה החלק הכי ארוך, אבל פשוט.

### הכלי המומלץ: Loom (חינם, קל ביותר)

1. פתחי https://www.loom.com/signup — הירשמי חינם (אפשר עם Google).
2. הורידי את תוסף Chrome או את אפליקציית Desktop של Loom.
3. פתחי **חלון Chrome חדש במצב Incognito** (Ctrl+Shift+N) — חשוב שהדף יהיה נקי.
4. לחצי על כפתור Loom → בחרי **Screen + Cam** (או Screen only אם לא רוצה מצלמה) → בחרי **Current Tab** → התחילי הקלטה.

### מה להקליט (לפי סדר, כל צעד 15–25 שניות)

📄 **תסריט מלא עם narration באנגלית** נמצא בקובץ:
`docs/google-verification/demo-video-script.md`

**תקציר קצר של מה שצריך לצלם:**

| # | מה להראות | מה לומר (באנגלית) |
|---|---|---|
| 1 | עמוד הבית של zirat-design.vercel.app | "This is Zirat Architecture, a CRM for interior designers." |
| 2 | עמוד /privacy — גללי לסעיף 4 (Google API) | "Our privacy policy documents exactly what Google data we access and how." |
| 3 | עמוד /login — לחצי "Sign in with Google" → מסך ההסכמה של Google מופיע | "Scope 1: openid email profile. The consent screen shows the exact data we receive." |
| 4 | התחברי, היכנסי לאזור המעצב → CRM → יומן → לחצי "חבר Google Calendar" → מסך הסכמה מופיע | "Scope 2: calendar. Requested only when the user opts in." |
| 5 | צרי אירוע חדש ב-CRM → לחצי סנכרון → הראי את האירוע ביומן Google בטאב נוסף | "This is the only use of calendar access — pushing events the user creates in our CRM." |
| 6 | חזרי ל-CRM → הגדרות יומן → לחצי "ניתוק" → הראי שהחיבור נותק | "User can revoke access anytime from inside the app." |
| 7 | עמוד /data-deletion | "Public deletion form — any user can request data deletion without logging in." |

**סה"כ סרטון: 90–120 שניות.** טייק אחד בלי עריכה — גם אם יש גמגום זה בסדר, הם רוצים לראות את הזרימה.

### העלאה ל-YouTube (3 דקות)

1. Loom נותן לך קישור לשיתוף — **אבל Google רוצה דווקא YouTube**. אז:
2. פתחי https://studio.youtube.com → **Create** → **Upload video**
3. העלי את הקובץ (אפשר גם להוריד את הסרטון מ-Loom קודם, או להשתמש ב-Screen recording של Windows: `Win+G`).
4. בעת ההעלאה:
   - **Title:** `Zirat Architecture — OAuth scope demonstration`
   - **Description:** `Demo video for Google OAuth verification. Shows how openid/email/profile and Google Calendar scopes are used within zirat-design.vercel.app`
   - **Audience:** ✅ "No, it's not made for kids"
   - **Visibility:** 🔴 **Unlisted** (לא Private! לא Public! **Unlisted.**) — זה קריטי.
5. לחצי **Save** → העתיקי את הקישור (נראה כמו `https://youtu.be/XXXXXXXX`).
6. **בדיקת שפיות קריטית:** פתחי חלון **Incognito**, הדביקי את הקישור. אם הסרטון נטען ומתנגן בלי לבקש להתחבר → ✅. אם הוא מבקש להיכנס לחשבון → הוא מוגדר כ-Private, חזרי ל-YouTube Studio ושני ל-**Unlisted**.

## שלב 4 · שליחת התגובה ל-Google (3 דקות)

1. פתחי את קובץ הטיוטה ב-VS Code או Notepad:
   ```
   C:\Users\This_user\Downloads\zirat-community\docs\google-verification\reply-email-draft.md
   ```
2. מצאי את המחרוזת `[PASTE YOUR UNLISTED YOUTUBE URL HERE]` (מופיעה **פעמיים** — אחת בגוף הטקסט, אחת בטבלת הסיכום). החליפי את שתיהן בקישור ה-YouTube מהשלב הקודם.
3. פתחי את המייל המקורי מ-Google ב-Gmail.
4. לחצי **Reply**.
5. העתיקי את כל התוכן של `reply-email-draft.md` (מהשורה `Hello Google Developer Verification Team,` עד הסוף, **לא כולל** הצ'קליסט למטה אחרי `---`).
6. הדביקי לגוף המייל.
7. עיצוב: Gmail יקבל את הפורמט של markdown כטקסט רגיל — זה תקין לגמרי. אם את רוצה, אפשר להדביק את הטבלה כטבלה (Gmail יזהה).
8. לחצי **Send**.

---

## צ'קליסט סופי לפני Send

- [ ] `https://zirat-design.vercel.app/privacy` נטען בלי להתחבר ✓ (אני בדקתי)
- [ ] `https://zirat-design.vercel.app/data-deletion` נטען בלי להתחבר ✓ (אני בדקתי)
- [ ] המטא-תג של Google עדיין באתר ✓ (אני בדקתי)
- [ ] לחצת Verify ב-Search Console (סטטוס Verified ✅)
- [ ] הדומיין מופיע ב-Cloud Console תחת Domain verification
- [ ] הקלטת סרטון וקישור YouTube **Unlisted** פועל ב-Incognito
- [ ] הדבקת את הקישור בטיוטה במקום `[PASTE YOUR UNLISTED YOUTUBE URL HERE]`
- [ ] הדבקת את הטיוטה כתגובה לאותו שרשור במייל מ-Google

---

## אם נתקעת — תגידי לי בדיוק איפה

אני יכול/ה לעזור לך בכל שלב. רק תגידי: "נתקעתי בשלב X" + מה את רואה, ואני אתן הוראות ממוקדות.

---

## בונוס — מה שנעשה לך בצד

במקרה שבודק/ת מ-Google תלחץ/תלחץ על הקישורים האלה, זה מה שהוא/היא יראו:

- https://zirat-design.vercel.app/ → עמוד נחיתה מלא עם לוגו, פוטר שמכיל את כל שלושת הקישורים המשפטיים
- https://zirat-design.vercel.app/privacy → מדיניות פרטיות מפורטת (10 סעיפים + סיכום באנגלית)
- https://zirat-design.vercel.app/data-deletion → טופס פומבי למחיקת נתונים
- https://zirat-design.vercel.app/terms → תנאי שימוש קיימים מראש

זה יותר ממה שהרבה אפליקציות מאושרות מציגות. ההסתברות שעוברת בסבב הזה — גבוהה מאוד.
