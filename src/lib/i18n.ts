/**
 * Simple i18n infrastructure for multi-language support.
 * Hebrew (he) is the default language.
 * Supports: he (Hebrew), ar (Arabic), en (English).
 */

export type Lang = "he" | "ar" | "en";

export const RTL_LANGUAGES: Lang[] = ["he", "ar"];

export function isRtl(lang: Lang): boolean {
  return RTL_LANGUAGES.includes(lang);
}

type TranslationKey =
  | "dashboard"
  | "clients"
  | "suppliers"
  | "projects"
  | "settings"
  | "login"
  | "logout"
  | "save"
  | "cancel"
  | "delete"
  | "search"
  | "welcome"
  | "loading"
  | "error"
  | "success"
  | "phone"
  | "email"
  | "name"
  | "address"
  | "home";

const translations: Record<Lang, Record<TranslationKey, string>> = {
  he: {
    dashboard: "לוח בקרה",
    clients: "לקוחות",
    suppliers: "ספקים",
    projects: "פרויקטים",
    settings: "הגדרות",
    login: "התחברות",
    logout: "התנתקות",
    save: "שמור",
    cancel: "ביטול",
    delete: "מחק",
    search: "חיפוש",
    welcome: "ברוכה הבאה",
    loading: "טוען...",
    error: "שגיאה",
    success: "הצלחה",
    phone: "טלפון",
    email: "אימייל",
    name: "שם",
    address: "כתובת",
    home: "הבית שלי",
  },
  ar: {
    dashboard: "لوحة التحكم",
    clients: "العملاء",
    suppliers: "الموردون",
    projects: "المشاريع",
    settings: "الإعدادات",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    search: "بحث",
    welcome: "مرحباً",
    loading: "جاري التحميل...",
    error: "خطأ",
    success: "نجاح",
    phone: "هاتف",
    email: "بريد إلكتروني",
    name: "الاسم",
    address: "العنوان",
    home: "الرئيسية",
  },
  en: {
    dashboard: "Dashboard",
    clients: "Clients",
    suppliers: "Suppliers",
    projects: "Projects",
    settings: "Settings",
    login: "Login",
    logout: "Logout",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    search: "Search",
    welcome: "Welcome",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    phone: "Phone",
    email: "Email",
    name: "Name",
    address: "Address",
    home: "Home",
  },
};

const STORAGE_KEY = "zirat-lang";

/** Get the saved language preference, default to Hebrew */
export function getSavedLang(): Lang {
  if (typeof window === "undefined") return "he";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && (saved === "he" || saved === "ar" || saved === "en")) {
    return saved as Lang;
  }
  return "he";
}

/** Save language preference */
export function saveLang(lang: Lang): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, lang);
}

/** Translate a key for the given language */
export function t(key: TranslationKey, lang?: Lang): string {
  const activeLang = lang || getSavedLang();
  return translations[activeLang]?.[key] ?? translations.he[key] ?? key;
}

/** Get all translations for a language */
export function getTranslations(lang?: Lang): Record<TranslationKey, string> {
  const activeLang = lang || getSavedLang();
  return translations[activeLang] ?? translations.he;
}
