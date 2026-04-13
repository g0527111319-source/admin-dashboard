// ==========================================
// מערכת מגדר — Gender-Aware Text System
// ==========================================
// ברירת מחדל: נקבה
// כאשר פונים לרבים: נקבה (מעצבות)

export type Gender = "male" | "female";

/** מחזיר טקסט לפי מגדר. ברירת מחדל: נקבה */
export function g(gender: Gender | string | undefined | null, male: string, female: string): string {
  return gender === "male" ? male : female;
}

// ==========================================
// מילון מגדרי — Gendered Dictionary
// ==========================================

/** מחזיר מילון מגדרי מלא לפי מגדר */
export function genderDict(gender: Gender | string | undefined | null) {
  const isMale = gender === "male";
  return {
    // כינויים
    you: isMale ? "אתה" : "את",              // you
    your: isMale ? "שלך" : "שלך",             // your (same in Hebrew)

    // מעצב/ת
    designer: isMale ? "מעצב" : "מעצבת",
    designerNew: isMale ? "מעצב חדש" : "מעצבת חדשה",
    designerDear: isMale ? "מעצב יקר" : "מעצבת יקרה",

    // סטטוס תעסוקה
    freelance: isMale ? "עצמאי" : "עצמאית",
    salaried: isMale ? "שכיר" : "שכירה",
    freelanceOrSalaried: isMale ? "שכיר או עצמאי" : "שכירה או עצמאית",

    // סטטוס אישור
    approved: isMale ? "מאושר" : "מאושרת",
    pending: isMale ? "ממתין" : "ממתינה",
    rejected: isMale ? "נדחה" : "נדחתה",

    // פעילות
    active: isMale ? "פעיל" : "פעילה",
    inactive: isMale ? "לא פעיל" : "לא פעילה",
    registered: isMale ? "רשום" : "רשומה",

    // תגים ותארים
    expert: isMale ? "מומחה" : "מומחית",
    activeContributor: isMale ? "תורם פעיל" : "תורמת פעילה",
    lotteryWinner: isMale ? "זוכה הגרלה" : "זוכת הגרלה",
    starOfMonth: isMale ? "כוכב החודש" : "כוכבת החודש",

    // פעלים
    working: isMale ? "עובד" : "עובדת",
    invited: isMale ? "מוזמן" : "מוזמנת",
    joined: isMale ? "הצטרף" : "הצטרפה",
    helping: isMale ? "עוזר" : "עוזרת",
    wants: isMale ? "רוצה" : "רוצה",       // same in present tense
    canDo: isMale ? "יכול" : "יכולה",

    // ציוויים (imperative)
    choose: isMale ? "בחר" : "בחרי",
    mark: isMale ? "סמן" : "סמני",
    fill: isMale ? "מלא" : "מלאי",
    share: isMale ? "שתף" : "שתפי",
    add: isMale ? "הוסף" : "הוסיפי",
    create: isMale ? "צור" : "צרי",
    enter: isMale ? "היכנס" : "היכנסי",
    try_: isMale ? "נסה" : "נסי",
    describe: isMale ? "תאר" : "תארי",
    sign: isMale ? "חתום" : "חתמי",
    check: isMale ? "בדוק" : "בדקי",
    select: isMale ? "בחר" : "בחרי",
    contact: isMale ? "פנה" : "פני",
    upload: isMale ? "העלה" : "העלי",
    save: isMale ? "שמור" : "שמרי",
    send: isMale ? "שלח" : "שלחי",
    cancel: isMale ? "בטל" : "בטלי",
    confirm: isMale ? "אשר" : "אשרי",
    update: isMale ? "עדכן" : "עדכני",
    delete_: isMale ? "מחק" : "מחקי",
    wait: isMale ? "המתן" : "המתיני",
    continue_: isMale ? "המשך" : "המשיכי",
    click: isMale ? "לחץ" : "לחצי",
    write: isMale ? "כתוב" : "כתבי",
    read: isMale ? "קרא" : "קראי",

    // שם תואר
    new_: isMale ? "חדש" : "חדשה",
    dear: isMale ? "יקר" : "יקרה",
    welcome: isMale ? "ברוך הבא" : "ברוכה הבאה",
    ready: isMale ? "מוכן" : "מוכנה",
    interested: isMale ? "מעוניין" : "מעוניינת",
    satisfied: isMale ? "מרוצה" : "מרוצה",    // same
    certain: isMale ? "בטוח" : "בטוחה",
  };
}
