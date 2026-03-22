// ==========================================
// כלי עזר — Utility Functions
// ==========================================

/** פורמט מספר לשקלים */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** פורמט תאריך בעברית */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

/** פורמט תאריך קצר */
export function formatDateShort(date: Date | string): string {
  return new Intl.DateTimeFormat("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

/** פורמט תאריך + שעה */
export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** שם ראשוני לפרטיות — "תמר ג." */
export function anonymizeName(fullName: string): string {
  const parts = fullName.trim().split(" ");
  if (parts.length < 2) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

/** חישוב כמה ימים נותרו */
export function daysUntil(date: Date | string): number {
  const target = new Date(date);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** חישוב כמה ימים עברו */
export function daysSince(date: Date | string): number {
  const target = new Date(date);
  const now = new Date();
  const diff = now.getTime() - target.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** יצירת טוקן אקראי */
export function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/** קטגוריות ספקים */
export const SUPPLIER_CATEGORIES = [
  "ריצוף וחיפוי",
  "תאורה",
  "ריהוט",
  "מטבחים",
  "אמבטיה",
  "חוץ ונוף",
  "דלתות וחלונות",
  "אביזרי עיצוב",
  "חומרי גמר",
  "שירותי בנייה",
  "אחר",
] as const;

/** אזורים */
export const AREAS = [
  "מרכז",
  "תל אביב",
  "ירושלים",
  "צפון",
  "דרום",
  "שרון",
  "שפלה",
  "מקוון בלבד",
] as const;

/** התמחויות */
export const SPECIALIZATIONS = [
  "עיצוב פנים",
  "אדריכלות",
  "נוף",
  "הכל",
] as const;

/** שעות פרסום */
export const POSTING_SLOTS = ["10:30", "13:30", "20:30"] as const;

/** סטטוסים בעברית */
export const STATUS_LABELS: Record<string, string> = {
  PENDING: "ממתין",
  APPROVED: "מאושר",
  REJECTED: "נדחה",
  PUBLISHED: "פורסם",
  PAID: "שולם",
  OVERDUE: "באיחור",
  CANCELLED: "מבוטל",
  PREPARING: "בהכנה",
  READY: "מוכן",
  DRAWN: "הוגרל",
  COMPLETED: "הושלם",
  DRAFT: "טיוטה",
  OPEN: "פתוח",
  CLOSED: "סגור",
  FREE: "חינמי",
  REFUNDED: "הוחזר",
};

/** צבעי סטטוס */
export const STATUS_COLORS: Record<string, string> = {
  PENDING: "badge-yellow",
  APPROVED: "badge-green",
  REJECTED: "badge-red",
  PUBLISHED: "badge-blue",
  PAID: "badge-green",
  OVERDUE: "badge-red",
  CANCELLED: "badge-red",
  PREPARING: "badge-yellow",
  READY: "badge-blue",
  DRAWN: "badge-gold",
  COMPLETED: "badge-green",
  DRAFT: "badge-yellow",
  OPEN: "badge-green",
  CLOSED: "badge-red",
  FREE: "badge-blue",
  REFUNDED: "badge-yellow",
};

/** חודש נוכחי בפורמט YYYY-MM */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** כוכבי דירוג כטקסט */
export function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return "★".repeat(full) + (half ? "☆" : "") + "☆".repeat(empty);
}
