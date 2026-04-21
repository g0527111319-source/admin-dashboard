# 📖 Handoff לסשן הבא — זירת האדריכלות

**נוצר:** 2026-04-21
**מטרת הקובץ:** לתת לסשן הבא של Claude את כל הקונטקסט שהצטבר עד כה בלי לקרוא את כל הסשנים הקודמים.

---

## 🚀 איך להתחיל את הסשן הבא

**פתיחה מומלצת:**
> "קרא את CLAUDE.md, HANDOFF-NEXT-SESSION.md, ו-SPEC-3D-VIEWER.md. אחרי זה התחל בפאזה 1 של SPEC-3D-VIEWER.md."

**מודל מומלץ:** `high` (או `max` לדיבאג raycasting בפאזה 4)

**ראש קטן:** אל תקרא את כל הקוד. קרא את הקבצים למטה לפי הצורך.

---

## 🏢 מה זה הפרויקט

**זירת האדריכלות** — קהילת מעצבות פנים ואדריכליות בישראל. Marketplace + CRM + אירועים + לידים.

- **URL:** https://www.ziratadrichalut.co.il
- **משתמשים:** מעצבות פנים (customers משלמות), לקוחות (free, נחשפים דרך לידים)
- **מודל עסקי:** subscription חודשי למעצבות (Stripe)
- **שפה:** עברית RTL מלאה, UI בעברית, קוד/משתנים באנגלית
- **פלטפורמות:** Web + PWA + TWA (Android via Google Play)

---

## 🛠️ סטאק טכני

| שכבה | טכנולוגיה |
|------|-----------|
| Framework | Next.js 14.2.35 App Router |
| UI | React 18, TypeScript (strict), Tailwind CSS, Framer Motion |
| DB | Prisma + PostgreSQL (Neon) |
| Auth | Session-based + Google OAuth |
| Email | Resend |
| Payments | Stripe (subscriptions) |
| Storage | **Cloudflare R2** (לא UploadThing!) |
| Hosting | Vercel (auto-deploy מ-main) |
| PWA | Service Worker + manifest, TWA for Android |

---

## 🎨 מערכת עיצוב — "Ivory Blinds"

**הוחלט בסשן הקודם** שכל האתר עובר רענון לפלטה הזו:

```
--cream:     #FAFAF8   (רקע ראשי)
--cream-2:   #F5F1E8   (surfaces משניים)
--gold:      #C9A84C   (CTA, accents, pins)
--gold-dim:  #8B6914   (טקסט secondary, icons)
--ink:       #1A1A1A   (טקסט ראשי)
--line:      #E5E1D4   (borders, dividers)
```

**Typography:**
- Headings: **Frank Ruhl Libre** (serif, יוקרתי)
- Body: **Heebo** (RTL-first)
- Labels/UI: **Rubik**

**עקרונות:**
- generous whitespace
- subtle shadows ולא gradients חזקים
- animations עדינים (Framer Motion)
- RTL חובה על כל container

---

## 📂 מבנה פרויקט חשוב

```
src/
├── app/
│   ├── page.tsx                      → homepage
│   ├── login/, register/             → auth flows
│   ├── designer/[id]/page.tsx        → designer dashboard (מורכב!)
│   ├── crm/[id]/                     → CRM למעצבת (leads, clients, calendar, projects)
│   ├── projects/                     → גלריית פרויקטים ציבורית
│   │   ├── page.tsx                  → server entry + SEO
│   │   ├── ProjectsGalleryClient.tsx → interactive
│   │   └── [id]/                     → פרויקט בודד
│   ├── card/[id]/                    → business card ציבורי
│   ├── admin/                        → panel למנהל
│   ├── share-target/                 → Android share receiver
│   └── api/
│       ├── auth/google/              → OAuth flow (אל תיגע!)
│       ├── stripe/                   → webhooks (אל תיגע!)
│       ├── designer/crm/             → CRM endpoints
│       └── public/                   → endpoints לאורחים
├── components/
│   ├── crm/                          → CrmPortfolio.tsx (1462 שורות!), CrmLeads, וכו'
│   ├── gallery/                      → MasonryGallery, Lightbox, BeforeAfterSlider
│   └── ui/                           → atoms משותפים
├── lib/
│   ├── prisma.ts                     → singleton client
│   ├── email.ts                      → Resend wrappers (אל תיגע!)
│   ├── r2.ts                         → R2 client + presigned URLs
│   └── auth.ts                       → session helpers (אל תיגע!)
└── middleware.ts                     → auth guards (אל תיגע!)
```

