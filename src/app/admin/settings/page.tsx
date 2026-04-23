"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Settings, Save, Clock, MessageCircle, CreditCard, Shield, Plus, X, Tag,
  GripVertical, Users, CheckSquare, Eye, EyeOff, Bell, FileText, Megaphone,
  ChevronDown, ChevronUp, Edit3, Trash2, AlertTriangle, Loader2, CheckCircle2,
  AlertCircle,
} from "lucide-react";

const defaultCategories = [
  "ריצוף וחיפוי", "תאורה", "ריהוט", "מטבחים", "אמבטיה",
  "חוץ ונוף", "דלתות וחלונות", "אביזרי עיצוב", "חומרי גמר",
  "שירותי בנייה", "אחר",
];

const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

interface DaySlots {
  dayOfWeek: number;
  times: string[];
}

const defaultDaySlots: DaySlots[] = [
  { dayOfWeek: 0, times: ["10:30", "13:30", "20:30"] },
  { dayOfWeek: 1, times: ["10:30", "13:30", "20:30"] },
  { dayOfWeek: 2, times: ["10:30", "13:30", "20:30"] },
  { dayOfWeek: 3, times: ["10:30", "13:30", "20:30"] },
  { dayOfWeek: 4, times: ["10:30", "13:30", "20:30"] },
  { dayOfWeek: 5, times: ["10:30"] },
  { dayOfWeek: 6, times: [] },
];

// --- Feature 17: Roles & Permissions ---
const roles = [
  { id: "admin", label: "אדמין" },
  { id: "content_manager", label: "מנהלת תוכן" },
  { id: "supplier_manager", label: "מנהלת ספקים" },
  { id: "viewer", label: "צופה" },
];

const permissions = [
  { id: "manage_suppliers", label: "ניהול ספקים" },
  { id: "manage_designers", label: "ניהול מעצבות" },
  { id: "approve_posts", label: "אישור פוסטים" },
  { id: "manage_events", label: "ניהול אירועים" },
  { id: "manage_lotteries", label: "ניהול הגרלות" },
  { id: "view_reports", label: "צפייה בדוחות" },
  { id: "manage_settings", label: "ניהול הגדרות" },
  { id: "manage_automations", label: "ניהול אוטומציות" },
];

type PermissionMatrix = Record<string, Record<string, boolean>>;

const defaultPermissions: PermissionMatrix = {
  admin: Object.fromEntries(permissions.map((p) => [p.id, true])),
  content_manager: {
    manage_suppliers: false, manage_designers: false, approve_posts: true,
    manage_events: true, manage_lotteries: false, view_reports: false,
    manage_settings: false, manage_automations: false,
  },
  supplier_manager: {
    manage_suppliers: true, manage_designers: false, approve_posts: false,
    manage_events: false, manage_lotteries: false, view_reports: true,
    manage_settings: false, manage_automations: false,
  },
  viewer: {
    manage_suppliers: false, manage_designers: false, approve_posts: false,
    manage_events: false, manage_lotteries: false, view_reports: true,
    manage_settings: false, manage_automations: false,
  },
};

// --- Feature 18: Banners & Tips ---
interface Banner {
  id: number;
  title: string;
  body: string;
  type: "info" | "warning" | "promo";
  scheduleFrom: string;
  scheduleTo: string;
  audience: "all" | "designers" | "suppliers";
  active: boolean;
}

const defaultBanners: Banner[] = [
  {
    id: 1, title: "מבצע חורף 2026", body: "הנחות של עד 30% על כל מוצרי התאורה לחברות הקהילה. המבצע בתוקף עד סוף מרץ.",
    type: "promo", scheduleFrom: "2026-03-01", scheduleTo: "2026-03-31", audience: "all", active: true,
  },
  {
    id: 2, title: "עדכון תנאי שימוש", body: "תנאי השימוש עודכנו. אנא קראו את התנאים החדשים באזור האישי.",
    type: "info", scheduleFrom: "2026-03-15", scheduleTo: "2026-04-15", audience: "designers", active: true,
  },
  {
    id: 3, title: "תחזוקה מתוכננת", body: "המערכת תהיה מושבתת ביום שישי 21/03 בין 02:00-06:00 לצורך שדרוג.",
    type: "warning", scheduleFrom: "2026-03-19", scheduleTo: "2026-03-21", audience: "all", active: false,
  },
];

