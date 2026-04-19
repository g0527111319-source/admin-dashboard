# CLAUDE.md — הוראות עבודה לכל סשן של Claude על הפרויקט הזה

> **חובה לקרוא את כל הקובץ הזה לפני כל עבודה על הפרויקט.**
> הקובץ נטען אוטומטית לכל סשן של Claude Code הרץ על זה הריפו.

---

## 📖 מידע בסיסי על הפרויקט

**שם:** זירת האדריכלות (Zirat Adrichalut)
**תיאור:** קהילת מעצבות פנים ואדריכליות בישראל — פלטפורמה עם ניהול לקוחות (CRM), ספקים, אירועים, הזדמנויות עסקיות.
**סטאק:**
- Next.js 14.2.35 App Router + React 18
- TypeScript (strict), Tailwind CSS, Framer Motion
- Prisma + PostgreSQL (Neon)
- Resend (email), Google OAuth (login + Calendar), Stripe (subscriptions)
- Vercel deployment
- עברית מלאה, RTL, UI בעברית

**דומיין פרודקשן:** `https://www.ziratadrichalut.co.il`
**קונטקסט נוסף:** האתר מיועד להיות גם אפליקציית Android דרך TWA (Trusted Web Activity) ב-Google Play. יש PWA מלא עם Service Worker + manifest מוכן.

---

## 🛑 כללי ברזל — דברים שאסור לגעת בהם

### 1. לוגיקה עסקית — אסור להתעסק
- ❌ **אסור** לשנות קוד ב-`src/app/api/**` (כל ה-API routes)
- ❌ **אסור** לשנות `src/lib/**` אלא אם הוגדר במפורש כמשימה
- ❌ **אסור** לגעת ב-`middleware.ts`
- ❌ **אסור** לשנות `prisma/schema.prisma` או migration files
- ❌ **אסור** לשנות env vars (`.env*`) או Vercel env settings

### 2. חוזים של קומפוננטות
- ❌ אסור לשנות props קיימים של קומפוננטה (אפשר להוסיף optional בלבד)
- ❌ אסור לשנות שמות state keys, hash routes, URL params, form field names
- ❌ אסור למחוק onClick/onSubmit handlers, form submission logic
- ❌ אסור למחוק `aria-label`, `data-testid`, `role` ולוגיקת accessibility
- ✅ מותר להחליף className, להוסיף wrapper divs, לשנות מבנה JSX — כל עוד ההתנהגות נשמרת

### 3. URL structure ו-routing
- ❌ אסור לשנות slugs, routes, מבנה תיקיות של `src/app/**`
- דף שנמצא ב-`src/app/designer/[id]/page.tsx` חייב להישאר שם
- אם יש צורך לפצל קומפוננטה, שים אותה ב-`src/components/` ולא ב-`src/app/`

### 4. אינטגרציות קריטיות — טיפול אפס
- ❌ Google OAuth (`src/app/api/auth/google/**`, `src/app/api/designer/crm/google-calendar/**`)
- ❌ Resend email (`src/lib/email.ts`, `src/lib/mail*.ts`)
- ❌ Stripe (`src/app/api/stripe/**`, webhooks)
- ❌ Service Worker (`public/sw.js`)
- ❌ PWA Manifest (`public/manifest.json`)
- ❌ TWA config (`public/.well-known/assetlinks.json`, `twa/**`)
- ❌ קבצי אייקונים (`public/icons/**`) — אלה נגזרים מ-`public/logo.webp` דרך `scripts/gen-pwa-icons.mjs`
- ❌ meta tags של PWA/OAuth ב-`src/app/layout.tsx` (google-site-verification, apple-touch-icon, theme-color, viewport, manifest)

### 5. ניקיון נתונים — זה קריטי
יש באג ידוע: בעת עדכון פרופיל מעצבת, שדות מסוימים מתאפסים כשהם `undefined` ב-payload. **אסור** ליצור באג דומה בטפסים חדשים. השתמש ב-`isDefined` helper או תגנן בצד השרת.

**אסור למחוק רשומות מהדאטאבייס ללא אישור מהמשתמש בצ'אט.** גם אם זה נראה כמו נתון בדיקה.

### 6. RTL + עברית
- כל טקסט UI **חייב** להיות בעברית. שמות משתנים/קוד באנגלית.
- כל עטיפת תוכן חייבת `dir="rtl"` כברירת מחדל.
- שים לב: Tailwind spacing — `pl-4` במצב RTL זה הצד הנכון? בדוק עם `ps-4`/`pe-4` (logical properties) כשהכיווניות חשובה.
- כל emoji, numbers, English brand names — שמור עליהם גלויים.

---

## ✅ מה כן מותר לעצב / לשנות

