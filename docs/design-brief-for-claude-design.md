# 🎨 Design Brief — עיצוב מחדש של עמודי Subscription + Portfolio

> מסמך זה מיועד לסשן חדש של **Claude Design** (Claude Code) שיקבל אותו כהנחייה ראשונית.
> הוא מתאר שני עמודים שהעיצוב שלהם לא תואם את הקו הכללי של האתר, ואת הדרך להפוך אותם יפים ומשתלבים.

---

## 1. תמצית מנהלים

באתר **זירת האדריכלות** (Next.js 14 + Tailwind + RTL עברית) הקו העיצובי הכללי הוא **"Ivory Blinds"**:
רקע שנהב בהיר (`#FAFAF8`), כרטיסיות לבנות, צבעי זהב (`#C9A84C`) וטקסט כהה. כפתורים עם tail-shape מוזהב, shadow-drops עדינים, typography Heebo/Rubik.

שני עמודים נשארו על פלטה **כהה-סגולה** (לגמרי מחוץ לשפה):

| עמוד | קובץ | פלטה נוכחית |
|---|---|---|
| ניהול מנוי | `src/app/designer/[id]/subscription/page.tsx` | `bg-[#0f0f1e]` עמוד, `bg-[#1a1a2e]` כרטיסיות, `text-white` |
| גלריית תיק עבודות | `src/components/crm/CrmPortfolio.tsx` | `bg-[#1a1a2e]`, `bg-[#0a0a0a]` inputs, `text-white/80` |

**המשימה:** להעביר את שניהם לשפה העיצובית של האתר — **ללא** שינוי לוגיקה, state, handlers, API calls או props.
רק `className` + מבנה JSX (חלוקת wrappers, הוספת אייקונים, רווחים, ריכוזי keys) מותרים לשינוי.

---

## 2. מקורות השראה — עמודים שכבר מעוצבים נכון

Claude Design **חייב לקרוא** את אלה לפני שמתחיל לעבוד — זה המראה שמנסים לשחזר:

1. **`src/app/supplier/[id]/page.tsx`** — דאשבורד ספקים עם tabs. דוגמה מצוינת לכרטיסיות נקיות + header יפה + tabs.
2. **`src/components/crm/CrmSurveys.tsx`** — רשימת סקרים עם `card-static`, `badge-green`, `btn-gold`, `btn-outline`.
3. **`src/components/supplier/SupplierReviews.tsx`** — אותו דפוס של פופ-אפ + רשימה + כפתורים עם אייקונים.
4. **`src/app/page.tsx`** — דף הבית, דוגמה לטיפוגרפיה ולמדרגות הירארכיה.

---

## 3. מערכת העיצוב — אוצר כלים שמוכן לשימוש

כל המחלקות הבאות **קיימות** ב-`src/app/globals.css`. אין צורך לכתוב CSS חדש.

### 3.1 טוקנים סמנטיים (Tailwind)

| שימוש | מחלקה | ערך |
|---|---|---|
| רקע עמוד | `bg-bg` | `#FAFAF8` |
| רקע כרטיסייה | `bg-bg-card` / `bg-white` | `#FFFFFF` |
| רקע משני | `bg-bg-surface` | `#F5F4F0` |
| רקע משני 2 | `bg-bg-surface-2` | `#EEEDEA` |
| טקסט ראשי | `text-text-primary` | `#111111` |
| טקסט משני | `text-text-secondary` | `#374151` |
| טקסט עמום | `text-text-muted` | `#6B7280` |
| טקסט חלש | `text-text-faint` | `#9CA3AF` |
| גבולות | `border-border-subtle` / `border-border` | `#E5E5E0` |
| זהב | `text-gold` / `bg-gold` | `#C9A84C` |
| זהב בהיר | `bg-gold-50` | `#FBF7ED` |
| שדרה עברית | `font-heading` | Heebo/Rubik |

### 3.2 קומפוננטות מוכנות (class names)

- `.btn-gold` — הכפתור הראשי (ivory-blinds, מסגרת שחורה, טבעת זהב פנימית, hover: מחליק שמאלה + drop-shadow)
- `.btn-outline` — גרסה שקופה של אותו כפתור
- `.btn-ghost` — כפתור טקסט פשוט
- `.btn-secondary` — ניטרלי, רקע surface
- `.btn-danger` — אדום (למחיקות)
- `.card-static` — כרטיסייה סטטית, padding 6, shadow-xs, border-subtle
- `.card` — כרטיסייה עם hover lift
- `.card-gold` — כרטיסייה עם border זהב + shadow זהב
- `.card-interactive` — clickable, hover lift
- `.input-field` — שדה קלט עם focus ring זהב
- `.select-field` — ברירת מחדל ל-select
- `.table-luxury` — טבלה עם header בגוון surface + hover rows
- `.badge-gold/green/red/yellow/blue/gray` — תגיות בצבעים

---

## 4. העמוד הראשון — Subscription (886 שורות)

