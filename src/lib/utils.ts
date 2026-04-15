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

/** סטטוסים בעברית — מאוחד לכל המערכת (supplier + CRM + billing + portal) */
export const STATUS_LABELS: Record<string, string> = {
  // Generic statuses
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
  // CRM project / task statuses
  ACTIVE: "פעיל",
  IN_PROGRESS: "בתהליך",
  ON_HOLD: "מושהה",
  BLOCKED: "חסום",
  ARCHIVED: "ארכיון",
  TODO: "לביצוע",
  DONE: "בוצע",
  SCHEDULED: "מתוזמן",
  SENT: "נשלח",
  VIEWED: "נצפה",
  SIGNED: "חתום",
  EXPIRED: "פג תוקף",
};

/**
 * צבעי סטטוס — מבוסס על tokens אחידים.
 * משתמש בקלאסים `badge-*` שמוגדרים ב-globals.css כדי
 * שהצבעים יישארו עקביים בכל האתר (גם במצב כהה).
 */
export const STATUS_COLORS: Record<string, string> = {
  // Generic statuses
  PENDING: "badge-yellow",
  APPROVED: "badge-green",
  REJECTED: "badge-red",
  PUBLISHED: "badge-blue",
  PAID: "badge-green",
  OVERDUE: "badge-red",
  CANCELLED: "badge-gray",
  PREPARING: "badge-yellow",
  READY: "badge-blue",
  DRAWN: "badge-gold",
  COMPLETED: "badge-green",
  DRAFT: "badge-gray",
  OPEN: "badge-green",
  CLOSED: "badge-gray",
  FREE: "badge-blue",
  REFUNDED: "badge-yellow",
  // CRM-specific
  ACTIVE: "badge-green",
  IN_PROGRESS: "badge-blue",
  ON_HOLD: "badge-yellow",
  BLOCKED: "badge-red",
  ARCHIVED: "badge-gray",
  TODO: "badge-gray",
  DONE: "badge-green",
  SCHEDULED: "badge-blue",
  SENT: "badge-blue",
  VIEWED: "badge-gold",
  SIGNED: "badge-green",
  EXPIRED: "badge-red",
};

/**
 * תצוגת זמן יחסי בעברית — "לפני 5 דק׳", "אתמול", "לפני שבועיים".
 * שימושי לפיד פעילות, inbox, וכו'.
 */
export function formatRelativeTime(date: Date | string): string {
  const target = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - target.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return "לפני רגע";
  if (diffMin < 60) return `לפני ${diffMin} דק׳`;
  if (diffHour < 24) return `לפני ${diffHour} שע׳`;
  if (diffDay === 1) return "אתמול";
  if (diffDay < 7) return `לפני ${diffDay} ימים`;
  if (diffDay < 14) return "לפני שבוע";
  if (diffDay < 30) return `לפני ${Math.floor(diffDay / 7)} שבועות`;
  if (diffDay < 60) return "לפני חודש";
  if (diffDay < 365) return `לפני ${Math.floor(diffDay / 30)} חודשים`;
  return `לפני ${Math.floor(diffDay / 365)} שנה`;
}

/** פורמט שעה בלבד (09:30) */
export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

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
