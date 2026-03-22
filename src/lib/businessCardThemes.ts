// ==========================================
// ׳¢׳¨׳›׳•׳× ׳ ׳•׳©׳ ׳׳›׳¨׳˜׳™׳¡ ׳‘׳™׳§׳•׳¨ ׳“׳™׳’׳™׳˜׳׳™
// 10 theme presets for digital business cards
// ==========================================

export interface CardTheme {
  id: string;
  name: string;
  nameHe: string;
  colors: CardColors;
  fontStyle: "serif" | "sans" | "mixed";
  cardStyle: "rounded" | "sharp" | "soft";
  backgroundPattern?: string;
}

export interface CardColors {
  primary: string;       // Main accent color
  secondary: string;     // Secondary accent
  background: string;    // Card background
  cardBg: string;        // Inner card/section background
  text: string;          // Primary text
  textMuted: string;     // Muted/secondary text
  border: string;        // Border color
  socialBg: string;      // Social icons background
  socialIcon: string;    // Social icon color
  buttonBg: string;      // Button background
  buttonText: string;    // Button text
  headerBg: string;      // Header/banner area
  headerText: string;    // Header text
}

export const cardThemes: CardTheme[] = [
  {
    id: "elegant-gold",
    name: "Elegant Gold",
    nameHe: "׳–׳”׳‘ ׳׳׳’׳ ׳˜׳™",
    fontStyle: "serif",
    cardStyle: "rounded",
    colors: {
      primary: "#C9A84C",
      secondary: "#E8C97A",
      background: "#FAF9F6",
      cardBg: "#FFFFFF",
      text: "#1A1A1A",
      textMuted: "#6B7280",
      border: "#E8E4DC",
      socialBg: "#FBF7ED",
      socialIcon: "#C9A84C",
      buttonBg: "#C9A84C",
      buttonText: "#FFFFFF",
      headerBg: "#1A1A1A",
      headerText: "#FFFFFF",
    },
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    nameHe: "׳׳™׳ ׳™׳׳׳™ ׳׳•׳“׳¨׳ ׳™",
    fontStyle: "sans",
    cardStyle: "sharp",
    colors: {
      primary: "#111111",
      secondary: "#555555",
      background: "#FFFFFF",
      cardBg: "#FAFAFA",
      text: "#111111",
      textMuted: "#888888",
      border: "#EEEEEE",
      socialBg: "#F5F5F5",
      socialIcon: "#333333",
      buttonBg: "#111111",
      buttonText: "#FFFFFF",
      headerBg: "#FFFFFF",
      headerText: "#111111",
    },
  },
  {
    id: "dark-luxe",
    name: "Dark Luxe",
    nameHe: "׳™׳•׳§׳¨׳” ׳›׳”׳”",
    fontStyle: "serif",
    cardStyle: "rounded",
    colors: {
      primary: "#D4AF37",
      secondary: "#F0D060",
      background: "#0D0D0D",
      cardBg: "#1A1A1A",
      text: "#F5F5F5",
      textMuted: "#9CA3AF",
      border: "#2D2D2D",
      socialBg: "#252525",
      socialIcon: "#D4AF37",
      buttonBg: "#D4AF37",
      buttonText: "#0D0D0D",
      headerBg: "#D4AF37",
      headerText: "#0D0D0D",
    },
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    nameHe: "׳›׳—׳•׳ ׳׳•׳§׳™׳™׳ ׳•׳¡",
    fontStyle: "sans",
    cardStyle: "rounded",
    colors: {
      primary: "#1E6B8A",
      secondary: "#4DA8C4",
      background: "#F0F7FA",
      cardBg: "#FFFFFF",
      text: "#1A3A4A",
      textMuted: "#5A7A8A",
      border: "#D0E4EC",
      socialBg: "#E8F4F8",
      socialIcon: "#1E6B8A",
      buttonBg: "#1E6B8A",
      buttonText: "#FFFFFF",
      headerBg: "#1E6B8A",
      headerText: "#FFFFFF",
    },
  },
  {
    id: "rose-garden",
    name: "Rose Garden",
    nameHe: "׳’׳ ׳•׳¨׳“׳™׳",
    fontStyle: "mixed",
    cardStyle: "soft",
    colors: {
      primary: "#B76E79",
      secondary: "#E8B4BC",
      background: "#FDF6F7",
      cardBg: "#FFFFFF",
      text: "#3D2B2E",
      textMuted: "#8A6A70",
      border: "#F0D8DC",
      socialBg: "#FBF0F2",
      socialIcon: "#B76E79",
      buttonBg: "#B76E79",
      buttonText: "#FFFFFF",
      headerBg: "#B76E79",
      headerText: "#FFFFFF",
    },
  },
  {
    id: "forest-green",
    name: "Forest Green",
    nameHe: "׳™׳¨׳•׳§ ׳™׳¢׳¨",
    fontStyle: "mixed",
    cardStyle: "rounded",
    colors: {
      primary: "#2D5A3D",
      secondary: "#6B9F7E",
      background: "#F2F7F4",
      cardBg: "#FFFFFF",
      text: "#1A2E22",
      textMuted: "#5A7A65",
      border: "#D4E5DA",
      socialBg: "#E8F2EC",
      socialIcon: "#2D5A3D",
      buttonBg: "#2D5A3D",
      buttonText: "#FFFFFF",
      headerBg: "#2D5A3D",
      headerText: "#FFFFFF",
    },
  },
  {
    id: "royal-purple",
    name: "Royal Purple",
    nameHe: "׳¡׳’׳•׳ ׳׳׳›׳•׳×׳™",
    fontStyle: "serif",
    cardStyle: "rounded",
    colors: {
      primary: "#5B3A8C",
      secondary: "#9B7EC8",
      background: "#F5F2FA",
      cardBg: "#FFFFFF",
      text: "#2D1B4E",
      textMuted: "#7A6A90",
      border: "#DED4EB",
      socialBg: "#F0EAFA",
      socialIcon: "#5B3A8C",
      buttonBg: "#5B3A8C",
      buttonText: "#FFFFFF",
      headerBg: "#5B3A8C",
      headerText: "#FFFFFF",
    },
  },
  {
    id: "sunset-warm",
    name: "Sunset Warm",
    nameHe: "׳©׳§׳™׳¢׳” ׳—׳׳”",
    fontStyle: "sans",
    cardStyle: "soft",
    colors: {
      primary: "#D4663A",
      secondary: "#F0A070",
      background: "#FFF8F4",
      cardBg: "#FFFFFF",
      text: "#3D2517",
      textMuted: "#8A6A55",
      border: "#F0DCD0",
      socialBg: "#FFF0E8",
      socialIcon: "#D4663A",
      buttonBg: "#D4663A",
      buttonText: "#FFFFFF",
      headerBg: "#D4663A",
      headerText: "#FFFFFF",
    },
  },
  {
    id: "arctic-clean",
    name: "Arctic Clean",
    nameHe: "׳׳¨׳§׳˜׳™ ׳ ׳§׳™",
    fontStyle: "sans",
    cardStyle: "sharp",
    colors: {
      primary: "#3A8FB7",
      secondary: "#7DBBD4",
      background: "#F4FAFE",
      cardBg: "#FFFFFF",
      text: "#1A3040",
      textMuted: "#6A8A9A",
      border: "#D8ECF4",
      socialBg: "#EAF5FA",
      socialIcon: "#3A8FB7",
      buttonBg: "#3A8FB7",
      buttonText: "#FFFFFF",
      headerBg: "#FFFFFF",
      headerText: "#3A8FB7",
    },
  },
  {
    id: "terracotta",
    name: "Terracotta",
    nameHe: "׳˜׳¨׳§׳•׳˜׳”",
    fontStyle: "mixed",
    cardStyle: "rounded",
    colors: {
      primary: "#B85C3A",
      secondary: "#D4956E",
      background: "#FAF5F0",
      cardBg: "#FFFFFF",
      text: "#3D2A1E",
      textMuted: "#8A7060",
      border: "#EBD8CA",
      socialBg: "#F7EDE4",
      socialIcon: "#B85C3A",
      buttonBg: "#B85C3A",
      buttonText: "#FFFFFF",
      headerBg: "#3D2A1E",
      headerText: "#F5E6D8",
    },
  },
];

