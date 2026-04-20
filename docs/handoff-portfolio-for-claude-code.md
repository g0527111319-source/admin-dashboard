# 🎨 Handoff — עמודי Portfolio · Claude Code

> מסמך מוסר מהסשן של Claude Design ל-Claude Code.
> עצמאי — מכיל את כל מה שצריך כדי להטמיע את 3 עמודי Portfolio ב-Ivory Blinds.

## סיכום — מה נוצר

3 HTML wireframes ב-**Ivory Blinds** שמיישמים את ה-tokens של `src/app/globals.css` 1:1 — `btn-gold`, `card-static`, `card-gold`, `badge-gold/green/gray/yellow`, `input-field`, `select-field`, `table-luxury`, טוקני צבע/רקע/טקסט/גבול/זהב.

| # | קובץ wireframe | מיפוי לקודבייס | תפקיד |
|---|---|---|---|
| 1 | `wireframes/portfolio-crm.html` | `src/components/crm/CrmPortfolio.tsx` | ניהול תיק עבודות — מה שהמעצבת רואה |
| 2 | `wireframes/portfolio-public.html` | `src/app/designers/[id]/page.tsx` או ה-public profile route | תיק עבודות ציבורי — מה שלקוחות רואים |
| 3 | `wireframes/portfolio-project.html` | `src/app/projects/[id]/page.tsx` | דף פרויקט יחיד ב-public |

---

## 1. `portfolio-crm.html` → `CrmPortfolio.tsx`

### מבנה (מלמעלה למטה)
1. **Page header** — breadcrumbs · כותרת "תיק העבודות שלי" + תת־כותרת · כפתור "צפייה כלקוח" (link לpublic route, target=_blank)
2. **KPI strip** — 4 כרטיסיות: פרויקטים · תמונות · צפיות · לייקים · כל אחת עם icon + delta
3. **Toolbar** — `card-static` דק: search · chips סטטוס (הכל/פורסם/טיוטה/בעבודה) · `select-field` מיון · view-toggle · `btn-gold` "+ פרויקט חדש"
4. **Projects grid** — 3 עמודות, כל כרטיס: cover + status badge + drag handle + 4 action buttons (hover overlay)
5. **Expanded project view** — `card-static` גדול עם: header strip · sidebar שדות (שם/קטגוריה/סגנונות chips/סטטוס/תיאור) · gallery grid עם dropzone + tiles עם cover-flag + overlay עריכה
6. **Tips panel** — `card-gold`-style עם רקע gradient זהב

### מיפוי className ישיר
```
hero/page bg       → bg-bg
card container     → card-static  (או bg-white + border + shadow-xs)
KPI card           → bg-bg-card + border-border-subtle + rounded-card
KPI icon circle    → bg-gold-50 text-gold
chip active        → bg-gold-50 text-[color:var(--gold-dim)] border-[color:var(--border-gold)]
chip idle          → bg-bg-surface text-text-secondary
drop-zone          → border-2 border-dashed border-border-subtle bg-bg-surface hover:border-gold hover:bg-gold-50
photo tile         → border border-border-subtle rounded-lg
photo overlay      → bg-white/85 backdrop-blur-sm (hover only)
delete icon        → text-red-600 (לא bg-black)
status בתוך card   → badge-green / badge-yellow / badge-gray
category chip      → badge-gold
style chip         → badge-gray
CTA primary        → btn-gold
CTA secondary      → btn-outline
modal wrapper      → bg-white border border-border-subtle rounded-2xl shadow-xl
```

### אינטראקציות לשמר (לא נגענו בהן)
- drag-to-reorder על project cards
- drag-to-reorder על photo tiles
- upload via dropzone
- edit-in-place modal per image
- cover flag toggle

---

## 2. `portfolio-public.html` → public designer profile

