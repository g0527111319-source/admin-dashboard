# 🧾 Handoff — עמוד ניהול מנוי · Claude Code

> מסמך מוסר מהסשן של Claude Design ל-Claude Code.
> עצמאי — מכיל את כל מה שצריך להטמיע את עמוד ה-subscription ב-Ivory Blinds, בלי לשבור לוגיקה קיימת.

## סיכום — מה נוצר

HTML wireframe אחד ב-**Ivory Blinds** שמיישם את ה-tokens של `src/app/globals.css` 1:1 — `btn-gold`, `btn-outline`, `card-static`, `card-gold`, `badge-green/gold/gray/yellow/red`, `input-field`, `select-field`, `table-luxury`, טוקני צבע/רקע/טקסט/גבול/זהב.

| # | קובץ wireframe | מיפוי לקודבייס | תפקיד |
|---|---|---|---|
| 1 | `wireframes/subscription.html` | `src/app/designer/[id]/subscription/page.tsx` (886 שורות) | ניהול מנוי מלא — 8 סקשנים + 3 מודלים + 4 מצבי תשלום |

ה-wireframe כולל גם תצוגה מקובצת של כל 3 המודלים — אישור תשלום (Idle · Processing · Success · Error), ביטול מנוי, ועדכון כרטיס אשראי — כך שאפשר לראות את כל המצבים שצריך להכין ב-JSX בלי להריץ את האפליקציה.

---

## 1. מה שובר את העמוד הנוכחי

כל העמוד יושב על פלטה כהה־סגולה שלא שייכת לאתר. חובה להחליף את כל ההקסים ה-inline הבאים בטוקנים של `globals.css`:

| Old (inline hex) | New (token / class) |
|---|---|
| `bg-[#0f0f1e]` (רקע עמוד) | `bg-bg` |
| `bg-[#1a1a2e]` (כרטיסים) | `card-static` או `bg-bg-card` |
| `bg-[#0a0a0a]` (רקע מודל) | `bg-white` (מודל לבן נקי) |
| `text-white` | `text-text-primary` |
| `text-white/80` | `text-text-primary` |
| `text-white/70`, `text-white/60` | `text-text-secondary` |
| `text-white/50`, `text-white/40` | `text-text-muted` |
| `border-white/10`, `border-white/5` | `border-border-subtle` |
| `bg-white/5` | `bg-bg-surface` או `bg-[color:var(--gold-50)]` |
| `bg-[#C9A84C] text-black` | `btn-gold` |
| `border border-[#C9A84C]/40 text-[#C9A84C]` | `btn-outline` |
| `bg-black/70 backdrop-blur-sm` (modal overlay) | `bg-black/40 backdrop-blur-sm` (שומרים darken עדין לקונטרסט) |
| `bg-[#1a1a2e]` (modal content) | `bg-white border border-border-subtle rounded-2xl shadow-xl` |

---

## 2. מבנה העמוד — 8 אזורים

### 2.1 Page Header
- breadcrumbs זעיר
- `<h1>` "ניהול מנוי" (`font-heading`, font-weight 400, size 38px)
- subtitle אחד של סטטוס (max-width 560px)

### 2.2 Banners (contextual)
שלושה סוגים — לא מוצגים תמיד, אלא לפי state:

| סוג | className | מתי |
|---|---|---|
| Success | `bg-green-50 border-green-200 text-green-800` | אחרי תשלום שהתקבל |
| Error | `bg-red-50 border-red-200 text-red-800` | תשלום שנכשל / שגיאת API |
| Info | `bg-gold-50 border-[color:var(--border-gold)] text-[color:var(--gold-dim)]` | הודעות כלליות |

כל banner: padding 14/20, rounded-xl, אייקון עגול 28×28 + טקסט + אופציונלי לינק.

### 2.3 Current Plan Hero
**הכי חשוב ויזואלית — זה ה-hero של העמוד.**
Grid 1.3fr / 1fr.

**עמודה שמאל (`hero-l`):**
- eyebrow + badge ירוק "● פעיל"
- שם תוכנית גדול (`font-heading`, 48px)
- שורת מחיר: "₪299" (בולט) + "/ לחודש · חיוב חודשי" (muted)
- שורת חידוש: אייקון שעון + "מתחדש אוטומטית ב-28/03 · ₪299 דרך כרטיס •••• 4218"
- רשימת features ב-2 עמודות (checkmarks זהובים)