// Social link types
export interface SocialLink {
  type: SocialLinkType;
  url: string;
}

export type SocialLinkType =
  | "facebook"
  | "instagram"
  | "whatsapp"
  | "email"
  | "website"
  | "linkedin"
  | "pinterest"
  | "tiktok"
  | "youtube"
  | "phone";

export const socialLinkConfig: Record<SocialLinkType, { label: string; labelHe: string; icon: string; placeholder: string; prefix?: string }> = {
  facebook: { label: "Facebook", labelHe: "׳₪׳™׳™׳¡׳‘׳•׳§", icon: "fb", placeholder: "https://facebook.com/...", },
  instagram: { label: "Instagram", labelHe: "׳׳™׳ ׳¡׳˜׳’׳¨׳", icon: "ig", placeholder: "@username", },
  whatsapp: { label: "WhatsApp", labelHe: "׳•׳•׳׳˜׳¡׳׳₪", icon: "wa", placeholder: "05X-XXXXXXX", prefix: "https://wa.me/972", },
  email: { label: "Email", labelHe: "׳׳™׳™׳", icon: "mail", placeholder: "email@example.com", prefix: "mailto:", },
  website: { label: "Website", labelHe: "׳׳×׳¨", icon: "web", placeholder: "https://...", },
  linkedin: { label: "LinkedIn", labelHe: "׳׳™׳ ׳§׳“׳׳™׳", icon: "li", placeholder: "https://linkedin.com/in/...", },
  pinterest: { label: "Pinterest", labelHe: "׳₪׳™׳ ׳˜׳¨׳¡׳˜", icon: "pin", placeholder: "https://pinterest.com/...", },
  tiktok: { label: "TikTok", labelHe: "׳˜׳™׳§׳˜׳•׳§", icon: "tt", placeholder: "@username", },
  youtube: { label: "YouTube", labelHe: "׳™׳•׳˜׳™׳•׳‘", icon: "yt", placeholder: "https://youtube.com/...", },
  phone: { label: "Phone", labelHe: "׳˜׳׳₪׳•׳", icon: "ph", placeholder: "05X-XXXXXXX", prefix: "tel:", },
};

