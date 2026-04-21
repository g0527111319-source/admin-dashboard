# SPEC: 3D Viewer + Annotations Feature

**נוצר:** 2026-04-21
**סטטוס:** מאושר לבנייה, טרם התחיל
**עדיפות:** גבוהה — משנה כללי משחק בשוק הישראלי

---

## 🎯 מטרה

מעצבת פנים מעלה מודל 3D של פרויקט. הלקוחה רואה אותו בדפדפן, מסתובבת בחלל, מניחה "pins" עם שאלות/הערות במיקום מדויק במרחב. המעצבת מקבלת notification, עונה, ויש thread תקשורת מעוגן למיקום פיזי ב-3D.

**למה זה משנה כללי משחק:** אין היום בישראל פלטפורמה עם חוויה כזו. כל התקשורת היום היא וואטסאפ + צילומי מסך → כאוס.

---

## 📐 החלטות ארכיטקטורה (כבר סגור — אל תשנה בלי אישור)

### 1. פורמטי קלט
המערכת מקבלת:
- **glTF / GLB** (מועדף — native three.js)
- **IFC** (Revit, ArchiCAD) — ממירים ל-glTF
- **OBJ + MTL** (AutoCAD, Rhino, SketchUp) — ממירים
- **FBX** — ממירים
- **Collada (.dae)** — ממירים

**כל הקבצים מומרים server-side ל-glTF דחוס Draco + Meshopt.** הלקוחה רואה רק glTF קל.

### 2. אחסון: **Cloudflare R2** — לא UploadThing!
הפרויקט כבר משתמש ב-R2 לכל האחסון (תמונות, לוגו, hero). חובה להישאר עם R2:
- Egress חינם (ענק — IFC 50MB × 10 צפיות = 500MB bandwidth לפרויקט)
- אותו auth, אותה תשתית
- עלות ~$0.015/GB/חודש

ENV vars קיימים (בדוק ב-Vercel + `.env`):
```
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
```

### 3. עלויות (מחושב ל-1000 מעצבות × 3 פרויקטים × 3 חודשי אחסון)
- Storage (60GB): $0.90/חודש
- Operations: $0.30/חודש
- Egress: $0 (R2 חינם)
- המרה (Vercel Function): ~$15/חודש
- **סה"כ: ~$17/חודש ל-1000 משתמשות**

**תמחור ללקוח:** Basic ₪49/חודש (3 פרויקטים) — מרווח 99%+

### 4. Rendering stack
- `three` (v0.160+)
- `@thatopen/components` (רק לפירוק IFC server-side)
- `three/examples/jsm/loaders/GLTFLoader`
- `three/examples/jsm/loaders/DRACOLoader`
- `three/examples/jsm/controls/OrbitControls`

**Dynamic import חובה** — three.js = ~600KB, לא ב-main bundle.

### 5. Polling (לא WebSockets)
SWR עם `refreshInterval: 10000` על annotations+comments. Vercel serverless לא אוהב WebSockets.

### 6. Pins אפמריים (החלטת מוצר מרכזית!)
TTL לפי סטטוס:
| סטטוס | חיים |
|--------|------|
| שאלה פתוחה | 24h |
| המעצבת ענתה | +48h |
| נפתרה | נמחק מיד |
| סומן 📌 חשוב | עד סוף הפרויקט |
| Pin ללא שאלה | כל הפרויקט |

Cron job ב-Vercel (`/api/cron/cleanup-annotations`) רץ כל שעה, מוחק לפי `expiresAt`.

### 7. עיצוב: **Ivory Blinds — לא dark mode!**
- רקע canvas: `#FAFAF8` עם grid עדין `#E5E1D4`
- Pins: `#C9A84C` (זהב), ring פעיל מפעם
- UI controls: floating cream cards עם shadow, אייקונים `#8B6914` (זהב-dim)
- Comment drawer: ימין, Frank Ruhl Libre לכותרות, Heebo לטקסט
- Status badges: ירוק מינט `#B8D4B8` ל-resolved

---

## 🗄️ Prisma Schema (פאזה 1)