---

## 🗄️ Prisma Schema — מודלים מרכזיים

ממוקם ב-`prisma/schema.prisma`. אל תנסה לשנות בלי לקרוא את כל הקובץ.

**Models חשובים:**
- `Designer` — מעצבת (user הראשי)
- `DesignerCrmSettings` — preferences + `portfolioHeroImageUrl` (הוספנו בסשן הקודם)
- `DesignerProject` — פרויקט (status: public/private)
- `DesignerProjectImage` — תמונות (caption, sortOrder, thumbnail, dimensions)
- `Lead` — ליד נכנס (יש שדה `source` לtracking UTM)
- `CrmClientRecommendation` — המלצות (יש `isPublic`)
- `BusinessCard` — כרטיס ביקור דיגיטלי
- `CrmClient`, `CrmTask`, `CrmEvent`, `CrmNote`, `CrmInvoice` — CRM internals

**נוסיף בפיצ'ר הבא (ראה SPEC-3D-VIEWER.md):**
- `Model3D`
- `Annotation`
- `AnnotationComment`
- enum `AnnotationStatus`

---

## 🚨 כללי ברזל — אסור לגעת!

### ❌ לעולם אל תשנה:
1. `src/app/api/auth/**` — Google OAuth
2. `src/app/api/stripe/**` — webhooks
3. `src/lib/email.ts`, `src/lib/auth.ts`, `src/lib/prisma.ts`
4. `src/middleware.ts`
5. `prisma/schema.prisma` — רק הוספה, לא שינוי קיים
6. `public/sw.js`, `public/manifest.json` — PWA
7. `public/.well-known/assetlinks.json`, `twa/**` — TWA
8. `public/icons/**` — נגזר אוטומטית
9. `.env*` files

### ❌ אל תעשה:
- `git push --force` או `--amend`
- למחוק רשומות מה-DB בלי אישור
- לשנות props קיימים של קומפוננטה (רק optional additions)
- לעבור מ-R2 ל-UploadThing
- לבנות dark mode (הפלטה היא Ivory Blinds בהיר)
- לבנות WebSockets (SWR polling במקום)

### ✅ מותר:
- לעצב מחדש `src/app/**/page.tsx` (UI בלבד, לא state/fetch)
- להוסיף קומפוננטות חדשות ב-`src/components/`
- להוסיף models חדשים ל-Prisma (additive)
- `npx prisma db push` (אין migrations folder)
- לעצב את `globals.css`, `tailwind.config.ts`

---

## 🧪 workflow חובה לפני כל commit

```bash
npm run build          # חייב לעבור
npx tsc --noEmit       # אפס שגיאות TS
npm run lint || true   # עדיף בלי errors חדשים
```

**בנוסף, QA ידני אחרי שינוי UI:**
- [ ] אין שגיאות בקונסול
- [ ] לינקים עובדים
- [ ] טפסים נשלחים
- [ ] Responsive (375 / 768 / 1280)
- [ ] RTL תקין

---

## 📝 מה נעשה בסשנים האחרונים (אפריל 2026)

### 1. Portfolio Wireframe Match (commit `0d764d1`)
- כתיבה מחדש של 3 דפי portfolio לפי wireframes
- `CrmPortfolio.tsx`, `projects/page.tsx`, `projects/[id]/page.tsx`