// Personal field types
export interface PersonalField {
  id: string;
  label: string;
  value: string;
  icon: string;
}

export const defaultFieldTemplates = [
  { label: "׳©׳ ׳׳׳", icon: "user" },
  { label: "׳×׳₪׳§׳™׳“", icon: "briefcase" },
  { label: "׳˜׳׳₪׳•׳", icon: "phone" },
  { label: "׳׳™׳™׳", icon: "mail" },
  { label: "׳›׳×׳•׳‘׳×", icon: "mappin" },
  { label: "׳¢׳™׳¨", icon: "city" },
  { label: "׳׳×׳¨", icon: "globe" },
  { label: "׳”׳×׳׳—׳•׳×", icon: "star" },
  { label: "׳©׳ ׳•׳× ׳ ׳™׳¡׳™׳•׳", icon: "clock" },
  { label: "׳—׳‘׳¨׳”", icon: "building" },
];

// Testimonial
export interface Testimonial {
  id: string;
  name: string;
  text: string;
}

// ==========================================
// ׳’׳•׳₪׳ ׳™׳ ׳¢׳‘׳¨׳™׳™׳ ג€” Hebrew Font Options
// 30 ׳’׳•׳₪׳ ׳™ ׳“׳₪׳•׳¡ + 10 ׳’׳•׳₪׳ ׳™ ׳›׳×׳‘ ׳™׳“
// ==========================================
export type FontCategory = "print" | "handwriting";