```prisma
enum AnnotationStatus {
  OPEN
  ANSWERED
  RESOLVED
  PINNED
}

model Model3D {
  id              String   @id @default(cuid())
  projectId       String
  project         DesignerProject @relation(fields: [projectId], references: [id], onDelete: Cascade)
  originalUrl     String   // R2 URL של הקובץ המקורי
  originalFormat  String   // "ifc" | "glb" | "obj" | "fbx" | "dae"
  originalSize    Int      // bytes
  gltfUrl         String?  // אחרי המרה
  gltfSize        Int?
  conversionStatus String  @default("pending") // pending | processing | ready | failed
  conversionError String?
  thumbnailUrl    String?  // screenshot ראשוני
  expiresAt       DateTime // 3 חודשים מהעלאה
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  annotations     Annotation[]

  @@index([projectId])
  @@index([expiresAt])
}

model Annotation {
  id          String   @id @default(cuid())
  modelId     String
  model       Model3D  @relation(fields: [modelId], references: [id], onDelete: Cascade)
  // position במרחב (world coords)
  posX        Float
  posY        Float
  posZ        Float
  // normal של המשטח (לכיוון הסיכה)
  normX       Float
  normY       Float
  normZ       Float
  label       String?  // כותרת קצרה
  question    String?  // שאלה מלאה
  status      AnnotationStatus @default(OPEN)
  createdBy   String   // client email או designer id
  createdByType String // "client" | "designer"
  expiresAt   DateTime // לפי רול ה-TTL
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  comments    AnnotationComment[]

  @@index([modelId])
  @@index([expiresAt])
  @@index([status])
}

model AnnotationComment {
  id            String   @id @default(cuid())
  annotationId  String
  annotation    Annotation @relation(fields: [annotationId], references: [id], onDelete: Cascade)
  body          String
  authorType    String   // "client" | "designer"
  authorName    String
  authorEmail   String?
  createdAt     DateTime @default(now())

  @@index([annotationId])
}
```

**חובה:** `npx prisma db push` (הפרויקט לא משתמש ב-migrations folder).

---

## 🛣️ API Routes (פאזה 2)

### Designer-side (auth נדרש)
```
POST   /api/crm/models/upload         → presigned R2 URL
POST   /api/crm/models                → צור Model3D אחרי upload
GET    /api/crm/models?projectId=X   → רשימה
DELETE /api/crm/models/[id]           → מחק ידנית
POST   /api/crm/annotations/[id]/reply → המעצבת עונה
PATCH  /api/crm/annotations/[id]      → שינוי status (resolve / pin)
```

### Public-side (ללקוחה, via shareable link)
```
GET    /api/public/models/[id]              → metadata + gltfUrl
GET    /api/public/models/[id]/annotations  → רשימת pins פעילים
POST   /api/public/models/[id]/annotations  → הוסף pin + שאלה
POST   /api/public/annotations/[id]/comments → הוסף תגובה ב-thread
```

### Cron
```
GET    /api/cron/cleanup-annotations  → מוחק expired (protected by CRON_SECRET)
```

Vercel `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/cron/cleanup-annotations", "schedule": "0 * * * *" }
  ]
}
```

---

## 📦 המרת קבצים Server-side (פאזה 2)

**הבעיה:** IFC parsing דורש RAM + CPU. Vercel Function יש לה 10s timeout ב-Hobby, 60s ב-Pro, 900s ב-Pro with Fluid Compute.

**האסטרטגיה:**
1. Upload → R2 ישירות (presigned URL, לא דרך השרת)
2. Designer יוצר `Model3D` עם `conversionStatus: "pending"`
3. מפעיל `/api/crm/models/[id]/convert` (background job)
4. Function טוענת מ-R2, ממירה, מעלה glTF דחוס חזרה
5. Update status ל-"ready" + שולח notification למעצבת

**ספריות המרה:**
- IFC → glTF: `web-ifc` + `three/examples/jsm/exporters/GLTFExporter`
- OBJ/FBX/DAE → glTF: `gltf-transform` CLI או Node API
- Draco: `gltf-pipeline` (npm)

**חלופה אם Vercel לא מספיק:** Cloudflare Worker עם Durable Object, או VPS קטן ($5/חודש) עם queue.

---

## 🎨 UI Components (פאזה 3-5)

### Designer side
- `src/app/crm/[id]/models/page.tsx` — רשימת מודלים לפרויקט
- `src/app/crm/[id]/models/[modelId]/page.tsx` — צפייה + ניהול annotations
- `src/components/crm/ModelUploadZone.tsx` — drag&drop
- `src/components/crm/ModelConversionStatus.tsx` — progress

### Client side (public)
- `src/app/share/model/[token]/page.tsx` — צפייה ציבורית (token יחיד לכל שיתוף)
- `src/components/viewer/ThreeDViewer.tsx` — הcanvas
- `src/components/viewer/PinOverlay.tsx` — pins HTML מעל ה-canvas
- `src/components/viewer/AnnotationDrawer.tsx` — side panel
- `src/components/viewer/PinPlacementMode.tsx` — כניסה/יציאה ממצב הנחה