### 2. Public Portfolio Polish — 16 פיצ'רים (commit `02be9f8`)
- מחיקת נתוני דמו
- עורך תמונות ב-CRM (crop, rotate, flip, zoom)
- Publish/Share עם UTM
- Lead capture מחזק
- Source tracking ברשימת לידים

### 3. 7 שדרוגים נבחרים (commit `2b8d07c`)
מתוך 20 שהצעתי, המשתמש אישר: #4, #5, #10, #14, #16, #17, #18
- SEO improvements (JSON-LD schema.org/Person)
- BeforeAfterSlider component
- Bulk edit ב-CRM
- PWA share target (Android)
- Preconnect hints
- Masonry + next/image migration

### 4. באג פיקסים (commit `b430e86`)
- Business card link 404 → תוקן מ-`/business-card/` ל-`/card/`
- Masonry grid collapse → `break-inside-avoid` על wrapper החיצוני
- הוספת hero image upload ל-portfolio

### 5. החלטה על הפיצ'ר הבא: 3D Viewer (בלי commit עדיין)
- עבר דיון מעמיק על pros/cons
- הוחלט ללכת עליו עם התאמות:
  - R2 ולא UploadThing
  - Ivory Blinds ולא dark mode
  - Pins אפמריים (TTL 24h-48h)
  - Multi-format support (IFC + glTF + OBJ + FBX + DAE)
  - המרה server-side ל-glTF+Draco
  - תמחור ₪49/חודש, מרווח 99%

---

## 🎯 מצב נוכחי — פאזות 1+2+3+4 הושלמו

### ✅ פאזה 1 (Prisma + R2 upload)
- Models: `Model3D`, `Annotation`, `AnnotationComment` + enum `AnnotationStatus`
- `npx prisma db push` הורץ בהצלחה על Neon
- `/api/designer/crm/models/presign` — presigned R2 URL (500MB ceiling, 6 פורמטים)
- `/api/designer/crm/models` — GET (list) + POST (create)
- `/api/designer/crm/models/[id]` — GET + DELETE (cascade ל-R2)

### ✅ פאזה 2 (Annotations + Cron)
- `/api/public/models/[token]` — client-facing model fetch
- `/api/public/models/[token]/annotations` — GET + POST (client מניחה pin, email אוטומטי למעצבת)
- `/api/public/annotations/[id]/comments` — client-side reply ב-thread
- `/api/designer/crm/annotations` — inbox למעצבת
- `/api/designer/crm/annotations/[id]` — PATCH (שינוי status) + DELETE
- `/api/designer/crm/annotations/[id]/reply` — designer reply (flip ל-ANSWERED, TTL+48h)
- `/api/cron/cleanup-annotations` — hourly sweep (annotations + expired models + R2)
- `src/lib/annotation-ttl.ts` — TTL rules helper
- `vercel.json` — cron schedule `0 * * * *` נוסף

### ✅ פאזה 3 (Viewer + UI) — נוסף בסשן הזה
- `three@latest` + `@types/three` + `swr` הותקנו
- `src/components/viewer/ThreeDViewer.tsx` — canvas, OrbitControls, GLTFLoader+DRACO (מ-gstatic CDN), raycaster, lazy dynamic imports, placement mode, ref handle ל-projectToScreen + isPointOccluded
- `src/components/viewer/PinOverlay.tsx` — HTML pins על ה-canvas, imperative DOM per-frame (לא React re-render), occlusion fade, timer badge, status colors
- `src/components/viewer/AnnotationDrawer.tsx` — side drawer עם thread, reply, סטטוס-actions למעצבת, inputs ללקוחה
- `src/app/projects/3d/[token]/page.tsx` — server SEO metadata (noindex כי הtoken סודי)
- `src/app/projects/3d/[token]/ViewerClient.tsx` — client wiring: SWR polling כל 10s, pin placement dialog, name persistence ב-localStorage
- `src/app/designer/[id]/models/page.tsx` — upload (presign → PUT R2 → POST /models), list, copy share link, delete