**קובץ:** `src/app/designer/[id]/subscription/page.tsx`
**תתי-רכיבים:**
- `src/components/subscription/PlanComparisonTable.tsx`
- `src/components/subscription/SavingsBadge.tsx`

### 4.1 מבנה נוכחי (לשמר כ-1:1)

1. **Header** — כותרת "ניהול מנוי" + תת-כותרת + חזרה
2. **Error/Success banners**
3. **Current Plan card** (שורה 463) — שם תוכנית, מחיר, תקופה, רשימת תכונות
4. **Supplier collaboration discount notice** (שורה 546)
5. **Plans grid** — דרך `<PlanComparisonTable />` + `<SavingsBadge />`
6. **Payment Method card** (שורה 566) — iCount saved card, עדכון כרטיס
7. **Billing History table** (שורה 621)
8. **3 מודלים:**
   - Payment confirmation (שורה 659)
   - Cancel subscription (שורה 786)
   - Update card
9. **Loading/processing/success/error states** בתוך המודלים

### 4.2 רשימת החלפות (OLD → NEW)

> **חוק ברזל:** אם רואים `bg-[#...]` או `text-white` או `border-white/X` — מוחליפים. לא משאירים אף ערך hex אינליין חוץ מ-`#C9A84C` היכן שיש משמעות (לוגו, אייקון זהב).

| OLD | NEW |
|---|---|
| `bg-[#0f0f1e]` (עמוד) | `bg-bg` |
| `bg-[#1a1a2e]` (כרטיסייה) | החלפה ל-`<div className="card-static">` או `bg-white border border-border-subtle rounded-card` |
| `text-white` | `text-text-primary` |
| `text-white/80` | `text-text-secondary` |
| `text-white/70` | `text-text-secondary` |
| `text-white/60` | `text-text-muted` |
| `text-white/50` | `text-text-muted` |
| `text-white/40` | `text-text-faint` |
| `border-white/10` | `border-border-subtle` |
| `border-white/5` | `border-border-subtle` |
| `bg-white/5` | `bg-bg-surface` |
| `bg-black/70 backdrop-blur-sm` (modals) | `bg-black/40 backdrop-blur-sm` (מרכך) |
| `bg-[#C9A84C]/10 border-[#C9A84C]/30` (notice) | `bg-gold-50 border border-[color:var(--border-gold)]` או פשוט `card-gold` |
| `bg-[#C9A84C] text-black hover:bg-[#e0c068]` (CTA) | `btn-gold` |
| `rounded-xl border border-white/20 text-white hover:bg-white/5` (cancel btn) | `btn-outline` |
| `border border-[#C9A84C]/40 text-[#C9A84C] hover:bg-[#C9A84C]/10` (secondary) | `btn-outline` או `text-gold border border-[color:var(--border-gold)] hover:bg-gold-50` |
| טבלת billing עם `border-t border-white/5` | `table-luxury` |

### 4.3 שינויים צפויים במודלים

המודלים כרגע מתחילים ב-`bg-[#1a1a2e] border border-[#C9A84C]/30 rounded-2xl p-6 max-w-md w-full`.
להחליף ב: `bg-white border border-border-subtle rounded-2xl p-6 max-w-md w-full shadow-xl`.

אייקון בתוך עיגול: `bg-[#C9A84C]/20` → `bg-gold-50` (עיגול נעים, לא שקוף על רקע כהה).

### 4.4 PlanComparisonTable + SavingsBadge

גם אותם **חובה לבדוק** — כנראה שגם הם כהים. לעשות להם את אותה החלפה.
טוגל חודשי/שנתי: כפתור פעיל = `bg-gold text-white`; לא-פעיל = `bg-bg-surface text-text-muted`.
כרטיסיית תוכנית נבחרת: `card-gold` + badge "מומלץ" ב-`badge-gold`.

### 4.5 דגשי אייקונים

להשאיר את כל אייקוני `lucide-react` כפי שהם. לצבע `text-gold` או `text-text-muted` לפי ההקשר.

---

## 5. העמוד השני — CrmPortfolio (1,242 שורות)

**קובץ:** `src/components/crm/CrmPortfolio.tsx`
**קומפוננטות נלוות לבדיקה:**
- `src/components/gallery/MasonryGallery.tsx` (172 שורות)
- `src/app/projects/page.tsx` (public listing, 432 שורות)
- `src/app/projects/[id]/page.tsx` (public detail, 417 שורות)

### 5.1 מבנה נוכחי (לשמר 1:1)

1. **Toolbar** — "הוסף פרויקט", מיונים, מסננים
2. **Projects grid** — כרטיסיות עם תמונה ראשית, שם, סטטוס badge
3. **Drag-to-reorder** פעיל על הכרטיסיות
4. **Project create/edit form** — שם, סגנונות (tags), סטטוס, cover image upload, קטגוריות
5. **Gallery per project** — תמונות, drag-reorder, edit-in-place, מחיקה
6. **Image upload** — הגדרות drop-zone
7. **Per-image edit modal**

### 5.2 מיפוי החלפות

אותה טבלת החלפות כמו ב-§4.2.