### Viewer behavior
- OrbitControls (סיבוב, זום, פאן)
- Double-click on surface → raycasting → place pin
- Click pin → open drawer
- Timer badge על כל pin ("⏱ 8h")
- Mobile: pinch-zoom, two-finger pan, tap-hold to place pin

---

## 📋 פאזות יישום

### ✅ פאזה 1 — Backend foundations (2 ימים)
- [ ] עדכון `prisma/schema.prisma` (3 models חדשים)
- [ ] `npx prisma db push`
- [ ] `/api/crm/models/upload` (presigned R2)
- [ ] `/api/crm/models` (CRUD)
- [ ] בדיקה ידנית עם Postman/curl

### פאזה 2 — Conversion pipeline (3 ימים)
- [ ] התקנת `web-ifc`, `gltf-transform`
- [ ] `/api/crm/models/[id]/convert` route
- [ ] Draco compression
- [ ] Upload glTF חזרה ל-R2
- [ ] Update status + send email to designer

### פאזה 3 — Viewer component (3 ימים)
- [ ] Dynamic import של three.js
- [ ] `ThreeDViewer.tsx` עם OrbitControls + DRACOLoader
- [ ] Lighting setup (ambient + directional)
- [ ] Loading states
- [ ] Mobile controls

### פאזה 4 — Pin placement + raycasting (2 ימים)
- [ ] Raycaster על double-click
- [ ] שמירת position+normal ב-annotation
- [ ] HTML overlay שמציב pins לפי projection
- [ ] `PinOverlay.tsx` — הסתרה מאחורי קירות

### פאזה 5 — Annotation threading (2 ימים)
- [ ] `AnnotationDrawer.tsx`
- [ ] SWR polling כל 10s
- [ ] שליחת תגובה
- [ ] Status changes (resolve / pin)
- [ ] Timer UI

### פאזה 6 — Public share + cron (2 ימים)
- [ ] Shareable token generation
- [ ] `/api/cron/cleanup-annotations`
- [ ] `vercel.json` cron config
- [ ] Email notifications למעצבת
- [ ] Final QA

**סה"כ: 14 ימים**

---

## 🚨 כללי ברזל לסשן הבא

1. **אל תיגע ב-lib/email.ts, middleware, auth, Stripe** — כלל ברזל של הפרויקט (ראה CLAUDE.md)
2. **אל תעבור ל-UploadThing** — R2 בלבד
3. **אל תעשה dark mode** — Ivory Blinds בלבד
4. **אל תבנה WebSockets** — SWR polling בלבד
5. **`npx prisma db push`, לא migrations** — אין בפרויקט `prisma/migrations/`
6. **דיבאג על `npm run build` + `npx tsc --noEmit` לפני commit**
7. **RTL + עברית לכל UI text**
8. **שאל את המשתמש בכל ספק** — אל תנחש

---

## 📚 ספריות שצריך להתקין

```bash
npm install three @types/three
npm install @thatopen/components
npm install web-ifc
npm install gltf-transform
npm install @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions
npm install swr   # אם עוד לא מותקן
```

---

## 🎯 Definition of Done

הפיצ'ר נגמר כשמעצבת יכולה:
1. להעלות קובץ IFC/glTF בדף פרויקט
2. לראות sprinter progress של המרה
3. לקבל link שיתוף
4. לשלוח את ה-link ללקוחה (WhatsApp, email)
5. הלקוחה פותחת בטלפון או דסקטופ, רואה מודל תלת מימד
6. הלקוחה מסובבת, מזמינה, מניחה pin, כותבת "מה זה הקיר הזה?"
7. המעצבת מקבלת email "יש שאלה חדשה"
8. המעצבת עונה דרך ה-CRM
9. הלקוחה רואה את התשובה תוך 10s (polling)
10. הלקוחה מסמנת "נפתר" → pin נעלם
11. אחרי 3 חודשים — המודל נמחק אוטומטית

---

## 💡 רעיונות לעתיד (לא בסקופ הנוכחי)

- VR/AR mode (WebXR)
- מדידות במודל (ruler tool)
- שינוי חומרים בלייב (לקוחה רואה קיר אחר)
- לפני/אחרי (שני מודלים זה לצד זה)
- סרטון walkthrough אוטומטי
- export ל-PDF עם pins