export interface FontOption {
  id: string;
  nameHe: string;
  family: string;
  category: FontCategory;
  sampleText: string; // ׳“׳•׳’׳׳” ׳‘׳¢׳‘׳¨׳™׳×
}

// ===== 30 גופני דפוס =====
const printFonts: FontOption[] = [
  { id: "heebo", nameHe: "חיבו", family: "'Heebo', sans-serif", category: "print", sampleText: "שלום, אני מעצבת פנים" },
  { id: "assistant", nameHe: "אסיסטנט", family: "'Assistant', sans-serif", category: "print", sampleText: "עיצוב שמדבר אליך" },
  { id: "alef", nameHe: "אלף", family: "'Alef', sans-serif", category: "print", sampleText: "עברית ברורה ונקייה" },
  { id: "frank-ruhl", nameHe: "פרנק רוהל", family: "'Frank Ruhl Libre', serif", category: "print", sampleText: "אלגנטיות קלאסית" },
  { id: "david-libre", nameHe: "דוד ליברה", family: "'David Libre', serif", category: "print", sampleText: "גופן ישראלי קלאסי" },
  { id: "miriam-libre", nameHe: "מרים ליברה", family: "'Miriam Libre', sans-serif", category: "print", sampleText: "ישראלית ושמחה" },
  { id: "aviv-regular", nameHe: "אביב", family: "'Aviv Regular', sans-serif", category: "print", sampleText: "קווים נקיים ומראה עברי" },
  { id: "ashur-b", nameHe: "אשור", family: "'Ashur B', serif", category: "print", sampleText: "נוכחות קלאסית עם אופי" },
  { id: "david-libre-local", nameHe: "דוד ליברה בולד", family: "'David Libre Local', serif", category: "print", sampleText: "כותרת עברית מודגשת" },
  { id: "italki-atik", nameHe: "אטיק", family: "'Italki Atik', serif", category: "print", sampleText: "עברית מסורתית ומרשימה" },
  { id: "mekorot-vilna", nameHe: "מקורות וילנה", family: "'Mekorot Vilna', serif", category: "print", sampleText: "חותם עמוק עם אופי" },
  { id: "sbl-hebrew", nameHe: "אס בי אל עברית", family: "'SBL Hebrew', serif", category: "print", sampleText: "עברית אלגנטית לקריאה" },
  { id: "sf-hebrew", nameHe: "אס אף עברית", family: "'SF Hebrew', sans-serif", category: "print", sampleText: "מודרני, נקי ומאוזן" },
  { id: "shlomo", nameHe: "שלמה", family: "'Shlomo', serif", category: "print", sampleText: "אופי עברי קלאסי" },
];

// ===== 10 גופני כתב יד =====
const handwritingFonts: FontOption[] = [
  { id: "mark-hand", nameHe: "מארק הנד", family: "'Mark Hand', cursive", category: "handwriting", sampleText: "טאץ׳ אישי וקליל" },
  { id: "happiness-regular", nameHe: "האפי נס", family: "'Happiness Regular', cursive", category: "handwriting", sampleText: "כתב יד שמח וזורם" },
  { id: "sn-megila", nameHe: "מגילה", family: "'SN Megila', cursive", category: "handwriting", sampleText: "תחושה אמנותית וייחודית" },
];

// ׳›׳ ׳”׳’׳•׳₪׳ ׳™׳ ׳™׳—׳“
export const fontOptions: FontOption[] = [...printFonts, ...handwritingFonts];
export const printFontOptions: FontOption[] = printFonts;
export const handwritingFontOptions: FontOption[] = handwritingFonts;

export function getFontById(id: string): FontOption {
  return fontOptions.find(f => f.id === id) || fontOptions[0];
}