**נקודות ספציפיות ל-portfolio:**
- **Drop-zone upload:** רקע `bg-bg-surface` דשש border מוקטש (`border-2 border-dashed border-border-subtle`), בהובר `border-gold bg-gold-50`.
- **Image tiles:** מסגרת עדינה `border border-border-subtle rounded-lg overflow-hidden shadow-sm` + hover `shadow-md`.
- **Drag handle:** אייקון `GripVertical` ב-`text-text-muted`, על hover כולו `ring-1 ring-gold/40`.
- **Delete buttons on images:** `bg-white/90 text-red-600 hover:bg-red-50` (לא `bg-black`).
- **Tags/chips:** `badge-gray` לסגנונות, `badge-gold` לקטגוריה ראשית.
- **Empty states:** טקסט `text-text-muted` ממורכז + אייקון `ImageOff` דהוי + כפתור `btn-gold` קטן.

### 5.3 MasonryGallery (public)

- אותה החלפת פלטה.
- עטיפה חיצונית: `bg-bg` ו-padding נדיב.
- Hover על תמונה: לא overlay כהה — overlay לבן חצי-שקוף `bg-white/70 backdrop-blur-sm` עם טקסט `text-text-primary`.

### 5.4 public projects pages

לבדוק את `src/app/projects/page.tsx` + `[id]/page.tsx` אם יש שם גם רקעים כהים — לסנכרן.

---

## 6. חוקי ברזל (אסור לגעת)

| ❌ אסור | ✅ מותר |
|---|---|
| שינוי `onClick`, `onSubmit`, fetch calls, state keys | `className`, מבנה JSX |
| שינוי props של קומפוננטות | הוספת props אופציונליים חדשים |
| שינוי שמות קבצים / routes / URL params | רק `className` ו-JSX |
| מחיקת `aria-label` / `data-testid` / `role` | אפשר להוסיף |
| הסרת אייקוני lucide | שינוי צבעי האייקון |
| שינוי הטקסטים העבריים המילוליים | שום דבר |
| הוספת `npm install` | להשתמש רק במה שקיים |
| עריכת `src/app/api/**` או `src/lib/**` | לא נוגעים בכלל |

**כל טקסט עברי נשאר כפי שהוא.** (כולל ניקוד, emoji, רווחים, גרשיים.)

---

## 7. בדיקות חובה אחרי כל שינוי

```bash
# חובה שיעבור בלי שגיאות
npm run build
npx tsc --noEmit
```

בנוסף, בדיקה ידנית ב-dev:
- [ ] העמוד נטען
- [ ] כל הכפתורים לוחצים ועושים את מה שעשו קודם
- [ ] RTL תקין
- [ ] Responsive: 375px / 768px / 1280px
- [ ] מודלים נפתחים ונסגרים
- [ ] Drag-to-reorder עובד
- [ ] Upload עובד

---

## 8. סדר עבודה מומלץ

1. **קורא את §2 המקורות השראה** — מבין איך נראה "יפה" באתר הזה.
2. **קורא את שני הקבצים** במלואם.
3. **מציג למשתמש פרוזה** של התוכנית לפני שנוגעים בקוד.
4. **מתחיל מעמוד Subscription** (קטן יותר, פחות אינטראקטיבי).
5. **commit** אחרי העמוד הראשון. צילום מסך. אישור מהמשתמש.
6. **ממשיך לפורטפוליו.**
7. **commit סופי.** `npm run build` ירוק.

---

## 9. Quick-reference הצבעים

```
רקע עמוד:         #FAFAF8    bg-bg
רקע כרטיסייה:     #FFFFFF    bg-bg-card / bg-white
רקע עדין:          #F5F4F0    bg-bg-surface
טקסט ראשי:        #111111    text-text-primary
טקסט משני:        #374151    text-text-secondary
טקסט עמום:        #6B7280    text-text-muted
טקסט חלש:         #9CA3AF    text-text-faint
גבול:              #E5E5E0    border-border-subtle
זהב ראשי:         #C9A84C    text-gold / bg-gold
זהב 50:            #FBF7ED    bg-gold-50
זהב כהה:          #B8860B    (border פנימי של btn-gold)
```

**כפתור הזהב** (ivory-blinds):
```
background: linear-gradient(180deg, #faf5e8, #f0e8d0, #e4d9b8);
border: 1.4px solid #1a1a1a;
inner ring: 1.2px solid #B8860B (inset 4px);
hover: translateX(-6px) translateY(-1px);
```

---

## 10. מה למסור בסשן חדש

שלחו לסשן של Claude Design:

1. את המסמך הזה (`docs/design-brief-for-claude-design.md`).
2. ציטוט: "תקרא את `docs/design-brief-for-claude-design.md` ותתחיל מעמוד ה-Subscription לפי הסדר. **אל תתחיל לקודד עד שהצגת לי פרוזה של התוכנית.**"
3. Reference לעמודים שכבר יפים: `/supplier/[id]` (דאשבורד ספקים).

---

**סוף המסמך.** 📐