const defaultTips = [
  "ניתן לסנן ספקים לפי קטגוריה בעזרת תפריט הסינון בראש הדף",
  "לחצו על כפתור הלב כדי לשמור ספקים למועדפים",
  "ניתן לצפות בדוחות פעילות חודשיים באזור הניהול",
  "שתפו פוסטים ישירות מהפיד לקבוצות העיצוב שלכם",
  "עדכנו את הפרופיל שלכם כדי לקבל המלצות מותאמות אישית",
];

const bannerTypeLabels: Record<string, string> = { info: "מידע", warning: "אזהרה", promo: "קידום" };
const audienceLabels: Record<string, string> = { all: "כולם", designers: "מעצבות", suppliers: "ספקים" };

const bannerTypeColors: Record<string, string> = {
  info: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  promo: "border-gold/40 bg-gold/10 text-gold",
};

const bannerTypeIcons: Record<string, typeof FileText> = {
  info: FileText,
  warning: AlertTriangle,
  promo: Megaphone,
};

type TabKey = "general" | "roles" | "banners";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  // General settings state
  const [categories, setCategories] = useState(defaultCategories);
  const [newCategory, setNewCategory] = useState("");
  const [daySlots, setDaySlots] = useState(defaultDaySlots);
  const [reminderDays, setReminderDays] = useState([7, 14, 21]);

  // iCount state
  const [icountApiKey, setIcountApiKey] = useState("");
  const [icountCompanyId, setIcountCompanyId] = useState("");
  const [icountUser, setIcountUser] = useState("");
  const [icountPass, setIcountPass] = useState("");
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasAllIcount, setHasAllIcount] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Security state
  const [adminEmail, setAdminEmail] = useState("z.adrichalut@gmail.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  // Loading / saving state
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");

  // Feature 17 state
  const [permMatrix, setPermMatrix] = useState<PermissionMatrix>(defaultPermissions);

  // Feature 18 state
  const [banners, setBanners] = useState<Banner[]>(defaultBanners);
  const [tips, setTips] = useState(defaultTips);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [bannerForm, setBannerForm] = useState<Omit<Banner, "id">>({
    title: "", body: "", type: "info", scheduleFrom: "", scheduleTo: "", audience: "all", active: true,
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.categories?.length) setCategories(data.categories);
          if (data.daySlots?.length) setDaySlots(data.daySlots);
          if (data.reminderDays?.length) setReminderDays(data.reminderDays);
          if (data.icount) {
            setIcountApiKey(data.icount.apiKey || "");
            setIcountCompanyId(data.icount.companyId || "");
            setIcountUser(data.icount.user || "");
            setIcountPass(data.icount.pass || "");
          }
          if (data._hasApiKey) setHasApiKey(true);
          if (data._hasAllIcount) setHasAllIcount(true);
          if (data.security?.adminEmail) setAdminEmail(data.security.adminEmail);
          if (data.permissions && Object.keys(data.permissions).length > 0) {
            setPermMatrix(data.permissions);
          }
          if (data.banners?.length) setBanners(data.banners);
          if (data.tips?.length) setTips(data.tips);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setPageLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Save all settings
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveStatus("idle");
    setSaveMessage("");
    try {
      const payload: Record<string, unknown> = {
        categories,
        daySlots,
        reminderDays,
        icount: {
          apiKey: icountApiKey,
          companyId: icountCompanyId,
          user: icountUser,
          pass: icountPass,
        },
        security: {
          adminEmail,
        },
        permissions: permMatrix,
        banners,
        tips,
      };
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveStatus("success");
        setSaveMessage("ההגדרות נשמרו בהצלחה!");
        // Update masked key from response
        if (data.settings?.icount) {
          setIcountApiKey(data.settings.icount.apiKey || "");
          setIcountCompanyId(data.settings.icount.companyId || "");
          setIcountUser(data.settings.icount.user || "");
          setIcountPass(data.settings.icount.pass || "");
          setHasApiKey(!!data.settings._hasApiKey);
          setHasAllIcount(!!data.settings._hasAllIcount);
        }
      } else {
        setSaveStatus("error");
        setSaveMessage(data.error || "שגיאה בשמירת הגדרות");
      }
    } catch {
      setSaveStatus("error");
      setSaveMessage("שגיאת רשת — נסי שוב");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  }, [categories, daySlots, reminderDays, icountApiKey, icountCompanyId, icountUser, icountPass, adminEmail, permMatrix, banners, tips]);

  // --- General handlers ---
  const handleAddCategory = () => {
    if (!newCategory.trim() || categories.includes(newCategory.trim())) return;
    setCategories([...categories, newCategory.trim()]);
    setNewCategory("");
  };
  const handleRemoveCategory = (cat: string) => {
    setCategories(categories.filter((c) => c !== cat));
  };
  const handleAddTimeSlot = (dayIndex: number) => {
    const time = prompt("הזיני שעה (למשל 16:00):");
    if (!time || !time.match(/^\d{1,2}:\d{2}$/)) return;
    const newSlots = [...daySlots];
    if (!newSlots[dayIndex].times.includes(time)) {
      newSlots[dayIndex].times.push(time);
      newSlots[dayIndex].times.sort();
      setDaySlots(newSlots);
    }
  };
  const handleRemoveTimeSlot = (dayIndex: number, time: string) => {
    const newSlots = [...daySlots];
    newSlots[dayIndex].times = newSlots[dayIndex].times.filter((t) => t !== time);
    setDaySlots(newSlots);
  };

  // --- Feature 17 handlers ---
  const togglePermission = (roleId: string, permId: string) => {
    setPermMatrix((prev) => ({
      ...prev,
      [roleId]: { ...prev[roleId], [permId]: !prev[roleId][permId] },
    }));
  };

  // --- Feature 18 handlers ---
  const toggleBannerActive = (id: number) => {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b)));
  };
  const deleteBanner = (id: number) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };
  const addBanner = () => {
    if (!bannerForm.title.trim() || !bannerForm.body.trim()) return;
    const newId = banners.length > 0 ? Math.max(...banners.map((b) => b.id)) + 1 : 1;
    setBanners([...banners, { ...bannerForm, id: newId }]);
    setBannerForm({ title: "", body: "", type: "info", scheduleFrom: "", scheduleTo: "", audience: "all", active: true });
    setShowBannerForm(false);
  };
  const moveTip = (index: number, direction: "up" | "down") => {
    const newTips = [...tips];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTips.length) return;
    [newTips[index], newTips[targetIndex]] = [newTips[targetIndex], newTips[index]];
    setTips(newTips);
  };

  const tabs: { key: TabKey; label: string; icon: typeof Settings }[] = [
    { key: "general", label: "כללי", icon: Settings },
    { key: "roles", label: "תפקידים והרשאות", icon: Users },
    { key: "banners", label: "באנרים וטיפים", icon: Megaphone },
  ];

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-gold mx-auto" />
          <p className="text-text-muted text-sm">{"טוענת הגדרות..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-heading text-text-primary flex items-center gap-2">
          <Settings className="w-7 h-7" />
          {"הגדרות מערכת"}
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border-subtle pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-bg-surface text-gold border border-border-subtle border-b-transparent"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== TAB: כללי ===== */}
      {activeTab === "general" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* קטגוריות ספקים */}
          <div className="card-static lg:col-span-2">
            <h2 className="text-lg font-heading text-text-primary flex items-center gap-2 mb-4">
              <Tag className="w-5 h-5" />{"קטגוריות ספקים"}
            </h2>
            <p className="text-text-muted text-sm mb-4">
              {"הוספה והסרה של קטגוריות — שינוי כאן ישפיע על כל הטפסים במערכת"}
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center gap-1.5 bg-bg-surface border border-border-subtle rounded-btn px-3 py-1.5 group">
                  <GripVertical className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100" />
                  <span className="text-text-primary text-sm">{cat}</span>
                  <button onClick={() => handleRemoveCategory(cat)} className="text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddCategory()} placeholder="הוסיפי קטגוריה חדשה..." className="input-field flex-1" />
              <button onClick={handleAddCategory} disabled={!newCategory.trim()} className="btn-gold flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />{"הוסף"}
              </button>
            </div>
          </div>

          {/* שעות פרסום לפי יום */}
          <div className="card-static lg:col-span-2">
            <h2 className="text-lg font-heading text-text-primary flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" />{"שעות פרסום לפי יום"}
            </h2>
            <p className="text-text-muted text-sm mb-4">{"הגדירי שעות פרסום שונות לכל יום בשבוע"}</p>
            <div className="space-y-3">
              {daySlots.map((day, dayIndex) => (
                <div key={day.dayOfWeek} className="flex items-center gap-3 p-3 bg-bg-surface rounded-card">
                  <span className="text-text-primary font-medium w-16 text-sm">{dayNames[day.dayOfWeek]}</span>
                  <div className="flex-1 flex flex-wrap gap-2">
                    {day.times.map((time) => (
                      <div key={time} className="flex items-center gap-1 bg-gold/10 border border-gold/30 rounded px-2 py-1">
                        <span className="text-gold text-sm font-mono">{time}</span>
                        <button onClick={() => handleRemoveTimeSlot(dayIndex, time)} className="text-gold/50 hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {day.times.length === 0 && <span className="text-text-muted text-xs py-1">{"ללא פרסום"}</span>}
                  </div>
                  <button onClick={() => handleAddTimeSlot(dayIndex)} className="text-text-muted hover:text-gold transition-colors p-1" title="הוסף שעה">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ימי תזכורת */}
          <div className="card-static">
            <h2 className="text-lg font-heading text-text-primary flex items-center gap-2 mb-4">
              <MessageCircle className="w-5 h-5" />{"ימי תזכורת לספקים"}
            </h2>
            <div className="space-y-3">
              {["תזכורת ראשונה", "תזכורת שנייה", "התראה קריטית"].map((label, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-text-muted text-sm w-32">{label}:</span>
                  <input type="number" value={reminderDays[i]} onChange={(e) => {
                    const newDays = [...reminderDays];
                    newDays[i] = Number(e.target.value);
                    setReminderDays(newDays);
                  }} className="input-dark w-20 text-center" />
                  <span className="text-text-muted text-sm">{"ימים"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* iCount */}
          <div className="card-static lg:col-span-2">
            <h2 className="text-lg font-heading text-text-primary flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5" />{"חיבור iCount — סליקה וחשבוניות"}
            </h2>
            <p className="text-text-muted text-sm mb-4">
              {"יש למלא את כל 4 השדות כדי לחבר את מערכת הסליקה. הפרטים נמצאים בהגדרות חשבון iCount שלך."}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-text-muted text-sm block mb-1">{"מזהה חברה (Company ID)"}</label>
                <input
                  type="text"
                  value={icountCompanyId}
                  onChange={(e) => setIcountCompanyId(e.target.value)}
                  placeholder="לדוגמה: 12345"
                  className="input-dark w-full"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-text-muted text-sm block mb-1">{"שם משתמש iCount"}</label>
                <input
                  type="text"
                  value={icountUser}
                  onChange={(e) => setIcountUser(e.target.value)}
                  placeholder="לדוגמה: user@company.co.il"
                  className="input-dark w-full"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-text-muted text-sm block mb-1">{"סיסמת iCount"}</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={icountPass}
                    onChange={(e) => setIcountPass(e.target.value)}
                    placeholder="סיסמת החשבון ב-iCount"
                    className="input-dark w-full pl-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-text-muted text-sm block mb-1">{"API Key / Token"}</label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={icountApiKey}
                    onChange={(e) => setIcountApiKey(e.target.value)}
                    placeholder="מפתח API מתוך הגדרות iCount"
                    className="input-dark w-full pl-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-gold transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4">
              {hasAllIcount ? (
                <p className="text-emerald-600 text-sm flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {"כל פרטי iCount מוגדרים — מערכת הסליקה מחוברת"}
                </p>
              ) : hasApiKey ? (
                <p className="text-amber-500 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {"חלק מהפרטים חסרים — מלאי את כל 4 השדות כדי להפעיל סליקה אמיתית"}
                </p>
              ) : (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {"לא הוגדרו פרטי iCount — המערכת רצה במצב בדיקה (ללא סליקה אמיתית)"}
                </p>
              )}
            </div>
          </div>

          {/* אבטחה */}
          <div className="card-static">
            <h2 className="text-lg font-heading text-text-primary flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5" />{"אבטחה"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-text-muted text-sm block mb-1">{"מייל אדמין"}</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="input-dark w-full"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-text-muted text-sm block mb-1">{"סיסמה נוכחית"}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="הכניסי את הסיסמה הנוכחית"
                  className="input-dark w-full"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <label className="text-text-muted text-sm block mb-1">{"סיסמה חדשה"}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="לפחות 8 תווים"
                  className="input-dark w-full"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-text-muted text-sm block mb-1">{"אימות סיסמה חדשה"}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="חזרי על הסיסמה החדשה"
                  className="input-dark w-full"
                  autoComplete="new-password"
                />
              </div>
              {pwMessage && (
                <p className={`text-sm ${pwMessage.kind === "success" ? "text-emerald-400" : "text-red-400"}`}>
                  {pwMessage.text}
                </p>
              )}
              <button
                type="button"
                disabled={pwBusy}
                className="btn-outline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={async () => {
                  setPwMessage(null);
                  if (!currentPassword || !newPassword || !confirmPassword) {
                    setPwMessage({ kind: "error", text: "יש למלא את כל השדות" });
                    return;
                  }
                  if (newPassword.length < 8) {
                    setPwMessage({ kind: "error", text: "הסיסמה החדשה חייבת להכיל לפחות 8 תווים" });
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    setPwMessage({ kind: "error", text: "הסיסמאות החדשות אינן תואמות" });
                    return;
                  }
                  setPwBusy(true);
                  try {
                    const res = await fetch("/api/admin/settings/password", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ currentPassword, newPassword }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setPwMessage({ kind: "error", text: data?.error || "שגיאה בעדכון הסיסמה" });
                    } else {
                      setPwMessage({ kind: "success", text: "הסיסמה עודכנה בהצלחה" });
                      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
                    }
                  } catch (err) {
                    console.error("Password change error:", err);
                    setPwMessage({ kind: "error", text: "שגיאת רשת. נסי שוב." });
                  } finally {
                    setPwBusy(false);
                  }
                }}
              >
                {pwBusy ? "מעדכן..." : "עדכן סיסמה"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: תפקידים והרשאות ===== */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          <div className="card-static">
            <h2 className="text-lg font-heading text-text-primary flex items-center gap-2 mb-2">
              <Users className="w-5 h-5" />{"תפקידים והרשאות"}
            </h2>
            <p className="text-text-muted text-sm mb-6">
              {"הגדירי אילו הרשאות יש לכל תפקיד במערכת. סמני או בטלי סימון כדי לשנות גישה."}
            </p>
            <div className="gold-separator mb-6" />

            <div className="overflow-x-auto">
              <table className="table-luxury w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-right py-3 px-4 text-text-muted font-medium">{"הרשאה"}</th>
                    {roles.map((role) => (
                      <th key={role.id} className="text-center py-3 px-4 text-text-primary font-heading">
                        {role.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm) => (
                    <tr key={perm.id} className="border-t border-border-subtle hover:bg-bg-surface/50 transition-colors">
                      <td className="py-3 px-4 text-text-primary">{perm.label}</td>
                      {roles.map((role) => (
                        <td key={role.id} className="text-center py-3 px-4">
                          <button
                            onClick={() => togglePermission(role.id, perm.id)}
                            className={`w-5 h-5 rounded border transition-colors inline-flex items-center justify-center ${
                              permMatrix[role.id]?.[perm.id]
                                ? "bg-gold border-gold text-black"
                                : "border-border-subtle bg-bg-surface text-transparent hover:border-gold/50"
                            }`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {roles.map((role) => {
                const count = Object.values(permMatrix[role.id] || {}).filter(Boolean).length;
                return (
                  <div key={role.id} className="badge-gold px-3 py-1 text-xs">
                    {role.label}: {count}/{permissions.length} {"הרשאות"}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB: באנרים וטיפים ===== */}
      {activeTab === "banners" && (
        <div className="space-y-6">
          {/* Banner Management */}
          <div className="card-static">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading text-text-primary flex items-center gap-2">
                <Megaphone className="w-5 h-5" />{"ניהול באנרים וטיפים"}
              </h2>
              <button onClick={() => setShowBannerForm(!showBannerForm)} className="btn-gold flex items-center gap-1 text-sm">
                <Plus className="w-4 h-4" />{"הוסף באנר"}
              </button>
            </div>
            <p className="text-text-muted text-sm mb-6">
              {"ניהול באנרים שמוצגים למשתמשות, כולל תזמון, קהל יעד וסוג הודעה."}
            </p>

            {/* Add Banner Form */}
            {showBannerForm && (
              <div className="bg-bg-surface border border-border-subtle rounded-card p-4 mb-6 space-y-4">
                <h3 className="text-text-primary font-heading text-sm mb-2">{"באנר חדש"}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-text-muted text-sm block mb-1">{"כותרת"}</label>
                    <input type="text" value={bannerForm.title} onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })} className="input-dark w-full" placeholder="כותרת הבאנר..." />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-text-muted text-sm block mb-1">{"סוג"}</label>
                      <select value={bannerForm.type} onChange={(e) => setBannerForm({ ...bannerForm, type: e.target.value as Banner["type"] })} className="select-dark w-full">
                        <option value="info">{"מידע"}</option>
                        <option value="warning">{"אזהרה"}</option>
                        <option value="promo">{"קידום"}</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-text-muted text-sm block mb-1">{"קהל יעד"}</label>
                      <select value={bannerForm.audience} onChange={(e) => setBannerForm({ ...bannerForm, audience: e.target.value as Banner["audience"] })} className="select-dark w-full">
                        <option value="all">{"כולם"}</option>
                        <option value="designers">{"מעצבות"}</option>
                        <option value="suppliers">{"ספקים"}</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-text-muted text-sm block mb-1">{"תוכן"}</label>
                  <textarea value={bannerForm.body} onChange={(e) => setBannerForm({ ...bannerForm, body: e.target.value })} className="input-dark w-full h-20 resize-none" placeholder="תוכן הבאנר..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-text-muted text-sm block mb-1">{"מתאריך"}</label>
                    <input type="date" value={bannerForm.scheduleFrom} onChange={(e) => setBannerForm({ ...bannerForm, scheduleFrom: e.target.value })} className="input-dark w-full" />
                  </div>
                  <div>
                    <label className="text-text-muted text-sm block mb-1">{"עד תאריך"}</label>
                    <input type="date" value={bannerForm.scheduleTo} onChange={(e) => setBannerForm({ ...bannerForm, scheduleTo: e.target.value })} className="input-dark w-full" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowBannerForm(false)} className="btn-outline text-sm">{"ביטול"}</button>
                  <button onClick={addBanner} disabled={!bannerForm.title.trim() || !bannerForm.body.trim()} className="btn-gold text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="w-4 h-4 inline mr-1" />{"הוסף באנר"}
                  </button>
                </div>
              </div>
            )}

            {/* Banner List */}
            <div className="space-y-4">
              {banners.map((banner) => {
                const TypeIcon = bannerTypeIcons[banner.type];
                return (
                  <div key={banner.id} className="bg-bg-surface border border-border-subtle rounded-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${bannerTypeColors[banner.type]}`}>
                            <TypeIcon className="w-3 h-3" />
                            {bannerTypeLabels[banner.type]}
                          </span>
                          <span className="text-text-muted text-xs">
                            {"קהל: "}{audienceLabels[banner.audience]}
                          </span>
                          {banner.scheduleFrom && (
                            <span className="text-text-muted text-xs">
                              {banner.scheduleFrom} — {banner.scheduleTo}
                            </span>
                          )}
                        </div>
                        <h3 className="text-text-primary font-heading text-sm">{banner.title}</h3>
                        <p className="text-text-muted text-sm mt-1">{banner.body}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Active toggle */}
                        <button
                          onClick={() => toggleBannerActive(banner.id)}
                          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            banner.active
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-bg-surface border-border-subtle text-text-muted"
                          }`}
                        >
                          {banner.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {banner.active ? "פעיל" : "מושבת"}
                        </button>
                        <button onClick={() => deleteBanner(banner.id)} className="text-text-muted hover:text-red-500 transition-colors p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Preview Card */}
                    <div className={`mt-3 p-3 rounded-lg border ${bannerTypeColors[banner.type]}`}>
                      <div className="flex items-center gap-2 text-xs mb-1 opacity-60">
                        <Eye className="w-3 h-3" />{"תצוגה מקדימה"}
                      </div>
                      <div className="flex items-start gap-2">
                        <TypeIcon className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-heading text-sm">{banner.title}</p>
                          <p className="text-xs mt-0.5 opacity-80">{banner.body}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tip of the Day */}
          <div className="card-static">
            <h2 className="text-lg font-heading text-text-primary flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5" />{"טיפ היום"}
            </h2>
            <p className="text-text-muted text-sm mb-4">
              {"סדרי את הטיפים לפי סדר הצגה. הטיפ הראשון ברשימה יוצג היום."}
            </p>
            <div className="gold-separator mb-4" />
            <div className="space-y-2">
              {tips.map((tip, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-bg-surface rounded-card group">
                  <span className="text-gold font-heading text-sm w-6 text-center">{index + 1}</span>
                  <span className="flex-1 text-text-primary text-sm">{tip}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveTip(index, "up")}
                      disabled={index === 0}
                      className="text-text-muted hover:text-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed p-1"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveTip(index, "down")}
                      disabled={index === tips.length - 1}
                      className="text-text-muted hover:text-gold transition-colors disabled:opacity-30 disabled:cursor-not-allowed p-1"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center justify-end gap-3">
        {saveStatus === "success" && (
          <span className="text-emerald-600 text-sm flex items-center gap-1 animate-in">
            <CheckCircle2 className="w-4 h-4" />
            {saveMessage}
          </span>
        )}
        {saveStatus === "error" && (
          <span className="text-red-500 text-sm flex items-center gap-1 animate-in">
            <AlertCircle className="w-4 h-4" />
            {saveMessage}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "שומרת..." : "שמור הגדרות"}
        </button>
      </div>
    </div>
  );
}
