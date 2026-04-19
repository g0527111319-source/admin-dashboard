# זירת האדריכלות — מסמך מפרט טכני

**Technical Handoff Document for Zirat Community**

_מסמך מכיל את כל המידע הנדרש כדי שמפתח או בינה מלאכותית יוכלו להבין את הפרויקט, לתחזק אותו, להרחיב ולתקן תקלות._

| פרט | ערך |
|---|---|
| שם הפרויקט | Zirat Community — פלטפורמת קהילה ו-CRM למעצבות פנים |
| בעלים | ישראל גולדשמיד / תמר (מנהלת קהילה) |
| דומיין עיקרי | `ziratadrichalut.co.il` (www) |
| דומיין legacy | `ziratadrichal.co.il` (301 redirect עם שמירת path) |
| טכנולוגיה | Next.js 14.2 (App Router) + TypeScript + Prisma + PostgreSQL |
| תאריך עדכון | 2026-04-19 |
| שפה | עברית (RTL), תמיכה ב-English ללקוחות |

---

## 1. סקירה כללית

הפרויקט הוא פלטפורמת SaaS למעצבות פנים בישראל, המשלבת:

- **קהילה:** ספקים, פוסטים, דירוגים, המלצות, אירועים והגרלות חודשיות
- **CRM מקצועי למעצבת:** לקוחות, פרויקטים, חוזים, הצעות מחיר, יומן, מעקב זמנים, צ'אט, פורטפוליו ועוד
- **מנויים חודשיים:** מערכת חיוב מלאה עם iCount (חשבונית ישראלית), כולל dunning, הנחות, קופונים וקידום אוטומטי
- **שילוב WhatsApp:** בוט AI לעבודה מול ספקים, תזכורות ללקוחות, פרסום פוסטים
- **חתימת חוזים דיגיטלית:** טמפלייטים, שדות ממוקמים על PDF, חתימה דיגיטלית עם אימות
- **פורטל לקוחות:** גישה ללקוח דרך טוקן (ללא סיסמה) — עדכונים, תמונות, מסמכים, צ'אט

### קהל יעד
מעצבות פנים עצמאיות ופרילנסריות בישראל. הפלטפורמה בעברית (RTL), עם מימוש מלא של חגים ישראליים, לוח עברי, ואינטגרציה ל-iCount להפקת חשבוניות.

### ארבעה תפקידי משתמש

| תפקיד | תיאור | יכולות עיקריות |
|---|---|---|
| **Admin** | תמר — מנהלת קהילה | אישור מעצבות וספקים, ניהול פוסטים, הגרלות, אירועים, הגדרות מנוי, קופונים, דוחות |
| **Designer** | מעצבת פנים (המשתמש המשלם העיקרי) | פרופיל, CRM מלא, חתימת חוזים, הצעות מחיר, יומן, דיווח עסקאות, המלצות על ספקים |
| **Supplier** | ספק (מנוי חודשי) | פרופיל עסקי, פרסום פוסטים (באישור), אישור עסקאות של מעצבות, דירוגים, כרטיס ביקור |
| **Client** | לקוח קצה של המעצבת | צפייה בפרויקט דרך פורטל OTP (ללא הרשמה), חתימה על חוזים, צפייה בתמונות התקדמות, צ'אט, אישורים |

---

## 2. סטאק טכנולוגי

המערכת בנויה על Next.js 14.2.35 עם App Router, React 18, TypeScript 5, ומסד נתונים PostgreSQL עם Prisma ORM.

### שכבת Framework ו-Runtime