**עמודה ימין (`hero-r`):** רקע `bg-bg-card/50`, border-right זהוב עדין, 3 usage rows:
- לידים — progress bar זהב
- תמונות — progress bar ירוק (כי שפע)
- צפיות — progress bar זהב
- 2 כפתורי CTA קטנים: "שדרגי" + "בטלי"

**className מפתח:**
```
wrapper       → rounded-[24px] border border-[color:var(--border-gold)]
                bg-gradient-to-br from-[#FFFBEF] to-[#F5ECD3]
progress bar  → h-2 bg-gold-50 rounded-full overflow-hidden
progress fill → bg-gradient-to-r from-[color:var(--gold-dim)] to-[color:var(--gold-light)]
```

### 2.4 Supplier Collaboration Discount Notice
Banner info בסגנון מיוחד — יותר גדול מה-banners הרגילים:
- אייקון ✦ בעיגול זהב
- כותרת מודגשת + badge "הנחה של 15%"
- טקסט מסביר עם הדגשה על שם הספק
- לינק "פרטים נוספים" בצד שמאל

**className:** `bg-gold-50 border-[color:var(--border-gold)] rounded-2xl p-5`

### 2.5 Plans Grid (עם `<PlanComparisonTable />`)

**מבנה:**
1. Head ממורכז: eyebrow + h2 + subtitle (max-width 600)
2. Toggle row ממורכז: "חיוב" + pill-tabs (חודשי/שנתי) + `<SavingsBadge />`
3. Grid 4 עמודות של plan cards

**כל כרטיס plan:**
- tier (uppercase, 11px, letter-spacing 0.3em, gold-dim)
- h3 (font-heading, 28px — שם התוכנית)
- desc (12px, muted)
- price-row: "₪X" (font-heading, 44px) + "/ לחודש" (13px, muted)
- price-strike: מחיר מקורי עם `<s>` (מופיע רק כשטוגל על "שנתי")
- ul.feats — כל פריט ✓ / — (למתכונות שלא בתוכנית, opacity .45)
- CTA בתחתית הכרטיס

**וריאציות כרטיס:**

| וריאציה | className | מתי |
|---|---|---|
| רגיל | `card-static` + hover:translate-y-[-4px] | תוכניות אחרות |
| Recommended | `ribbon` עליון זהב "מומלץ" + `border-2 border-gold scale-[1.03]` | התוכנית הפופולרית |
| Current | `ribbon` עליון ירוק "התוכנית שלך" + `bg-green-50/12 border-2 border-green-700/35` | התוכנית הנוכחית |
| Recommended + Current | שני ribbons (ימין+שמאל) + שילוב הצבעים | כשהתוכנית המומלצת גם הנוכחית |

**CTA variants:**
```
btn-outline (ghost)   → תוכניות שאפשר לבחור
btn-gold              → תוכנית Upgrade (מושכת עין)
current (disabled)    → "התוכנית הנוכחית שלך" עם ✓ — רקע ירוק עדין
```

### 2.6 Payment Method
Grid 1.5fr / 1fr.

**עמודה שמאל:**
- h3 "שיטת תשלום" + subtitle על iCount
- grid auto/1fr: [כרטיס אשראי ויזואלי] + [2 כפתורי פעולה]

**הכרטיס האשראי הויזואלי** (`.cc-card` ב-wireframe):
- רקע כהה `bg-gradient-to-br from-[#1a1410] to-[#2a1f17]`
- aspect 1.6/1, max-width 380px, padding 28px
- Top: chip זהב + "VISA" ב-font-heading
- Middle: מספר כרטיס מוסתר "•••• •••• •••• 4218"
- Bottom: שם בעל הכרטיס + תוקף

**עמודה ימין:** meta card עם dashed border — מזהה iCount, תאריך חיוב הבא, סוג חיוב, לינק לחשבונית הבאה.

### 2.7 Billing History
טבלה עם `table-luxury`. 6 עמודות: תאריך · תיאור · אמצעי תשלום · סכום · סטטוס · חשבונית.

**Status pills:**
```
שולם   → badge-green  (● + "שולם")
ממתין  → badge-yellow (◷ + "ממתין")
כשל    → badge-red    (✕ + "כשל")
```

כותרת עם h3 + subtitle בצד ימין, ולינק "ייצוא CSV ↓" בצד שמאל.

### 2.8 3 Modals

**כולם:**
- `bg-white rounded-2xl shadow-xl border border-border-subtle`
- padding 24, כותרת + סגירה × בפינה שמאלית עליונה
- state tag צמוד לכותרת (pill קטן עם צבע לפי מצב)
- modal-actions בתחתית, `flex gap-2`, כפתורים ב-flex-1