### מבנה
1. **Top nav** — fixed, blur, `bg-bg/85`
2. **Hero** — grid 1.1fr/.9fr: עמודה טקסט (eyebrow chip · h1 ב-Frank Ruhl Libre עם em זהב · tagline · meta-line עם 3 פריטים · 3 CTAs) + עמודה תמונה (illustrated SVG room + 2 floating cards: rating + זמן תגובה)
3. **Bio strip** — שורה עם 4 עמודות: טקסט ביוגרפי + 3 סטטים (פרויקטים/שנים/דירוג)
4. **Filter bar** — kicker + h2 (Frank Ruhl Libre) + chips קטגוריה
5. **Masonry 3 columns** — 9 פרויקטים בגבהים מעורבים (cover-tall/med/short/wide), hover overlay לבן חצי-שקוף עם h3 + meta + "צפי בפרויקט" (לינק ל-project route)
6. **Testimonials section** — רקע gradient עדין `#FAFAF8 → #FBF7ED`, grid 3 כרטיסים עם quote mark גדול וחצי-שקוף
7. **CTA block** — gradient זהב `#FBF7ED → #F5ECD3`, grid 1.3/1 עם טקסט + `contact-mini` (טופס פנייה מהיר)
8. **Footer**

### מיפוי className
```
hero bg            → bg-gradient-to-b from-gold-50 to-bg
hero eyebrow       → bg-white/60 border-[color:var(--border-gold)] text-[color:var(--gold-dim)]
h1                 → font-frank-ruhl (אם טעון) · או fallback font-heading
h1 em              → italic text-[color:var(--gold-dim)]
floating card      → bg-white rounded-2xl shadow-lg border-border-subtle
rating stars       → text-gold (fill)
bio-strip          → bg-bg-card border-y border-border-subtle
chip filter active → bg-gold-50 border-[color:var(--border-gold)] text-[color:var(--gold-dim)]
masonry            → CSS columns-3 gap-4 (tailwind: columns-3)
project-item       → break-inside-avoid, border, shadow-xs, hover shadow-lg + translate-y
overlay            → bg-white/85 backdrop-blur-sm (hover only)
testimonial card   → card-static + ::before gold quote
CTA block          → card-gold (אבל padding גדול יותר — 48px)
contact-mini       → bg-white rounded-2xl shadow-md + input-field
```

### ⚠️ שים לב
- Frank Ruhl Libre נטען מ-Google Fonts. ב-codebase כבר יש `--font-frank-ruhl` ב-layout.tsx, אז השתמש בו ישירות.
- `aspect-ratio:5/6` ב-`.hero-visual` דורש `width:100%` בתוך grid item. Tailwind: `w-full justify-self-end`.

---

## 3. `portfolio-project.html` → `src/app/projects/[id]/page.tsx`

### מבנה
1. **Top nav** — שונה מהציבורי: כפתור "חזרה לתיק העבודות" + מרכז לוגו + share/like
2. **Project header** — breadcrumbs · eyebrow "פרויקט נבחר" · h1 כותרת סיפורית · meta-row עם 5 פריטים (מיקום/שטח/שנה/נפשות/תקציב)
3. **Hero image** — aspect 16/9, rounded-2xl, shadow-lg, overlay tag "1 מתוך 14 תמונות"
4. **Designer pill** — צף עם `margin-top:-40px`, max-width 460px, ממורכז: avatar + שם + rating + "לפרופיל המלא"
5. **Body grid** — 1fr/300px: עמודת story (lead עם border-right זהב · h3-ים ב-Frank Ruhl · paragraphs) + sticky aside עם 2 spec cards (פרטי פרויקט + ספקים)
6. **Before/After block** — grid 2-עמודות, tags "לפני"/"אחרי"
7. **Gallery masonry** — 3 עמודות, גובה מעורב, zoom hint hover, cursor-zoom-in
8. **Process strip** — 4 עמודות: שיחה · סקיצה · ליווי · מפתחות · כל אחד עם icon ב-circle לבן
9. **Next project section** — `bg-bg-card`, grid 2 כרטיסים עם gradient overlay כהה ושם פרויקט על התמונה
10. **Floating CTA** — `fixed bottom-5 left-1/2 -translate-x-1/2`, pill עם btn-gold "שלחי פנייה"
11. **Footer**