**TypeScript: 0 שגיאות. DB synced. Cron rule registered. GLB/glTF/OBJ עובדים end-to-end עם Draco.**

---

### ✅ פאזה 4 (Conversion pipeline) — נוסף בסשן הזה
- הותקנו: `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions`, `draco3dgltf`, `obj2gltf`
- `src/lib/model-convert.ts` — מנוע המרה:
  - **glb/gltf**: Draco-optimize (dedup + weld + draco)
  - **obj**: obj2gltf → glb → Draco
  - **ifc/fbx/dae**: `UnsupportedFormatError` עם הודעה ברורה בעברית
- `src/app/api/designer/crm/models/[id]/convert/route.ts` — orchestration:
  - Ownership check, download מ-R2, המרה, upload חזרה ל-R2, עדכון DB
  - `maxDuration = 300` (5 דקות; חייב Vercel Pro/Fluid Compute)
  - Fail path: status=failed + error message, ה-original נשמר
- `POST /models` עודכן: fire-and-forget של `/convert` עם cookie forwarding
- `src/types/model-convert.d.ts` — ambient types ל-draco3dgltf ו-obj2gltf
- UI של models page עודכן: "פורמטים נתמכים: GLB, glTF, OBJ, IFC · עד 500MB"

### ✅ פאזה 5 — חלק ראשון (IFC + dashboard link + thumbnails) — נוסף בסשן הזה
- `convertIfc()` ב-`src/lib/model-convert.ts` — web-ifc WASM → StreamAllMeshes → CPU-side transform → color-bucketed primitives → @gltf-transform Document → Draco.
- `IfcAPI.Init(undefined, true)` (single-thread; serverless-friendly).
- `COORDINATE_TO_ORIGIN: true` כדי שהמודל יהיה סביב origin אחרי המרה (מועיל ל-auto-fit בviewer).
- קישור מה-dashboard (`src/app/designer/[id]/page.tsx`) ל-`/designer/[id]/models` דרך entry חדש בקבוצת "עיצוב" בסיידבר (עם `href` optional על NavGroup item).
- **Thumbnail generation:**
  - `captureThumbnail(maxWidth, quality)` ב-`ThreeDViewerHandle` — render→downscale→`toBlob("image/jpeg")`.
  - `WebGLRenderer` הוגדר עם `preserveDrawingBuffer: true` כדי ש-toBlob יחזיר פיקסלים אמיתיים.
  - `POST /api/public/models/[token]/thumbnail` — first-write-wins, magic-byte validation (JPEG/PNG), 300KB cap, rate-limited 30/שעה לפי IP.
  - `ViewerClient` מפעיל capture 600ms אחרי loadComplete, רק אם אין כבר `thumbnailUrl`.
  - דף הדשבורד של המודלים מציג thumbnail (88×66) לצד כל רשומה.

---

## ⚠️ מה שעדיין חסר (פאזה 5 — המשך Polish)

### 1. 🟡 FBX support
אין פתרון pure-JS טוב. אפשרויות:
- Client-side: OBJLoader/FBXLoader של three בדפדפן, export ל-glTF, upload חזרה
- Binary: `fbx2gltf` של Facebook (צריך container)
- המלצה: השאר unsupported, תבקש מהמשתמש לייצא ל-glTF מ-3ds Max

### 3. ✅ Thumbnail generation — בוצע (client-side)
capture אחרי `onLoadComplete` → JPEG 512 max → POST ל-`/api/public/models/[token]/thumbnail`. first-write-wins.

### 4. ✅ Designer dashboard link — בוצע
נוסף entry "מודלים תלת-ממדיים" בקבוצת "עיצוב" בסיידבר של הדשבורד (`src/app/designer/[id]/page.tsx`). ה-NavGroup item מקבל `href` אופציונלי ונתיב הוא `/designer/[id]/models`.

### 5. 🟡 ניקיון
- Mobile touch events — OrbitControls תומך native אבל כדאי לבדוק
- Content-Security-Policy של `https://www.gstatic.com/draco/` (אם יש)
- Rate limit על convert route (כרגע לא מוגבל)
- בדיקה עם `npm run build` (נעשה רק `tsc --noEmit`)