#### A. Payment Modal (4 states):

**Idle / Confirm:**
- modal-summary: רשימת פריטים (תוכנית · הנחת שותף · מע"מ · Total)
- disclaimer: "חיוב דרך VISA •••• 4218. תוכלי לבטל בכל עת."
- Actions: "ביטול" (btn-outline) + "אשרי ושלמי" (btn-gold)

**Processing:**
- spinner זהב (44px, `border-gold-50 border-top-gold animate-spin`)
- טקסט "מעבדים… אל תסגרי את החלון"
- progress bar דק

**Success:**
- מעגל ירוק 60×60 עם ✓ לבן
- summary: חויב / אסמכתא / תוכנית חדשה
- Actions: "הורידי קבלה" (btn-outline) + "סיימתי" (btn-gold)

**Error:**
- מעגל אדום 60×60 עם ✕ לבן
- warning box `bg-red-50/6 border border-red-200 rounded-xl p-3`:
  - קוד שגיאה (למשל "402 · Insufficient funds")
  - הסבר למשתמשת
- Actions: "ביטול" (btn-outline) + "נסי שוב" (btn-gold)

#### B. Cancel Subscription Modal (`.modal.danger`):
- כותרת בצבע אדום
- warning box עם 4-5 bullets: "מה יקרה אם תבטלי?"
- `<select>` לסיבת הביטול
- Actions: "תשאירי אותי" (btn-gold — **חשוב** — הכפתור הראשי שומר, לא מבטל) + "בטלי לצמיתות" (כפתור אדום outline — `bg-red-50 border border-red-400 text-red-800`)

#### C. Update Card Modal:
- state tag ירוק "🔒 SSL" (מרגיעה את המשתמשת)
- טופס iCount: מספר כרטיס · תוקף + CVV · שם בעל כרטיס · ת.ז. · checkbox "שמרי לחיובים עתידיים"
- Actions: "ביטול" + "שמרי כרטיס" (btn-gold)

---

## 3. מיפוי className — Quick reference

| אזור | Old | New |
|---|---|---|
| page wrapper | `bg-[#0f0f1e] text-white` | `bg-bg text-text-primary` |
| main card | `bg-[#1a1a2e] border-white/10` | `card-static` |
| section headline | `text-white` | `text-text-primary font-heading` |
| meta text | `text-white/60` | `text-text-secondary` |
| hint text | `text-white/40` | `text-text-muted` |
| divider | `border-white/10` | `border-border-subtle` |
| chip/pill | `bg-white/5 border-white/10` | `bg-bg-surface border-border-subtle` |
| chip active | `bg-[#C9A84C] text-black` | `bg-gold-50 text-[color:var(--gold-dim)] border-[color:var(--border-gold)]` |
| CTA primary | `bg-[#C9A84C] text-black` | `btn-gold` |
| CTA ghost | `border border-white/20 text-white` | `btn-outline` |
| CTA destructive | `bg-red-600 text-white` | `bg-red-50 border border-red-400 text-red-800 hover:bg-red-100 rounded-full font-semibold` |
| success banner | `bg-green-900/30 text-green-200` | `bg-green-50 border-green-200 text-green-800` |
| error banner | `bg-red-900/30 text-red-200` | `bg-red-50 border-red-200 text-red-800` |
| info/discount banner | `bg-purple-900/30 text-purple-200` | `bg-gold-50 border-[color:var(--border-gold)] text-[color:var(--gold-dim)]` |
| badge "שולם" | `bg-green-500 text-white` | `badge-green` |
| badge "ממתין" | `bg-yellow-500 text-white` | `badge-yellow` |
| badge "כשל" | `bg-red-500 text-white` | `badge-red` |
| table | Raw HTML | `table-luxury` |
| plan card (recommended) | `ring-2 ring-[#C9A84C]` | `border-2 border-gold scale-[1.03] bg-gradient-to-br from-[#FFFBEF] to-[#F5ECD3]` |
| plan card (current) | `ring-2 ring-green-500` | `border-2 border-green-700/35 bg-green-50/12` |
| input/select | `bg-white/5 text-white border-white/10` | `input-field` / `select-field` |
| modal overlay | `bg-black/70 backdrop-blur-sm` | `bg-black/40 backdrop-blur-sm` |
| modal content | `bg-[#1a1a2e] border-white/10` | `bg-white rounded-2xl shadow-xl border border-border-subtle` |
| credit card viz | `bg-[#0a0a0a]` | `bg-gradient-to-br from-[#1a1410] to-[#2a1f17]` (חריג — הכרטיס אמור להיות כהה כי הוא מחקה visa physical card) |

---

## 4. Sub-components — שינויים נדרשים

### `PlanComparisonTable.tsx`
**שינויים:**
- כל `bg-white/5` → `card-static`
- כל `text-white/70` → `text-text-secondary`
- הוספת `ribbon` במיקום absolute top-[-12px] right-6 על הכרטיס `recommended` ו-top-[-12px] left-6 על `current` (שניהם יכולים להופיע ביחד)
- ה-toggle חודשי/שנתי → `pill-tabs` component (ראה `globals.css` או קיים ב-CrmSurveys)
- prop חדש (אופציונלי): `layout?: "grid" | "table"` — אם `table`, עבור למצב השוואה עמודתי. ברירת מחדל: `grid`.

### `SavingsBadge.tsx`
**שינויים:**
- רקע → `bg-gradient-to-r from-[color:var(--gold-dim)] to-gold` `text-white` `px-3 py-1 rounded-full text-xs font-bold tracking-wider`
- אייקון ✦ לפני הטקסט

לא לגעת ב-props interface.

---

## 5. חוקי ברזל

| ❌ אסור | ✅ מותר |
|---|---|
| שינוי `onClick`, `onSubmit`, fetch, state keys | `className`, מבנה JSX (wrappers, grouping) |
| שינוי props של `PlanComparisonTable` או `SavingsBadge` | הוספת props אופציונליים חדשים |
| שינוי routes / URL params / שמות קבצים | className ו-JSX בלבד |
| מחיקת `aria-label` / `data-testid` / `role` | אפשר להוסיף |
| שינוי הטקסטים העבריים המילוליים | כלום |
| עריכת `src/app/api/**` או `src/lib/**` | לא נוגעים |
| שינוי loading/processing/success/error state names | רק העיצוב שלהם |
| `npm install` חדש | רק מה שקיים |

---

## 6. סדר עבודה מומלץ

1. **קרא את `wireframes/subscription.html`** — זה ה-single source of truth הויזואלי.
2. **התחל מ-Current Plan hero** — הכי בולט, הכי פשוט לוודא שהטוקנים עובדים.
3. **אחר כך Plans Grid** — אבל **לפני** זה, עדכן את `PlanComparisonTable.tsx` ו-`SavingsBadge.tsx` (sub-components).
4. **Payment Method + Billing History** — שניהם static, מהירים.
5. **Modals לבסוף** — הכי מסובכים. עבור מצב-אחר-מצב של Payment modal (Idle → Processing → Success → Error) ותוודא שכל אחד נראה נכון.
6. אחרי כל אזור: `npm run build` + `npx tsc --noEmit` — חייב להיות ירוק.

---

## 7. רפרנסים לקוד (להשראה, לא להעתקה)

- `src/app/supplier/[id]/page.tsx` — דאשבורד ספקים, מראה לשאוף אליו
- `src/components/crm/CrmSurveys.tsx` — שימוש טוב ב-card-static + badges + pill-tabs
- `src/app/globals.css` שורות 51-100 (tokens) ו-389-530 (buttons)

---

## 8. Typography & Fonts

- כותרות hero (38px+): **font-heading** (Frank Ruhl Libre / Suez One — מה שמוגדר ב-layout.tsx)
- כותרות ui (22-28px): font-semibold רגיל
- body: Heebo / Rubik
- מספרי price: `font-heading`, font-weight 400 (לא 700 — ה-font-family כבר גדול ובולט)

---

## 9. Deliverables — checklist

- [ ] `/designer/[id]/subscription` נטען בלי שגיאות
- [ ] Current plan hero נראה כמו ב-wireframe (כולל usage bars)
- [ ] 4 plan cards, Recommended+Current מסומנים נכון
- [ ] טוגל חודשי/שנתי מחליף מחירים + SavingsBadge מופיע בשנתי
- [ ] Payment method card כהה (זה חריג — המחקה visa card fiziכלי)
- [ ] Billing history עם `table-luxury` ו-status pills נכונים
- [ ] 3 modals: payment (4 states) · cancel · update card
- [ ] Success/Error/Info banners עובדים כש-state מחייב
- [ ] `npm run build` ירוק
- [ ] `npx tsc --noEmit` ירוק
- [ ] RTL תקין, 375px / 768px / 1280px תקינים
- [ ] Dark mode (`html.dark`) — לא נוגעים במיוחד, tokens כבר עושים את העבודה

**סוף המסמך.** 🧾
