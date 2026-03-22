"use client";

import { useState, useEffect } from "react";
import {
  Settings, Plus, X, Save, Palette, Bell, Clock, Mail, Eye,
  CalendarDays, AlertTriangle, FileText, Star, Zap
} from "lucide-react";

type CrmSettingsData = {
  id: string;
  companyName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  tagline: string | null;
  defaultPhases: string[] | string;
  welcomeMessage: string | null;
  completionMessage: string | null;
  officeHoursEnabled: boolean;
  officeHoursDays: number[];
  officeHoursStart: string | null;
  officeHoursEnd: string | null;
};

type AutomationRule = {
  id: string;
  ruleType: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
};

const AUTOMATION_TYPES = [
  {
    ruleType: "phase_complete_notify",
    label: "עדכון שלב אוטומטי ללקוח",
    description: "כשמעבירים שלב בפרויקט — הלקוח מקבל מייל עם סיכום ושלב הבא",
    icon: Bell,
    defaultConfig: { includeNextPhase: true, includeProgress: true },
  },
  {
    ruleType: "weekly_summary",
    label: "סיכום שבועי אוטומטי",
    description: "מייל שבועי ללקוח עם עדכוני פרויקט, תמונות חדשות ומשימות שהושלמו",
    icon: Mail,
    defaultConfig: { dayOfWeek: 0, hour: 9 },
  },
  {
    ruleType: "office_hours",
    label: "שעות קבלה דיגיטליות",
    description: "הודעות מחוץ לשעות מסומנות — הלקוח יודע מתי את זמינה",
    icon: Clock,
    defaultConfig: { days: [0, 1, 2, 3, 4], start: "10:00", end: "17:00" },
  },
  {
    ruleType: "pending_reminder",
    label: "תזכורות לפעולות ממתינות",
    description: "תזכורת אוטומטית ללקוח שלא אישר תוך 48 שעות, והתראה למעצבת אחרי 5 ימים",
    icon: AlertTriangle,
    defaultConfig: { hoursBeforeFirst: 48, hoursBeforeSecond: 120, notifyDesigner: true },
  },
  {
    ruleType: "countdown_alerts",
    label: "ספירה לאחור חכמה",
    description: "הלקוח רואה טיימר כמה ימים נותרו לכל שלב עם דדליין",
    icon: CalendarDays,
    defaultConfig: { daysBeforeDeadline: [7, 3, 1], showInPortal: true },
  },
  {
    ruleType: "smart_alerts",
    label: "התראות חכמות למעצבת",
    description: "אינסייטים: הלקוח נכנס לפורטל, צפה בהדמיה, לא נכנס שבועיים",
    icon: Eye,
    defaultConfig: { trackViews: true, inactivityDays: 14, notifyOnFirstView: true },
  },
  {
    ruleType: "auto_report",
    label: "דוח סיכום פרויקט אוטומטי",
    description: "כשפרויקט מסתיים — נוצר PDF סיכום עם ציר זמן, חומרים ותמונות",
    icon: FileText,
    defaultConfig: { includeTimeline: true, includePhotos: true, includeMaterials: true },
  },
  {
    ruleType: "auto_recommendation",
    label: "בקשת המלצה אוטומטית",
    description: "בסוף פרויקט מוצלח — הלקוח מקבל בקשה להשאיר המלצה בזירת האדריכלות",
    icon: Star,
    defaultConfig: { minSurveyScore: 4, delayDays: 3 },
  },
];

const DAY_NAMES = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