---

## 🧪 איך לבדוק ידנית עכשיו

אפשר לבדוק שהכל עובד גם בלי viewer:

```bash
# 1. Sign-in כמעצבת, גש לפרויקט קיים, קח את ה-projectId
# 2. Presign:
curl -X POST http://localhost:3000/api/designer/crm/models/presign \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=..." \
  -d '{"filename":"test.glb","contentType":"model/gltf-binary","size":5000000,"projectId":"<ID>"}'

# 3. העלה קובץ GLB קטן ל-uploadUrl שהוחזר (PUT)
# 4. צור רשומה:
curl -X POST http://localhost:3000/api/designer/crm/models \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=..." \
  -d '{"projectId":"<ID>","originalUrl":"...","originalR2Key":"...","originalFormat":"glb","originalSize":5000000}'

# 5. קח את shareToken מהתגובה → פתח /api/public/models/<token>
# 6. הוסף annotation:
curl -X POST http://localhost:3000/api/public/models/<token>/annotations \
  -H "Content-Type: application/json" \
  -d '{"posX":0,"posY":1,"posZ":0,"normX":0,"normY":1,"normZ":0,"question":"בדיקה","clientName":"דוד"}'

# 7. cron test:
curl http://localhost:3000/api/cron/cleanup-annotations \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 🔐 ENV Variables (מאומת שקיימים ב-Vercel)

```
DATABASE_URL              → Neon PostgreSQL
DIRECT_URL                → Neon direct
NEXTAUTH_SECRET           → session
GOOGLE_CLIENT_ID          → OAuth
GOOGLE_CLIENT_SECRET      → OAuth
RESEND_API_KEY            → email
STRIPE_SECRET_KEY         → payments
STRIPE_WEBHOOK_SECRET     → webhooks
R2_ACCOUNT_ID             → Cloudflare
R2_ACCESS_KEY_ID          → Cloudflare
R2_SECRET_ACCESS_KEY      → Cloudflare
R2_BUCKET_NAME            → bucket
R2_PUBLIC_URL             → CDN URL
NEXT_PUBLIC_SITE_URL      → https://www.ziratadrichalut.co.il
NEXT_PUBLIC_APP_URL       → same
CRON_SECRET               → Vercel crons (לאמת)
```

**אם חסר משהו לפיצ'ר החדש — בקש מהמשתמש להוסיף ב-Vercel ולריסטרט.**

---

## 🐛 באגים ידועים (בסיום הסשן הזה)

1. **Profile update clears fields** — עדכון פרופיל מעצבת מאפס שדות שעוברים כ-`undefined`. לא לפתור בסשן הזה, אבל אל תיצור בעיה דומה בטפסים חדשים. השתמש ב-`isDefined` helper.

---

## 📞 איך המשתמש מעדיף שתעבוד

1. **שאל לפני שאתה מנחש** — גם על דברים קטנים
2. **הצג תוכנית בפרוזה** לפני שכותב קוד
3. **עבוד דף/קומפוננטה אחת בכל פעם**
4. **commit בנפרד** לכל שינוי משמעותי
5. **screenshot אחרי UI changes** — שלח ובקש אישור
6. **כתוב הודעות commit באנגלית**
7. **תגובות בצ'אט בעברית**

---

## 🆘 אם משהו לא עובד

1. בדוק `CLAUDE.md` קודם (יש בו כללי ברזל)
2. בדוק את הקובץ הרלוונטי בפרויקט (אל תנחש מה יש בו)
3. אם עדיין לא ברור — **שאל את המשתמש, אל תנחש**
4. אם זה שבור ב-production — הודע למשתמש מיד, אל תנסה "לתקן" לבד

---

**בהצלחה! כל הידע צבור פה ו-ב-SPEC-3D-VIEWER.md. אין צורך לקרוא סשנים קודמים.**