### מיפוי className
```
project header eyebrow → text-[color:var(--gold-dim)] uppercase tracking-wider
project h1             → font-frank-ruhl font-medium
meta-row               → text-text-secondary, icons text-gold
hero image wrapper     → rounded-2xl overflow-hidden shadow-lg
designer-pill          → card-static מופחת padding + -mt-10 mx-auto max-w-md
story lead             → text-text border-r-[3px] border-gold pr-4
story h3               → font-frank-ruhl
spec-card              → card-static, label h4 → text-[color:var(--gold-dim)] uppercase
spec row border        → border-b border-border-subtle
ba-item                → rounded-card border border-border-subtle aspect-[4/3]
ba-tag "אחרי"          → bg-gold text-white
gallery item           → break-inside-avoid border border-border-subtle rounded-xl
process icon circle    → bg-white shadow-sm
next-card overlay      → bg-gradient-to-l from-black/55 to-black/10
floating CTA           → bg-white rounded-full shadow-lg border-border-subtle
```

---

## 4. חוקי ברזל (חוזרים על עצמם מה-brief הקודם)

| ❌ אסור | ✅ מותר |
|---|---|
| שינוי `onClick`, `onSubmit`, fetch, state keys | `className`, מבנה JSX (wrappers, grouping) |
| שינוי props של קומפוננטות | הוספת props אופציונליים חדשים |
| שינוי routes / URL params / שמות קבצים | className ו-JSX בלבד |
| מחיקת `aria-label` / `data-testid` / `role` | אפשר להוסיף |
| שינוי הטקסטים העבריים המילוליים | כלום |
| עריכת `src/app/api/**` או `src/lib/**` | לא נוגעים |
| `npm install` חדש | רק מה שקיים |

**כל hex ערכים inline שרואים בקוד הישן — מוחלפים:**
- `bg-[#0f0f1e]` / `bg-[#1a1a2e]` / `bg-[#0a0a0a]` → `bg-bg` או `bg-white`
- `text-white` → `text-text-primary`
- `text-white/80|70|60|50|40` → `text-text-secondary/muted/faint` בהתאם
- `border-white/10|5` → `border-border-subtle`
- `bg-[#C9A84C] text-black` → `btn-gold`
- `border border-[#C9A84C]/40 text-[#C9A84C]` → `btn-outline` או `text-gold border-[color:var(--border-gold)]`

---

## 5. סדר עבודה מומלץ

1. **קרא את שני ה-wireframes** (`portfolio-crm.html`, `portfolio-public.html`, `portfolio-project.html`) — הם המראה.
2. **התחל מ-`CrmPortfolio.tsx`** — הכי אינטראקטיבי, הכי בעל ערך לבדוק קודם שה-logic לא שבר.
3. **הצג פרוזה למשתמש** של התוכנית לפני קידוד. Commit אחרי.
4. **המשך ל-public profile.** השתמש ב-photo-card pattern של ה-wireframe.
5. **לבסוף project detail page** — גוף המאמר + spec aside.
6. אחרי כל עמוד: `npm run build` + `npx tsc --noEmit` — חייב להיות ירוק.

---

## 6. Quick-reference — Typography & Fonts

- כותרות hero/big: **Frank Ruhl Libre** (serif, font-weight 500, letter-spacing -1px)
- כותרות ui/cards: **Rubik** (sans, 600-700)
- body: **Heebo** (sans, 400-500)
- קוד/מונוספייס: system monospace

ב-codebase כבר טעונים כל השלושה דרך `next/font/google` ב-`layout.tsx`. אם Frank Ruhl לא טעון — הוסף:
```tsx
import { Frank_Ruhl_Libre } from 'next/font/google';
const frankRuhl = Frank_Ruhl_Libre({ subsets:['hebrew'], weight:['500','700'], variable:'--font-frank-ruhl' });
```

---

## 7. Deliverables לבדיקה אחרי הטמעה

- [ ] `/designer/[id]/portfolio` — CRM נטען, drag עובד, upload עובד
- [ ] `/designer/[id]` (public) — Hero מוצג עם photo column, masonry מלא
- [ ] `/projects/[id]` — Hero + story + gallery, floating CTA מופיע
- [ ] `npm run build` ירוק
- [ ] `npx tsc --noEmit` ירוק
- [ ] RTL תקין, 375px / 768px / 1280px תקינים
- [ ] Dark mode (`html.dark`) — לא נוגעים במיוחד, tokens כבר עושים את העבודה

**סוף המסמך.** 📐