// Business Hours
export interface BusinessHours {
  day: string;
  dayHe: string;
  from: string;
  to: string;
  closed: boolean;
}

// Before/After portfolio item
export interface BeforeAfterItem {
  id: string;
  beforeUrl: string;
  afterUrl: string;
  caption: string;
}

// Entry animation type
export type EntryAnimation = "none" | "fade-up" | "slide-in" | "scale-in" | "stagger";

// Professional stats for infographic
export interface ProfessionalStats {
  yearsExperience: number;
  projectsCompleted: number;
  averageRating: number;
  happyClients: number;
}

// Full Business Card Data
export interface BusinessCardData {
  fields: PersonalField[];
  socialLinks: SocialLink[];
  galleryImages: string[];
  testimonials: Testimonial[];
  themeId: string;
  customColors: Partial<CardColors>;
  title?: string;
  subtitle?: string;
  avatarUrl?: string;
  logoUrl?: string;
  // Fonts
  headingFontId?: string;
  bodyFontId?: string;
  // Header background image
  headerBgImage?: string;
  // === NEW FEATURES ===
  // QR Code
  showQrCode?: boolean;
  qrCodeUrl?: string;
  // Video embed
  videoUrl?: string;
  // Entry animation
  entryAnimation?: EntryAnimation;
  // Dark/Light mode
  darkMode?: boolean;
  // Business hours
  businessHours?: BusinessHours[];
  showBusinessHours?: boolean;
  // Expertise tags
  expertiseTags?: string[];
  // Before/After portfolio
  beforeAfterItems?: BeforeAfterItem[];
  // Professional stats
  professionalStats?: ProfessionalStats;
  showStats?: boolean;
  // vCard download
  showVCard?: boolean;
  // Maps / Waze
  businessAddress?: string;
  showMapButton?: boolean;
}

export const defaultBusinessCard: BusinessCardData = {
  fields: [
    { id: "1", label: "׳©׳ ׳׳׳", value: "", icon: "user" },
    { id: "2", label: "׳×׳₪׳§׳™׳“", value: "", icon: "briefcase" },
    { id: "3", label: "׳˜׳׳₪׳•׳", value: "", icon: "phone" },
    { id: "4", label: "׳׳™׳™׳", value: "", icon: "mail" },
  ],
  socialLinks: [],
  galleryImages: [],
  testimonials: [],
  themeId: "elegant-gold",
  customColors: {},
  title: "",
  subtitle: "",
  // New features defaults
  showQrCode: false,
  entryAnimation: "none" as const,
  darkMode: false,
  showBusinessHours: false,
  expertiseTags: [],
  beforeAfterItems: [],
  showStats: false,
  professionalStats: { yearsExperience: 0, projectsCompleted: 0, averageRating: 0, happyClients: 0 },
  showVCard: false,
  showMapButton: false,
  businessAddress: "",
};

export const defaultBusinessHours: BusinessHours[] = [
  { day: "sunday", dayHe: "ראשון", from: "09:00", to: "18:00", closed: false },
  { day: "monday", dayHe: "שני", from: "09:00", to: "18:00", closed: false },
  { day: "tuesday", dayHe: "שלישי", from: "09:00", to: "18:00", closed: false },
  { day: "wednesday", dayHe: "רביעי", from: "09:00", to: "18:00", closed: false },
  { day: "thursday", dayHe: "חמישי", from: "09:00", to: "18:00", closed: false },
  { day: "friday", dayHe: "שישי", from: "09:00", to: "14:00", closed: false },
  { day: "saturday", dayHe: "שבת", from: "", to: "", closed: true },
];

export function getThemeById(id: string): CardTheme {
  return cardThemes.find(t => t.id === id) || cardThemes[0];
}

export function getMergedColors(theme: CardTheme, customColors: Partial<CardColors>): CardColors {
  return { ...theme.colors, ...customColors };
}