| רכיב | ערך |
|---|---|
| Framework | Next.js 14.2.35 (App Router, Route Handlers, Server Components) |
| שפה | TypeScript 5 (strict mode) |
| Runtime | Node.js 18+ (Vercel Edge runtime למידלוור) |
| UI Library | React 18.3.1, lucide-react, recharts, framer-motion, lenis |
| Styling | Tailwind CSS 3.4 עם פלטה מותאמת (gold #C9A84C), tailwind-merge, class-variance-authority |
| גופנים | Frank Ruhl Libre + Heebo + Assistant (דרך `next/font`, מותאם RTL) |

### שכבת נתונים

| רכיב | ערך |
|---|---|
| מסד נתונים | PostgreSQL (hosted — Vercel Postgres / Supabase) |
| ORM | Prisma 7.4.2 (client מיוצר ל-`src/generated/prisma`) |
| מספר מודלים | 79 מודלים (`schema.prisma` — 2,122 שורות) |
| Driver | `pg` + `@prisma/adapter-pg` |

### אימות ואבטחה

| רכיב | ערך |
|---|---|
| אסטרטגיה | JWT custom (לא NextAuth) — HS256 דרך `jose`, תוקף 6 שעות |
| סיסמאות | bcryptjs עם 12 salt rounds |
| עוגיה | `session_token` (httpOnly, sameSite=lax, secure בפרודקשן) |
| Google OAuth | תומך למעצבת וספק (לא ל-Admin) |
| OTP ללקוחות | `ClientPortalOtp` + token חד-פעמי עם תפוגה |
| 2FA למנהלת | `AdminTwoFactorCode` — hashed code + contextId |
| Middleware | `src/middleware.ts` — אכיפת תפקידים לכל נתיב, הזרקת `x-user-*` headers |
| Rate Limit | `RateLimitEntry` — טבלה ב-DB עם חלון זמן |

### שירותים חיצוניים

| שירות | פרטים |
|---|---|
| אימייל | **Resend 6.9.4** — כרגע sandbox (noreply@resend.dev). בתהליך מעבר ל-ziratadrichalut.co.il |
| חיוב וחשבוניות | **iCount API** (חברה ישראלית) — מנויים חוזרים, webhooks, idempotency דרך `icountEventId` |
| אחסון קבצים | **כפול:** Cloudinary (ראשי) + AWS SDK S3 ל-Cloudflare R2 (bucket: `zirat-files`) |
| WhatsApp — בוט AI | **Baileys** (WhatsApp Web ישיר) + **Anthropic Claude API** |
| WhatsApp — גייטוויי | **Green API** (לשליחות מנהלתיות) |
| עיבוד תמונות | `sharp` + `react-image-crop` |
| PDF | `pdf-lib` 1.17.1 + `@pdf-lib/fontkit` (תמיכה בעברית) |
| יומן | חישוב לוח עברי פנימי + סנכרון ל-Google Calendar |
| אקסל | `xlsx` — ייבוא/ייצוא |
| Analytics | `@vercel/analytics` |

### מבנה תיקיות

```
src/app/              — App Router (כל הדפים וה-API)
src/components/       — רכיבים משותפים
src/lib/              — לוגיקה עסקית (auth, email, contracts, dunning)
src/generated/prisma/ — Prisma Client (מיוצר, לא לעריכה ידנית)
prisma/schema.prisma  — סכמת DB (79 מודלים)
prisma/seed.ts        — נתוני דוגמה
public/               — משאבים סטטיים, pdfjs
docs/                 — תיעוד פרויקט
scripts/              — סקריפטי CLI לתחזוקה
vercel.json           — הגדרות Vercel + cron jobs
```

---

## 3. מודלי Prisma (79 מודלים)

המודלים מחולקים לקטגוריות. הרשימה המלאה עם כל השדות נמצאת ב-`prisma/schema.prisma`.

### 3.1 ליבה — קהילה וספקים

| מודל | תיאור |
|---|---|
| **Supplier** | חשבון ספק עם מנוי חודשי, קטגוריה, גלריה, לוגו, שיטת תשלום |
| **Designer** | חשבון מעצבת — השחקן העיקרי (25+ יחסים). שדות: התמחות, שנות ניסיון, סוג העסקה |
| **Post** | פוסט מתוזמן של ספק בקהילה (מאושר ע"י מנהלת) |
| **Deal** | עסקה מדווחת מעצבת-ספק (מזכה בהגרלה) |
| **Recommendation** | המלצה פומבית של מעצבת על ספק (אחת לכל זוג) |
| **Lottery** | הגרלה חודשית — פרסים, משתתפים זכאים, מספר זוכות |
| **LotteryWinner** | רשומת זוכה (דרגה 1/2/3) |
| **SupplierRecommender** | מעצבה שהמליצה על ספק |
| **SupplierCategory** | קטגוריות דינמיות של ספקים |
| **PublishingSlot** | משבצות זמן מורשות לפרסום |
| **BusinessCard** | כרטיס ביקור דיגיטלי (למעצבת/ספק) |
| **SupplierReservation** | הזמנת יומן לספק |
| **Event** | אירוע קהילתי (חינם/בתשלום) |
| **EventRegistration** | הרשמה של מעצבת לאירוע (כולל תשלום iCount) |
| **WhatsAppLog** | לוג כללי לפעולות ווטסאפ |

### 3.2 CRM למעצבת — לקוחות ופרויקטים

| מודל | תיאור |
|---|---|
| **CrmClient** | לקוח של המעצבת (כולל פרטי בן/בת זוג, כתובת שיפוץ, שפה) |
| **CrmProject** | פרויקט עיצוב — סוג, סטטוס, תקציב, תאריכים |
| **CrmProjectPhase** | שלבים בפרויקט (לפי סדר, עם deadline) |
| **CrmProjectMessage** | הודעת צ'אט מעצבת↔לקוח |
| **CrmProjectDocument** | מסמך מצורף לפרויקט |
| **CrmProjectPhoto** | תמונת התקדמות (R2, עם thumb/medium) |
| **DesignerCrmSettings** | הגדרות CRM של מעצבת |
| **CrmMaterialCategory / Item / History** | חומרים עם אישור לקוח ומעקב שינויים |
| **CrmQuote** | הצעת מחיר — סעיפים, סכום, סטטוס |
| **CrmQuoteTemplate** | תבנית הצעת מחיר |
| **CrmContractTemplate** | תבנית חוזה (content blocks + שדות ממוקמים) |
| **CrmContract** | חוזה חתום — PDF, חתימה דיגיטלית, token ציבורי |
| **CrmTask** | משימה למעצבת |
| **CrmReminder** | תזכורת מתוזמנת (email/WhatsApp) |
| **CrmSupplier** | רשימת ספקים פרטית של מעצבת |
| **CrmMessageTemplate** | תבנית הודעה (WhatsApp/email) |
| **CrmTimeEntry** | מעקב זמנים לחיוב |
| **CrmMoodboard / Item** | לוח השראה משותף עם הלקוח |
| **CrmCalendarEvent** | פגישה/משימה ביומן (סנכרון Google) |
| **DesignerGoogleCalendar** | טוקנים של Google Calendar |
| **CrmSatisfactionSurvey** | סקר שביעות רצון ללקוח |
| **CrmWebhookEndpoint / Log** | Webhooks ל-Zapier/Make |
| **ClientPortalToken / Otp** | גישת לקוח ללא סיסמה |

### 3.3 CRM V2/V3 — פיצ'רים מתקדמים

| מודל | תיאור |
|---|---|
| **CrmApprovalRequest / Option** | בקשת אישור מהלקוח (יחיד או A/B/C) |
| **CrmActivityLog** | timeline של כל הפעולות בפרויקט |
| **CrmBeforeAfter** | זוגות תמונות לפני/אחרי |
| **CrmClientUpload** | תמונות שהלקוח מעלה |
| **CrmOnboardingTemplate / Item** | checklist קליטת לקוח |
| **CrmStyleQuizTemplate / Response** | חידון העדפות סגנון |
| **CrmClientRecommendation** | המלצה פומבית מלקוח |
| **CrmAutomationRule** | כללי אוטומציה |
| **CrmProjectSettings** | דריסת הגדרות ברירת מחדל לפרויקט |
| **CrmHandoffChecklist / Item** | רשימת מסירה בסוף פרויקט |
| **CrmBudgetItem** | פריט תקציב (מתוכנן vs בפועל) |
| **CrmScheduleBlock** | בלוק בגאנט (תלויות, משך, סטטוס) |
| **CrmInspirationBoard / Item** | ספריית השראה עם תגיות |
| **CrmWorkflowTemplate** | תבנית זרימת פרויקט |

### 3.4 פורטפוליו, WhatsApp, מערכת

| מודל | תיאור |
|---|---|
| **DesignerProject / Image** | פרויקט בפורטפוליו הציבורי |
| **WhatsAppConversation** | זיכרון שיחה של בוט ה-AI |
| **WhatsAppAuditLog** | לוג ביקורת לבוט |
| **WhatsAppScheduledTask** | משימת AI מתוזמנת (cron expr) |
| **SystemSetting** | מאגר key/value גמיש |

### 3.5 מנויים וחיובים

| מודל | תיאור |
|---|---|
| **SubscriptionPlan** | הגדרת תוכנית (slug, מחיר, billingCycle, features JSON) |
| **DesignerSubscription** | מנוי מעצבת — trialing/active/past_due/grace/paused/read_only/cancelled/expired, iCount IDs, שדות dunning |
| **SubscriptionPayment** | ניסיון תשלום (`icountEventId` ייחודי) |
| **SubscriptionRule** | כלל קידום אוטומטי |
| **SubscriptionAuditLog** | ביקורת פעולות |
| **Coupon / Redemption** | קופוני הנחה |
| **InAppNotification** | התראה בתוך האפליקציה |
| **AdminTwoFactorCode** | 2FA למנהלת |
| **RateLimitEntry** | מעקב rate limiting |

---

## 4. זרימות משתמש מרכזיות

### 4.1 רישום מעצבת → אישור → מנוי

1. כניסה לדף הבית → בחירת כרטיס מעצבת → `/login` → Register
2. מילוי טופס מפורט (פרטים אישיים + מקצועיים)
3. החשבון במצב `PENDING` — מסך "ממתין לאישור מנהלת"
4. ניסיון login לפני אישור → שגיאת `account_pending`
5. מנהלת רואה את ההרשמה ב-`/admin/waitlist` → אישור
6. מייל welcome נשלח (כרגע חסום בגלל Resend sandbox)
7. Login ראשון → אם אין מנוי → הפניה אוטומטית ל-`/designer/[id]/onboarding`
8. בחירת תוכנית → תשלום iCount → חזרה עם מנוי פעיל

### 4.2 רישום ספק → פרסום פוסט → דיווח עסקה

1. Register ספק — טופס קצר (עסק, קטגוריה, אתר, תיאור)
2. אישור ב-`/admin/suppliers-waitlist`
3. Login → מילוי פרופיל (לוגו, גלריה, תיאור)
4. יצירת פוסט — עד 20 תמונות + checklist (לוגו זירה, לוגו עצמי, קרדיט מעצבת) + שעת פרסום (10:30/13:30/20:30)
5. אישור מנהלת ב-`/admin/posts` → מעבר לסטטוס `PUBLISHED`
6. מעצבות רואות את הפוסט, מבצעות עסקאות ומדווחות
7. ספק רואה עסקאות ב-tab deals, מאשר → מעצבת יכולה לדרג
8. ספק יכול להוסיף עד 3 "מעצבות ממליצות" לפרופיל

### 4.3 שליחת חוזה ללקוח → חתימה → PDF

1. מעצבת בונה חוזה ב-`CrmContracts` מתבנית
2. ממלאת שדות שלה → חותמת בעצמה → שולחת לינק ללקוח (WhatsApp/email)
3. לקוח פותח `/contract/sign/[token]` → `clientViewedAt` נרשם
4. שדות auto-fill (שם/טל/כתובת) מופיעים read-only
5. לקוח ממלא שדות נדרשים + מצייר חתימה → Send & sign
6. `POST /api/contract/sign/[token]` → `clientSignedAt` נחתם
7. מסך אישור + כפתור להורדת ה-PDF החתום
8. PDF מוטמע עם חתימה דיגיטלית, timestamp, אימות זהות

### 4.4 מנהלת מאשרת רישומים חדשים

1. כניסה ל-`/admin` → dashboard עם Smart Alerts
2. התראה "X מעצבות ממתינות" → קליק → `/admin/waitlist`
3. בדיקת פרטי ההרשמה
4. אישור → סטטוס קופץ ל-`APPROVED`
5. מייל welcome נשלח ב-async (Resend)
6. המעצבת יכולה מעכשיו להיכנס ולהתקדם ל-onboarding

---

## 5. מפת API ראשית

כל ה-APIs נמצאים ב-`src/app/api/**` כ-Route Handlers. המבנה לפי תפקיד.

### 5.1 `/api/auth/*` — אימות
`login`, `logout`, `register`, `magic-link`, `forgot-password`, `reset-password`, `set-password`, `google` (OAuth callback)

### 5.2 `/api/admin/*` — ניהול
`dashboard`, `stats`, `actions`, `suppliers`, `designers`, `subscriptions` (+analytics/plan-change/grant-trial/collaboration-report), `coupons`, `waitlist`, `settings`, `migrate-subscriptions`, `2fa` (request/verify), `whatsapp-bot` (logs/settings)

### 5.3 `/api/designer/crm/*` — CRM (ענקי)
`projects`, `phases`, `materials`, `moodboards`, `quotes`, `contracts` + `templates`, `approvals`, `tasks`, `budget`, `schedule` (Gantt), `handoff-checklists`, `inspiration-boards`, `workflows`, `onboarding-templates`, `style-quiz`, `recommendations`, `automations`, `webhooks`, `surveys`, `whatsapp`, `activity-log`, `settings`, `plans`, `suppliers`, `time-entries`, `client-uploads`, `before-after`, `templates` (message)

### 5.4 `/api/designer/subscription/*` — מנוי מעצבת
`pause`, `resume`, `cancel`, `cancel-downgrade`, `change-plan`, `apply-coupon`, `payment-url`

### 5.5 `/api/client-portal/[token]/*` — פורטל לקוח
`intake`, `messages`, `project`, `settings`, `verify-otp`

### 5.6 `/api/contract/sign/*` — חתימת חוזה פומבית
- `GET [token]` = טעינת חוזה
- `POST [token]` = חתימה סופית

### 5.7 `/api/cron/*` — עבודות מתוזמנות

מוגדרות ב-`vercel.json`. פרוטות ב-`CRON_SECRET` (Bearer header).

| Endpoint | Schedule | תפקיד |
|---|---|---|
| `/api/cron/daily-summary` | `0 20 * * *` | סיכום יומי → WhatsApp למנהלת |
| `/api/cron/whatsapp-tasks` | `0 9 * * *` | ביצוע משימות WhatsApp מתוזמנות |
| `/api/cron/check-promotions` | `0 3 * * *` | סריקת קידומי מנוי אוטומטיים |
| `/api/cron/subscription-daily` | `0 4 * * *` | dunning, trial-ending, renewal reminders, pause auto-resume, churn scan |
| `/api/cron/morning-digest` | (לא מתוזמן) | per-designer digest יומי |
| `/api/cron/reminders` | (לא מתוזמן) | תזכורת לפגישת לקוח N שעות לפני |

### 5.8 `/api/whatsapp/*`
`status`, `webhook` (נקודת קצה של Green API)

### 5.9 `/api/webhooks/*`
`iCount` (אירועי חיוב + קבלות), ועוד

---

## 6. אינטגרציות חיצוניות

### 6.1 Resend — שליחת מיילים

- **קובץ:** `src/lib/email.ts`
- **מצב נוכחי:** sandbox (`noreply@resend.dev`) — שולח רק למייל של בעל החשבון
- **API Key:** `RESEND_API_KEY` (Vercel env)
- **FROM:** `FROM_EMAIL` (Vercel env)
- **תבניות:** `welcomeDesignerEmail`, `dealNotificationEmail`, `reminderEmail`, `subscriptionReceiptEmail`, `trialEndingEmail`, `renewalReminderEmail`, `paymentFailedEmail`, `subscriptionCancelledEmail`, `subscriptionPausedEmail`, `promotionNearEmail`, `promotionGrantedEmail`, `downgradeReminderEmail`, `clientMeetingInviteEmail`, `clientMeetingReminderEmail`

**⚠ משימה פתוחה:** לסיים אימות הדומיין `ziratadrichalut.co.il` ב-Resend.

```typescript
const result = await sendEmail({
  to: 'user@example.com',
  subject: '...',
  html: '...',
  attachments: [{ filename, content }]
});
```

### 6.2 iCount — חיוב חשבוניות

- **מטרה:** חשבוניות ישראליות, מנויים חוזרים, כרטיסי אשראי
- **env vars:** `ICOUNT_COMPANY_ID`, `ICOUNT_USER`, `ICOUNT_PASS`, `ICOUNT_API_KEY`, `ICOUNT_WEBHOOK_SECRET`
- **זרימה:** onboarding → `POST payment-url` יוצר session באייקאונט → הפניה → אחרי תשלום webhook חוזר → מעדכן `DesignerSubscription` + `SubscriptionPayment`
- **Idempotency:** `icountEventId` (unique) ב-`SubscriptionPayment`
- **Dunning:** `src/lib/subscription-dunning.ts` — ניסיונות חוזרים, grace period, read_only, ביטול

### 6.3 WhatsApp — שתי מערכות מקבילות

1. **Green API (outbound):** הודעות מנהלתיות. env: `GREEN_API_INSTANCE_ID`, `GREEN_API_TOKEN`
2. **Baileys + Claude (AI bot):** בוט שיחה דו-כיווני עם זיכרון (`WhatsAppConversation`), לוגים ב-`WhatsAppAuditLog`. env: `ANTHROPIC_API_KEY`, `WHATSAPP_SESSION_PATH`
3. **מעצבת CRM:** פאנל WhatsApp בתוך dashboard המעצבת לניהול שיחות עם לקוחות

### 6.4 Cloudinary + Cloudflare R2 — אחסון קבצים

- **Cloudinary:** תמונות פרופיל, גלריות ספקים. env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **R2 (`zirat-files`):** תמונות פרויקט של מעצבת — variant thumb/medium, sharp לעיבוד. API דרך `@aws-sdk/client-s3`. שדות `r2Key`/`thumbnailUrl`/`mediumUrl` ב-`CrmProjectPhoto` ו-`DesignerProjectImage`

### 6.5 Google Calendar OAuth — סנכרון יומן

- **זרימה:** מעצבת מחברת חשבון Google → callback מאחסן אסימונים ב-`DesignerGoogleCalendar` → כל `CrmCalendarEvent` מסונכרן (`googleEventId`)
- **סטטוס אימות OAuth:** ממתין (פרויקט `crypto-resolver-446615-n1`). מסמכי התמיכה מוכנים ב-`docs/google-verification/`

---

## 7. משתני סביבה (Vercel)

הרשימה המלאה ב-`.env.example`.

### 7.1 חובה

| משתנה | תיאור |
|---|---|
| `DATABASE_URL` | כתובת PostgreSQL |
| `AUTH_SECRET` | secret ל-JWT (מינימום 32 תווים) |
| `ADMIN_EMAIL` | מייל של Admin (תמר) |
| `ADMIN_PASSWORD` | סיסמת Admin |

### 7.2 מיילים (Resend)

| משתנה | תיאור |
|---|---|
| `RESEND_API_KEY` | API key מ-resend.com |
| `FROM_EMAIL` | שולח בפורמט `שם <email@domain>` |

### 7.3 חיוב (iCount)

| משתנה | תיאור |
|---|---|
| `ICOUNT_COMPANY_ID` | ID החברה |
| `ICOUNT_USER` | שם משתמש |
| `ICOUNT_PASS` | סיסמה |
| `ICOUNT_API_KEY` | API key |
| `ICOUNT_WEBHOOK_SECRET` | HMAC לאימות webhooks |

### 7.4 אחסון (Cloudinary + R2)

| משתנה | תיאור |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | שם הענן |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret |
| `R2_ENDPOINT` | S3 endpoint של Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | Access Key |
| `R2_SECRET_ACCESS_KEY` | Secret Key |
| `R2_BUCKET_NAME` | `zirat-files` |

### 7.5 WhatsApp

| משתנה | תיאור |
|---|---|
| `GREEN_API_INSTANCE_ID` | ID instance ב-Green API |
| `GREEN_API_TOKEN` | טוקן Green API |
| `WHATSAPP_SESSION_PATH` | תיקייה לסשן של Baileys |
| `ADMIN_WHATSAPP_PHONES` | מס' טלפון של מנהלים (מופרד בפסיקים) |
| `ANTHROPIC_API_KEY` | Claude API לבוט AI |

### 7.6 שונות

| משתנה | תיאור |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL ציבורי של האתר |
| `NEXT_PUBLIC_BASE_URL` | URL בסיסי לתבניות מייל |
| `AUTH_URL` / `NEXTAUTH_URL` | URL callback לאימות |
| `ENCRYPTION_KEY` | 32 bytes hex להצפנת טוקני תשלום |
| `CRON_SECRET` | Bearer token לאימות cron jobs |
| `MIGRATION_SECRET` | שומר על endpoint migration חד-פעמי |
| `GOOGLE_CLIENT_ID` / `SECRET` | Google OAuth credentials |

---

## 8. שינויים אחרונים (commits)

סדר יורד — החדש ביותר למעלה.

- `1de2095` — docs(email): מדריך קצרצר לתמר — שני שלבים בלבד
- `a9c07a0` — fix(email): חשיפת כשלי שליחת מייל + אבחון Resend sandbox
- `b1cf571` — fix(contracts): 5 תיקונים במערכת החתמת לקוחות
- `dc0b2f8` — docs(google-verification): מדריך מפורט למשימה האחת שנשארה למעצבת
- `fb2d563` — feat(privacy): טופס מחיקת נתונים ציבורי + מחיקת חשבון עצמית למעצבת
- `ad54fde` — fix(middleware): פתיחת /privacy לגישה ציבורית לאימות Google OAuth
- `fd08253` — docs(privacy): מדיניות פרטיות מלאה לאימות Google OAuth
- `e2870fb` — feat(contracts): לינק חתימה גלוי, שליחה ב־email עם עריכת כתובת, שמירת PDF חתום
- `a2917dd` — fix(contract-sign): החלפת use(params) בפרמטר סינכרוני
- `a4a2cb9` — fix(contracts): תיקון קישור חתימה ציבורי + שדרוגים לעורך התבנית
- `199eb5d` — fix(pdf): blob URL + גובה iframe מורחב
- `0f25a52` — fix(pdf): מעבר לתצוגת PDF של הדפדפן במקום pdf.js
- `059e349` — fix(pdf): שדרוג ל-pdf.js v5 עם אחסון עצמי
- `e5b714a` — fix(pdf): תיקון הרינדור השחור של עמוד ראשון בחוזה עברי
- `cdb4fd5` — fix(pdf): תיקון רינדור טקסט עברי ב-PDF
- `08c359a` — feat: תיקון גלילת PDF בחוזים + פיצ'רים חדשים ל-CRM
- `1297a6e` — feat: תמונות מאומתות, פרלקס עם עומק אמיתי
- `56c84a7` — feat: שכבת עומק תלת־ממדית (DepthSection) עם פרלקס אדריכלי
- `53314a6` — feat: חוויית משתמש ברמת Awwwards
- `f5f04ef` — feat: פגישות ומשימות נשמרות בהיסטוריית הלקוח
- `a4461b9` — feat: סנכרון אוטומטי ל-Google Calendar
- `3bce435` — feat: יומן חזותי עם תצוגת חודש/שבוע/יום, תאריכים עבריים
- `9b7aa1d` — fix: show error feedback after Google Calendar OAuth redirect
- `57454ec` — fix: session cookie SameSite=Lax for Google OAuth redirect chains

---

## 9. הרצה מקומית

### 9.1 דרישות
- Node.js 18+ (מומלץ 20)
- PostgreSQL
- קובץ `.env.local` (העתק מ-`.env.example`)

### 9.2 פקודות בסיסיות

```bash
npm install
npx prisma generate
npx prisma db push          # ליצור schema במסד ריק
npx prisma db seed          # נתוני דוגמה (אופציונלי)
npm run dev                 # localhost:3000
```

### 9.3 build ופריסה

```bash
npm run build               # build פרודקשן
npm start                   # הרצת build
vercel --prod               # פריסה ידנית
vercel env pull .env.vercel # משיכת env מ-Vercel
```

### 9.4 Prisma (שינויי schema)

```bash
# אחרי שינוי ב-prisma/schema.prisma:
npx prisma migrate dev --name my_change
npx prisma generate
# לפרודקשן (Vercel build):
npx prisma migrate deploy
```

---

## 10. משימות פתוחות ובעיות ידועות

### 10.1 משימות פתוחות (בתהליך)

- **דומיין חדש:** `ziratadrichalut.co.il` פעיל (2026-04-19). זון ב-Cloudflare activated, DNS פורסם, SSL הונפק, 301 redirects מ-`ziratadrichal.co.il` עובדים. Google Search Console אומת.
- **Resend domain verification:** להוסיף את `ziratadrichalut.co.il` ל-Resend → Auto configure → אימות → עדכון `FROM_EMAIL` ב-Vercel → Redeploy.
- **Google OAuth verification:** ממתין לתשובה מ-Google. כל המסמכים מוכנים ב-`docs/google-verification/`.

### 10.2 בעיות ידועות

- `next.config.mjs` מגדיר `typescript.ignoreBuildErrors=true` ו-`eslint.ignoreDuringBuilds=true` — שגיאות TS לא עוצרות build. כדאי לתקן בעתיד.
- `morning-digest` ו-`reminders` — קוד קיים ב-`/api/cron/*` אבל לא מתוזמן ב-`vercel.json`.
- **פונט עברי ב-PDF** — דורש טעינת CMap ו-standard fonts ב-pdf-lib.
- **Supabase packages** מותקנים אבל לא בשימוש פעיל.

### 10.3 נקודות תחזוקה קריטיות

- **CRON_SECRET:** חובה להגדיר. בלי זה, ה-crons ב-Vercel יכשלו.
- **AUTH_SECRET:** אסור להחליף ברוטציה — כל המשתמשים יאבדו session.
- **ENCRYPTION_KEY:** 32 bytes hex. משמש להצפנת טוקני תשלום. אסור לאבד.
- **iCount webhooks:** חייבים idempotency דרך `icountEventId`.
- **Prisma client path:** מיוצר ל-`src/generated/prisma` (לא `@prisma/client`). imports חייבים לכוון לשם.

---

## 11. המלצות למפתח / AI ממשיך

### 11.1 סדר קריאה מומלץ לקוד חדש

1. `prisma/schema.prisma` — להבין את מודל הנתונים
2. `src/middleware.ts` — תפקידי משתמש ואכיפה
3. `src/lib/auth.ts` — זרימת אימות ו-session
4. `src/app/layout.tsx` — שורש האפליקציה, פונטים, metadata
5. `src/app/designer/[id]/page.tsx` — הדשבורד המרכזי של המעצבת
6. `src/app/admin/page.tsx` — הדשבורד של המנהלת
7. `src/app/api/` — לפי הצורך

### 11.2 מוסכמות קוד

- **עברית קודם:** כל ה-strings ב-UI ובהערות — עברית. אנגלית רק למונחים טכניים.
- **RTL:** כל ה-CSS/Tailwind נבנה ל-RTL. אל תשנה dir ברמת גוף.
- **Color palette:** gold (`#C9A84C`) = accent, bg כהה (`#0a0a0a`), muted (`#888`).
- **קומיטים:** פורמט conventional commits בעברית — feat/fix/docs/chore/refactor.
- **Prisma client path:** imports מ-`@/generated/prisma` או `@/lib/prisma` לא מ-`@prisma/client`.
- **Auth strategy:** לא NextAuth! כל endpoint שצריך auth משתמש ב-`getSession()` או בודק `x-user-id` header.

### 11.3 אנשי קשר

- **ישראל גולדשמיד** — בעלים
- **תמר** — מנהלת קהילה, Admin יחיד
- **שירותים חיצוניים:** Vercel, Cloudflare, iCount, Resend, Internic (רשם דומיין), Green API

### 11.4 הנחיות חשובות לעדכון קוד

- אל תמחק מודל Prisma בלי migration plan. יש יחסים רבים.
- אל תשנה את `AUTH_SECRET`. זה יתנתק את כל המשתמשים.
- בטסטים של חתימת חוזה — תמיד תוודא שה-PDF נשמר ב-R2.
- הוספת cron חדש — תוסיף ל-`vercel.json` תחת `"crons": [...]`. תוודא `CRON_SECRET` בקריאה.
- שינוי schema של טבלה עם משתמשים — תחשוב על backfill + זמן ריצה (7s timeout ב-Vercel).
- Upload תמונות — דרך Cloudinary או R2 (`src/lib/r2.ts` או `src/lib/cloudinary.ts`). לא לשמור binary ב-DB.

---

## 12. הפניות מהירות

### 12.1 URLs

| שם | URL |
|---|---|
| האתר בפרודקשן | https://zirat-design.vercel.app |
| Vercel Dashboard | https://vercel.com/israel-goldschmids-projects/zirat-community |
| Cloudflare | https://dash.cloudflare.com/1c3c54d888a62522369b22aff4216552 |
| Resend | https://resend.com/domains |
| Internic | https://panel.interspace.net/ |
| iCount | https://app.icount.co.il |

### 12.2 קבצים שכדאי לדעת

| קובץ | תיאור |
|---|---|
| `prisma/schema.prisma` | סכמת DB — 79 מודלים |
| `src/middleware.ts` | אכיפת תפקידים, headers בטיחות |
| `src/lib/auth.ts` | login/register/reset-password |
| `src/lib/email.ts` | תבניות מייל + `sendEmail()` |
| `src/lib/contract-pdf.ts` | יצירת PDF חוזים חתומים |
| `src/lib/subscription-dunning.ts` | לוגיקת dunning מנויים |
| `src/lib/subscription-ops.ts` | פעולות מנוי (pause/cancel/change-plan) |
| `vercel.json` | cron jobs + headers |
| `next.config.mjs` | הגדרות build |
| `tailwind.config.ts` | פלטת צבעים + shadcn config |
| `docs/email-setup*.md` | מדריך להגדרת Resend |
| `docs/google-verification/` | מסמכי אימות Google OAuth |

### 12.3 פקודות Git שימושיות

```bash
git log --oneline -n 20              # 20 קומיטים אחרונים
git log --all --oneline --graph      # עץ קומיטים
git diff HEAD~1                      # שינוי מהקומיט הקודם
git blame src/lib/email.ts           # מי ומתי שינה שורה
```

---

## סוף המסמך

המסמך מכסה 100% מהמבנה הטכני של הפרויקט. לפרטים נוספים — הסתכל בקוד. המבנה בכוונה שומר על הפרדת תחומים: אימות, CRM, מנויים, WhatsApp, קהילה — כל אחד בקובץ/תיקייה נפרדים.

© 2026 זירת האדריכלות — נבנה ע"י ישראל גולדשמיד ותמר.