### שכבת UI בלבד:
- ✅ `src/app/**/page.tsx` — הויזואל (className, מבנה JSX) אבל **לא** לוגיקת state/fetch/submit
- ✅ `src/components/**` — עיצוב מחדש, בתנאי שה-props הקיימים ממשיכים לעבוד
- ✅ `src/app/globals.css` — צבעים, typography, spacing
- ✅ `tailwind.config.ts` — custom theme (זהיר עם שינויי breakpoints)
- ✅ קומפוננטות חדשות ב-`src/components/ui/**`
- ✅ עריכת microcopy (טקסטים קצרים) אם המשתמש אישר

---

## 🧪 בדיקות חובה אחרי כל שינוי

לפני שאתה אומר "סיימתי" — הרץ את אלה:

```bash
# Build בלי שגיאות
npm run build

# TypeScript check (Next.js מגדיר ignoreBuildErrors, אל תסמוך על זה)
npx tsc --noEmit

# ESLint
npm run lint || true  # אופציונלי, אבל אם יש שגיאות חדשות, תקן
```

אם הוספת דף חדש או שינית דף קיים משמעותית, בדוק ידנית (דרך Chrome MCP או `npm run dev`):
- [ ] הדף נטען בלי שגיאות בקונסול
- [ ] כל הלינקים עובדים ומובילים ליעד הנכון
- [ ] כל כפתור עם onClick מפעיל את הפעולה הצפויה
- [ ] טפסים נשלחים ומחזירים תגובה (toast/redirect)
- [ ] Responsive: מובייל (375px), טאבלט (768px), דסקטופ (1280px)
- [ ] RTL תקין — טקסט עברי לא נשבר, מספרים/אנגלית לא במקום הלא נכון
- [ ] safe-area לא נשבר במסכים עם notch (בדוק בסימולטור iOS אם אפשר)

---

## 🎨 כשמעצבים מחדש — סדר עבודה

אם משימה היא "עצב מחדש את האתר" — **אל תעבוד על הכל בבת אחת**. סדר נכון:

1. **תקרא רפרנס עיצוב** (לינק שהמשתמש נתן, צילומי מסך, אתר) — **לפני** שכותבים שורה.
2. **הצג למשתמש תכנית בפרוזה:** "אני מבין שאתה רוצה X. אני מתכוון לשנות את A, B, C. אני **לא** אגע ב-D, E, F. אני אתחיל מדף הבית ואציג סקרין-שוט לאישור."
3. **חכה לאישור** לפני שכותבים קוד.
4. **עבוד דף אחד בכל פעם** לפי הסדר:
   1. `src/app/page.tsx` (דף הבית)
   2. `src/app/login/page.tsx`
   3. `src/app/register/page.tsx`
   4. `src/app/designer/[id]/page.tsx` (dashboard מעצבת — הכי מורכב)
   5. `src/app/admin/page.tsx`
   6. שאר הדפים
5. **אחרי כל דף:** `git commit`, הצג סקרין-שוט, חכה לאישור ("אהבתי / שנה / תמשיך").
6. **אל תעשה `git push --force` או `--amend`** לעולם.

---

## 💾 git discipline

- Commit messages בעברית או אנגלית — עקבי. הפרויקט הזה משתמש באנגלית עם explanation בעברית. דוגמה:
  ```
  redesign: refresh homepage hero with new typography

  Updated .hero container styling to match new brand direction.
  Did NOT touch any form logic, API calls, or routing — verified
  with npm run build + manual click-through.
  ```
- אחרי כל שינוי משמעותי — commit בנפרד. אל תצבור.
- לפני push — וודא `git status` נקי ממשהו שלא רצית לשלוח.

---

## 🆘 במקרה של ספק

**שאל את המשתמש במקום לנחש.** המחיר של שאלה הוא כמה שניות; המחיר של טעות יכול להיות שבירת פרודקשן.

### סימני אזהרה שדורשים שאילה מיידית:
- "אני לא בטוח אם לשנות את X" — **שאל**
- "נראה שזה קוד שאולי לא בשימוש" — **שאל לפני שמוחקים**
- "יש כאן באג, אני מתקן" — אם זה מחוץ לסקופ הנוכחי, **ציין ושאל**

---

## 📝 מצב נוכחי של הפרויקט (עדכון: אפריל 2026)

- האתר חי בפרודקשן
- מעבר דומיין מ-`ziratadrichal.co.il` ל-`ziratadrichalut.co.il` הושלם
- Google OAuth באימות (Trust & Safety), מצפה לתשובה
- PWA + TWA מוכנים; עומדים לבנות AAB ל-Google Play
- באג ידוע בעדכון פרופיל מעצבת — שדות מתאפסים כשעוברים `undefined`; בטיפול

---

**קובץ זה נטען אוטומטית. כל שינוי בו ישפיע על כל סשן עתידי.**