export default function CrmSettings() {
  const [settings, setSettings] = useState<CrmSettingsData | null>(null);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newPhase, setNewPhase] = useState("");
  const [activeSection, setActiveSection] = useState<"branding" | "phases" | "messages" | "office-hours" | "automations" | "notifications">("branding");

  const [formData, setFormData] = useState({
    companyName: "",
    primaryColor: "#2563eb",
    secondaryColor: "#f59e0b",
    tagline: "",
    welcomeMessage: "",
    completionMessage: "",
    defaultPhases: [] as string[],
    officeHoursEnabled: false,
    officeHoursDays: [0, 1, 2, 3, 4] as number[],
    officeHoursStart: "10:00",
    officeHoursEnd: "17:00",
    notifyEmail: true,
    notifyWhatsApp: false,
  });

  useEffect(() => {
    fetchSettings();
    fetchAutomations();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/designer/crm/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        let phases: string[] = [];
        try {
          phases = typeof data.defaultPhases === "string"
            ? JSON.parse(data.defaultPhases)
            : data.defaultPhases;
        } catch {
          phases = ["ייעוץ ראשוני", "תכנון ועיצוב", "בחירת חומרים", "ביצוע", "פיקוח", "מסירה"];
        }
        let ohDays: number[] = [0, 1, 2, 3, 4];
        try {
          ohDays = typeof data.officeHoursDays === "string"
            ? JSON.parse(data.officeHoursDays)
            : data.officeHoursDays || [0, 1, 2, 3, 4];
        } catch { /* keep default */ }
        let notif: Record<string, boolean> = {};
        try {
          notif = typeof data.notifications === "string"
            ? JSON.parse(data.notifications)
            : data.notifications || {};
        } catch { /* keep default */ }
        setFormData({
          companyName: data.companyName || "",
          primaryColor: data.primaryColor || "#2563eb",
          secondaryColor: data.secondaryColor || "#f59e0b",
          tagline: data.tagline || "",
          welcomeMessage: data.welcomeMessage || "",
          completionMessage: data.completionMessage || "",
          defaultPhases: Array.isArray(phases) ? phases : [],
          officeHoursEnabled: data.officeHoursEnabled || false,
          officeHoursDays: ohDays,
          officeHoursStart: data.officeHoursStart || "10:00",
          officeHoursEnd: data.officeHoursEnd || "17:00",
          notifyEmail: notif.email !== undefined ? notif.email : true,
          notifyWhatsApp: notif.whatsapp !== undefined ? notif.whatsapp : false,
        });
      }
    } catch {
      console.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const fetchAutomations = async () => {
    try {
      const res = await fetch("/api/designer/crm/automations");
      if (res.ok) {
        const data = await res.json();
        setAutomations(data);
      }
    } catch {
      console.error("Failed to fetch automations");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/designer/crm/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          defaultPhases: formData.defaultPhases,
          notifications: {
            email: formData.notifyEmail,
            whatsapp: formData.notifyWhatsApp,
          },
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      console.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleAutomation = async (ruleType: string) => {
    const existing = automations.find(a => a.ruleType === ruleType);
    const automationType = AUTOMATION_TYPES.find(a => a.ruleType === ruleType);

    try {
      if (existing) {
        // Toggle existing
        const res = await fetch(`/api/designer/crm/automations/${ruleType}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isEnabled: !existing.isEnabled }),
        });
        if (res.ok) {
          const updated = await res.json();
          setAutomations(prev => prev.map(a => a.ruleType === ruleType ? updated : a));
        }
      } else {
        // Create new
        const res = await fetch("/api/designer/crm/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ruleType,
            isEnabled: true,
            config: automationType?.defaultConfig || {},
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setAutomations(prev => [...prev, created]);
        }
      }
    } catch {
      console.error("Failed to toggle automation");
    }
  };

  const addPhase = () => {
    if (!newPhase.trim()) return;
    setFormData({
      ...formData,
      defaultPhases: [...formData.defaultPhases, newPhase.trim()],
    });
    setNewPhase("");
  };

  const removePhase = (index: number) => {
    setFormData({
      ...formData,
      defaultPhases: formData.defaultPhases.filter((_, i) => i !== index),
    });
  };

  const movePhase = (index: number, direction: "up" | "down") => {
    const newPhases = [...formData.defaultPhases];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newPhases.length) return;
    [newPhases[index], newPhases[newIndex]] = [newPhases[newIndex], newPhases[index]];
    setFormData({ ...formData, defaultPhases: newPhases });
  };

  const toggleDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      officeHoursDays: prev.officeHoursDays.includes(day)
        ? prev.officeHoursDays.filter(d => d !== day)
        : [...prev.officeHoursDays, day].sort(),
    }));
  };

  if (loading) {
    return <div className="text-center py-12 text-text-muted">טוען...</div>;
  }

  const sections = [
    { key: "branding" as const, label: "מיתוג", icon: Palette },
    { key: "phases" as const, label: "שלבי פרויקט", icon: Settings },
    { key: "messages" as const, label: "הודעות", icon: Mail },
    { key: "office-hours" as const, label: "שעות קבלה", icon: Clock },
    { key: "notifications" as const, label: "העדפות התראות", icon: Bell },
    { key: "automations" as const, label: "אוטומציות", icon: Zap },
  ];

  return (
    <div className="space-y-6 animate-in max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-text-primary flex items-center gap-2">
          <Settings className="w-5 h-5 text-gold" />
          הגדרות CRM
        </h2>
        {saved && (
          <span className="text-emerald-600 text-sm animate-in">✓ נשמר בהצלחה</span>
        )}
      </div>

      {/* Section nav */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${activeSection === s.key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              <Icon size={14} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Branding */}
      {activeSection === "branding" && (
        <div className="card-static space-y-4">
          <h3 className="text-base font-heading text-text-primary flex items-center gap-2">
            <Palette className="w-4 h-4 text-gold" />
            מיתוג
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">שם החברה/סטודיו</label>
              <input
                type="text"
                className="input-field"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="לדוגמה: סטודיו נועה דיזיין"
              />
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">סלוגן</label>
              <input
                type="text"
                className="input-field"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="לדוגמה: עיצוב שמספר סיפור"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">צבע ראשי</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-btn cursor-pointer border border-border-subtle"
                />
                <input
                  type="text"
                  className="input-field flex-1"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">צבע משני</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="w-10 h-10 rounded-btn cursor-pointer border border-border-subtle"
                />
                <input
                  type="text"
                  className="input-field flex-1"
                  value={formData.secondaryColor}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Default Phases */}
      {activeSection === "phases" && (
        <div className="card-static space-y-4">
          <h3 className="text-base font-heading text-text-primary">
            שלבי פרויקט ברירת מחדל
          </h3>
          <p className="text-text-muted text-xs">
            השלבים האלה ייווצרו אוטומטית כשתפתחי פרויקט חדש. ניתן לשנות בכל פרויקט בנפרד.
          </p>
          <div className="space-y-2">
            {formData.defaultPhases.map((phase, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-bg-surface rounded-btn"
              >
                <span className="text-text-muted text-xs font-mono w-5 text-center">{index + 1}</span>
                <span className="text-text-primary text-sm flex-1">{phase}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => movePhase(index, "up")}
                    disabled={index === 0}
                    className="text-xs px-1.5 py-0.5 text-text-muted hover:text-gold disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => movePhase(index, "down")}
                    disabled={index === formData.defaultPhases.length - 1}
                    className="text-xs px-1.5 py-0.5 text-text-muted hover:text-gold disabled:opacity-30"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removePhase(index)}
                    className="text-xs px-1.5 py-0.5 text-text-muted hover:text-red-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field flex-1"
              value={newPhase}
              onChange={(e) => setNewPhase(e.target.value)}
              placeholder="שלב חדש..."
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPhase())}
            />
            <button onClick={addPhase} className="btn-outline text-sm px-3 flex items-center gap-1">
              <Plus className="w-4 h-4" />
              הוסף
            </button>
          </div>
        </div>
      )}

      {/* Auto Messages */}
      {activeSection === "messages" && (
        <div className="card-static space-y-4">
          <h3 className="text-base font-heading text-text-primary">הודעות אוטומטיות</h3>
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">
              הודעת פתיחה ללקוח חדש
            </label>
            <textarea
              className="input-field h-20 resize-none"
              value={formData.welcomeMessage}
              onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
              placeholder="שלום! שמחה שהחלטת לעבוד איתי..."
            />
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">
              הודעת סיום פרויקט
            </label>
            <textarea
              className="input-field h-20 resize-none"
              value={formData.completionMessage}
              onChange={(e) => setFormData({ ...formData, completionMessage: e.target.value })}
              placeholder="הפרויקט הושלם בהצלחה! תודה על שיתוף הפעולה..."
            />
          </div>
        </div>
      )}

      {/* Office Hours */}
      {activeSection === "office-hours" && (
        <div className="card-static space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-heading text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold" />
              שעות קבלה דיגיטליות
            </h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600">{formData.officeHoursEnabled ? "פעיל" : "כבוי"}</span>
              <div
                onClick={() => setFormData({ ...formData, officeHoursEnabled: !formData.officeHoursEnabled })}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${formData.officeHoursEnabled ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${formData.officeHoursEnabled ? "right-0.5" : "right-[22px]"}`} />
              </div>
            </label>
          </div>

          <p className="text-text-muted text-xs">
            הלקוח רואה בפורטל מתי את זמינה. הודעות מחוץ לשעות מסומנות כ&ldquo;תיענה בשעות הפעילות&rdquo;.
          </p>

          {formData.officeHoursEnabled && (
            <>
              <div>
                <label className="text-text-secondary text-sm font-medium block mb-2">ימי עבודה</label>
                <div className="flex gap-2">
                  {DAY_NAMES.map((name, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx)}
                      className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${formData.officeHoursDays.includes(idx) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1">שעת התחלה</label>
                  <input
                    type="time"
                    className="input-field"
                    value={formData.officeHoursStart}
                    onChange={(e) => setFormData({ ...formData, officeHoursStart: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1">שעת סיום</label>
                  <input
                    type="time"
                    className="input-field"
                    value={formData.officeHoursEnd}
                    onChange={(e) => setFormData({ ...formData, officeHoursEnd: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Notifications */}
      {activeSection === "notifications" && (
        <div className="card-static space-y-4">
          <h3 className="text-base font-heading text-text-primary flex items-center gap-2">
            <Bell className="w-4 h-4 text-gold" />
            העדפות התראות
          </h3>
          <p className="text-text-muted text-xs">
            בחרי באילו ערוצים את רוצה לקבל עדכונים על פעילות לקוחות ופרויקטים.
          </p>

          <div className="space-y-3">
            {/* Email toggle */}
            <div className="flex items-center justify-between p-4 bg-bg-surface rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Mail size={18} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 text-sm">קבלת עדכונים באימייל</h4>
                  <p className="text-xs text-gray-500 mt-0.5">עדכוני פרויקט, אישורים ותזכורות למייל</p>
                </div>
              </div>
              <div
                onClick={() => setFormData({ ...formData, notifyEmail: !formData.notifyEmail })}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${formData.notifyEmail ? "bg-blue-600" : "bg-gray-300"}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${formData.notifyEmail ? "right-0.5" : "right-[22px]"}`} />
              </div>
            </div>

            {/* WhatsApp toggle */}
            <div className="flex items-center justify-between p-4 bg-bg-surface rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <Bell size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 text-sm">קבלת עדכונים בוואצפ</h4>
                  <p className="text-xs text-gray-500 mt-0.5">התראות מיידיות בוואטסאפ על פעילות חשובה</p>
                </div>
              </div>
              <div
                onClick={() => setFormData({ ...formData, notifyWhatsApp: !formData.notifyWhatsApp })}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${formData.notifyWhatsApp ? "bg-emerald-600" : "bg-gray-300"}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${formData.notifyWhatsApp ? "right-0.5" : "right-[22px]"}`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Automations */}
      {activeSection === "automations" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-gold" />
            <div>
              <h3 className="text-base font-heading text-text-primary">אוטומציות</h3>
              <p className="text-text-muted text-xs">הפעילי אוטומציות כברירת מחדל — ניתן לכבות בכל פרויקט בנפרד</p>
            </div>
          </div>

          {AUTOMATION_TYPES.map(at => {
            const Icon = at.icon;
            const rule = automations.find(a => a.ruleType === at.ruleType);
            const isEnabled = rule?.isEnabled ?? false;

            return (
              <div
                key={at.ruleType}
                className={`bg-white border rounded-xl p-4 transition-colors ${isEnabled ? "border-blue-200 bg-blue-50/30" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${isEnabled ? "bg-blue-100" : "bg-gray-100"}`}>
                    <Icon size={18} className={isEnabled ? "text-blue-600" : "text-gray-400"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-gray-800 text-sm">{at.label}</h4>
                      <div
                        onClick={() => toggleAutomation(at.ruleType)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${isEnabled ? "bg-blue-600" : "bg-gray-300"}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${isEnabled ? "right-0.5" : "right-[22px]"}`} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{at.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Button */}
      {activeSection !== "automations" && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-gold w-full flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "שומר..." : "שמור הגדרות"}
        </button>
      )}
    </div>
  );
}
