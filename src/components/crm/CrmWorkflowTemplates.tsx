"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Workflow,
  Star,
  Play,
  ListChecks,
  Clock,
  MessageSquare,
  DollarSign,
  Sparkles,
} from "lucide-react";

type PhaseTask = {
  title: string;
};

type Phase = {
  name: string;
  daysFromStart: number;
  duration: number;
  tasks: PhaseTask[];
};

type AutoMessage = {
  phase: string;
  message: string;
};

type WorkflowTemplate = {
  id: string;
  name: string;
  description: string | null;
  projectType: string | null;
  phases: Phase[];
  budgetCategories: string[];
  autoMessages: AutoMessage[];
  isDefault: boolean;
  createdAt: string;
};

const emptyPhase: Phase = { name: "", daysFromStart: 0, duration: 7, tasks: [] };

const emptyForm = {
  name: "",
  description: "",
  projectType: "",
  phases: [{ ...emptyPhase }] as Phase[],
  budgetCategories: ["עבודות שלד", "חשמל", "אינסטלציה", "ריצוף", "צבע", "נגרות", "ריהוט"] as string[],
  autoMessages: [] as AutoMessage[],
  isDefault: false,
};

const projectTypes = ["דירת מגורים", "וילה", "משרד", "חנות", "מסעדה", "שיפוץ", "אחר"];

// ============================
// DEFAULT RENOVATION PRESETS
// ============================

const PRESET_TEMPLATES: Record<string, typeof emptyForm & { name: string; description: string; projectType: string }> = {
  full_renovation: {
    name: "שיפוץ מלא — דירת מגורים",
    description: "תהליך שיפוץ מלא כולל הריסה, שלד, גמר, ריהוט ומסירה",
    projectType: "שיפוץ",
    isDefault: true,
    phases: [
      {
        name: "ייעוץ ותכנון ראשוני",
        daysFromStart: 0,
        duration: 14,
        tasks: [
          { title: "פגישת היכרות עם הלקוח" },
          { title: "סיור בנכס ומדידות" },
          { title: "הבנת צרכים ואיפיון" },
          { title: "הכנת הצעת מחיר" },
          { title: "חתימת חוזה התקשרות" },
          { title: "איסוף השראה ומודבורד" },
        ],
      },
      {
        name: "תכנון ועיצוב",
        daysFromStart: 14,
        duration: 21,
        tasks: [
          { title: "הכנת תכנית אדריכלית" },
          { title: "תכנון מטבח" },
          { title: "תכנון חדרי רחצה" },
          { title: "תכנון חשמל ותאורה" },
          { title: "תכנון אינסטלציה" },
          { title: "בחירת חומרי גמר" },
          { title: "בחירת ריצוף וחיפוי" },
          { title: "הכנת הדמיות 3D" },
          { title: "אישור תכניות עם הלקוח" },
        ],
      },
      {
        name: "הכנה לביצוע",
        daysFromStart: 35,
        duration: 10,
        tasks: [
          { title: "קבלת הצעות מקבלנים" },
          { title: "בחירת קבלנים וחתימת הסכמים" },
          { title: "הזמנת חומרים" },
          { title: "תיאום לוח זמנים עם קבלנים" },
          { title: "הוצאת היתרים (אם נדרש)" },
          { title: "פינוי הדירה" },
        ],
      },
      {
        name: "הריסה ופירוק",
        daysFromStart: 45,
        duration: 7,
        tasks: [
          { title: "הריסת קירות (לפי תכנית)" },
          { title: "פירוק ריצוף ישן" },
          { title: "פירוק מטבח ישן" },
          { title: "פירוק חדרי רחצה" },
          { title: "פינוי פסולת בניין" },
          { title: "תיעוד מצב קיים" },
        ],
      },
      {
        name: "עבודות שלד ובנייה",
        daysFromStart: 52,
        duration: 14,
        tasks: [
          { title: "בניית קירות חדשים" },
          { title: "הרחבת פתחים / סגירת פתחים" },
          { title: "בניית נישות גבס" },
          { title: "תקרות גבס" },
          { title: "איטום חדרים רטובים" },
        ],
      },
      {
        name: "אינסטלציה וחשמל",
        daysFromStart: 66,
        duration: 14,
        tasks: [
          { title: "העברת נקודות מים" },
          { title: "התקנת צנרת ביוב חדשה" },
          { title: "חציבת תעלות חשמל" },
          { title: "התקנת נקודות חשמל חדשות" },
          { title: "התקנת נקודות תאורה" },
          { title: "התקנת נקודות רשת ותקשורת" },
          { title: "התקנת מערכת מיזוג" },
          { title: "בדיקת לחצי מים" },
        ],
      },
      {
        name: "ריצוף וחיפוי",
        daysFromStart: 80,
        duration: 14,
        tasks: [
          { title: "יישור רצפות" },
          { title: "ריצוף כללי" },
          { title: "חיפוי קירות חדרי רחצה" },
          { title: "חיפוי מטבח (backsplash)" },
          { title: "רובה ופסיפס" },
          { title: "סף מעברים ומדרגות" },
        ],
      },
      {
        name: "צבע וגמר",
        daysFromStart: 94,
        duration: 10,
        tasks: [
          { title: "שפכטל קירות" },
          { title: "סיוד ראשון" },
          { title: "סיוד שני + גמר" },
          { title: "צביעת תקרות" },
          { title: "אפקטים דקורטיביים (אם יש)" },
        ],
      },
      {
        name: "נגרות והתקנות",
        daysFromStart: 104,
        duration: 14,
        tasks: [
          { title: "התקנת מטבח" },
          { title: "התקנת ארונות אמבטיה" },
          { title: "התקנת דלתות פנים" },
          { title: "התקנת ארונות קיר" },
          { title: "התקנת כלים סניטריים" },
          { title: "התקנת משטחי שיש" },
          { title: "התקנת מראות" },
          { title: "התקנת מקלחונים" },
          { title: "התקנת גופי תאורה" },
          { title: "התקנת אביזרי חשמל (שקעים, מפסקים)" },
        ],
      },
      {
        name: "ריהוט וסטיילינג",
        daysFromStart: 118,
        duration: 10,
        tasks: [
          { title: "הזמנת ריהוט" },
          { title: "קבלת ריהוט — בדיקת תקינות" },
          { title: "סידור ומיקום ריהוט" },
          { title: "התקנת וילונות" },
          { title: "עיצוב אביזרים ודקורציה" },
          { title: "צמחייה" },
          { title: "תמונות וקישוטי קיר" },
        ],
      },
      {
        name: "ניקיון ובדיקות",
        daysFromStart: 128,
        duration: 5,
        tasks: [
          { title: "ניקיון גס" },
          { title: "ניקיון עדין (חלונות, ריצוף)" },
          { title: "בדיקת כל נקודות חשמל" },
          { title: "בדיקת ברזים וניקוז" },
          { title: "בדיקת דלתות וחלונות" },
          { title: "רשימת ליקויים" },
          { title: "תיקון ליקויים" },
        ],
      },
      {
        name: "מסירה ללקוח",
        daysFromStart: 133,
        duration: 3,
        tasks: [
          { title: "סיור מסירה עם הלקוח" },
          { title: "צ׳קליסט מסירה חתום" },
          { title: "העברת מסמכי אחריות" },
          { title: "העברת תכניות עדכניות" },
          { title: "צילום פרויקט מושלם" },
          { title: "סגירת חשבון מול קבלנים" },
          { title: "איסוף משוב מהלקוח" },
        ],
      },
    ],
    budgetCategories: [
      "עבודות הריסה ופינוי",
      "עבודות שלד ובנייה",
      "אינסטלציה",
      "חשמל ותקשורת",
      "מיזוג אוויר",
      "איטום",
      "ריצוף וחיפוי",
      "צבע וגמר",
      "נגרות מטבח",
      "נגרות כללית",
      "כלים סניטריים",
      "שיש ומשטחים",
      "גופי תאורה",
      "דלתות",
      "מקלחונים ומראות",
      "ריהוט",
      "וילונות ואביזרים",
      "עיצוב ודקורציה",
      "פיקוח ותכנון",
    ],
    autoMessages: [
      { phase: "ייעוץ ותכנון ראשוני", message: "שלום! שמחה להתחיל את המסע שלנו. צרפתי לינק לסקר צרכים — מלאי בזמנך ונקבע פגישת היכרות 😊" },
      { phase: "תכנון ועיצוב", message: "שלב התכנון יצא לדרך! אעדכן אותך עם סקיצות ראשוניות תוך שבוע. בינתיים — אשמח לקבל השראות שאהבת." },
      { phase: "הכנה לביצוע", message: "התכניות אושרו! מתחילה לתאם קבלנים ולהזמין חומרים. צפי לתחילת עבודות: [תאריך]." },
      { phase: "הריסה ופירוק", message: "היום מתחילות עבודות ההריסה. זה יכול להיות רועש 😅 אבל זה הצעד הראשון לבית החלומות שלך!" },
      { phase: "ריצוף וחיפוי", message: "הריצוף החל! הקפלה צפויה תוך [X] ימים. מצרפת תמונות מההתקדמות 📸" },
      { phase: "נגרות והתקנות", message: "נכנסים לשלב המרגש — התקנת המטבח והארונות! עוד קצת והבית מקבל צורה 🏡" },
      { phase: "ריהוט וסטיילינג", message: "הגיע הזמן הכי כיף! הריהוט בדרך ומתחילים לעצב את החלל. מצפה להראות לך את התוצאה!" },
      { phase: "מסירה ללקוח", message: "הבית מוכן! 🎉 בואי נקבע סיור מסירה. מכינה את כל המסמכים והתכניות." },
    ],
  },
  kitchen_renovation: {
    name: "שיפוץ מטבח",
    description: "תהליך שיפוץ מטבח מלא — מפירוק ועד התקנה",
    projectType: "שיפוץ",
    isDefault: false,
    phases: [
      {
        name: "תכנון מטבח",
        daysFromStart: 0,
        duration: 14,
        tasks: [
          { title: "מדידות מדויקות" },
          { title: "תכנון layout מטבח" },
          { title: "בחירת סגנון וחומרים" },
          { title: "בחירת ציוד אלקטרוני" },
          { title: "הצעות מחיר מספקים" },
          { title: "אישור תכנית סופית" },
        ],
      },
      {
        name: "הזמנות וקניות",
        daysFromStart: 14,
        duration: 21,
        tasks: [
          { title: "הזמנת ארונות מטבח" },
          { title: "הזמנת שיש / משטח עבודה" },
          { title: "הזמנת כיור וברז" },
          { title: "הזמנת מכשירי חשמל" },
          { title: "הזמנת ריצוף / חיפוי" },
          { title: "הזמנת תאורה" },
        ],
      },
      {
        name: "פירוק מטבח ישן",
        daysFromStart: 35,
        duration: 3,
        tasks: [
          { title: "ניתוק חשמל ומים" },
          { title: "פירוק ארונות" },
          { title: "פירוק ריצוף / חיפוי" },
          { title: "פינוי פסולת" },
        ],
      },
      {
        name: "עבודות תשתית",
        daysFromStart: 38,
        duration: 7,
        tasks: [
          { title: "העברת נקודות מים" },
          { title: "העברת נקודות חשמל" },
          { title: "הכנת נקודת גז (אם צריך)" },
          { title: "יישור קירות" },
          { title: "איטום (אם צריך)" },
        ],
      },
      {
        name: "ריצוף וחיפוי",
        daysFromStart: 45,
        duration: 5,
        tasks: [
          { title: "ריצוף רצפת מטבח" },
          { title: "חיפוי קירות (backsplash)" },
          { title: "רובה" },
        ],
      },
      {
        name: "התקנת מטבח",
        daysFromStart: 50,
        duration: 7,
        tasks: [
          { title: "התקנת ארונות תחתונים" },
          { title: "התקנת ארונות עליונים" },
          { title: "מדידת שיש / חיתוך" },
          { title: "התקנת שיש" },
          { title: "התקנת כיור וברז" },
          { title: "חיבור מכשירי חשמל" },
          { title: "התקנת תאורה" },
          { title: "ידיות ואביזרים" },
        ],
      },
      {
        name: "גמר וניקיון",
        daysFromStart: 57,
        duration: 3,
        tasks: [
          { title: "סיליקון וגמרים" },
          { title: "ניקיון מטבח" },
          { title: "בדיקת כל הפונקציות" },
          { title: "צילום לפני ואחרי" },
        ],
      },
    ],
    budgetCategories: [
      "ארונות מטבח",
      "שיש / משטח עבודה",
      "כיור וברז",
      "מכשירי חשמל",
      "ריצוף וחיפוי",
      "אינסטלציה",
      "חשמל",
      "תאורה",
      "התקנה",
      "פירוק ופינוי",
    ],
    autoMessages: [
      { phase: "תכנון מטבח", message: "מתחילים לתכנן את המטבח החדש! שלחי לי השראות שאהבת ואני אכין הצעה." },
      { phase: "התקנת מטבח", message: "המטבח החדש מתחיל להיבנות! 🎉 מצרפת תמונות מההתקדמות." },
    ],
  },
  new_apartment: {
    name: "עיצוב דירה חדשה מקבלן",
    description: "תהליך עיצוב דירה חדשה — משינויי דיירים ועד כניסה",
    projectType: "דירת מגורים",
    isDefault: false,
    phases: [
      {
        name: "שינויי דיירים",
        daysFromStart: 0,
        duration: 14,
        tasks: [
          { title: "בדיקת מפרט קבלן" },
          { title: "תכנון שינויי דיירים" },
          { title: "הגשת בקשות שינויים לקבלן" },
          { title: "אישור תמחור שינויים" },
        ],
      },
      {
        name: "תכנון ועיצוב",
        daysFromStart: 14,
        duration: 21,
        tasks: [
          { title: "תכנית ריהוט" },
          { title: "בחירת ריצוף וחיפוי" },
          { title: "בחירת כלים סניטריים" },
          { title: "תכנון מטבח" },
          { title: "תכנון ארונות" },
          { title: "תכנון תאורה" },
          { title: "בחירת צבעים" },
          { title: "הדמיות" },
        ],
      },
      {
        name: "הזמנות",
        daysFromStart: 35,
        duration: 30,
        tasks: [
          { title: "הזמנת מטבח" },
          { title: "הזמנת ריהוט" },
          { title: "הזמנת תאורה" },
          { title: "הזמנת וילונות" },
          { title: "הזמנת אביזרים" },
        ],
      },
      {
        name: "פיקוח בנייה",
        daysFromStart: 35,
        duration: 60,
        tasks: [
          { title: "ביקורת תקופתית באתר" },
          { title: "בדיקת שינויי דיירים" },
          { title: "תיעוד התקדמות" },
          { title: "פתרון בעיות שטח" },
        ],
      },
      {
        name: "גמר והתקנות",
        daysFromStart: 95,
        duration: 14,
        tasks: [
          { title: "התקנת מטבח" },
          { title: "התקנת ארונות" },
          { title: "התקנת תאורה" },
          { title: "צביעה (אם נדרש)" },
          { title: "ריהוט וסטיילינג" },
        ],
      },
      {
        name: "מסירה",
        daysFromStart: 109,
        duration: 5,
        tasks: [
          { title: "ניקיון כללי" },
          { title: "סידור סופי" },
          { title: "צילום פרויקט" },
          { title: "מסירה ללקוח" },
        ],
      },
    ],
    budgetCategories: [
      "שינויי דיירים",
      "מטבח",
      "ריהוט",
      "תאורה",
      "וילונות",
      "אביזרים ודקורציה",
      "צבע",
      "פיקוח",
    ],
    autoMessages: [
      { phase: "שינויי דיירים", message: "בדקתי את המפרט — יש כמה שינויים שכדאי לבצע. מצרפת המלצות." },
      { phase: "מסירה", message: "הדירה מוכנה! 🏡 מזמינה אותך לסיור מסירה." },
    ],
  },
};

export default function CrmWorkflowTemplates() {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [newBudgetCat, setNewBudgetCat] = useState("");
  const [newTaskText, setNewTaskText] = useState<Record<number, string>>({});
  const [showPresets, setShowPresets] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/designer/crm/workflows");
      if (res.ok) setTemplates(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        description: form.description || null,
        projectType: form.projectType || null,
      };
      if (editId) {
        await fetch(`/api/designer/crm/workflows/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/designer/crm/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditId(null);
      fetchTemplates();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/designer/crm/workflows/${id}`, { method: "DELETE" });
      fetchTemplates();
    } catch {
      /* ignore */
    }
  };

  const handleApply = async (template: WorkflowTemplate) => {
    setApplying(template.id);
    try {
      await fetch("/api/designer/crm/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", templateId: template.id }),
      });
    } catch {
      /* ignore */
    } finally {
      setApplying(null);
    }
  };

  const loadPreset = (key: string) => {
    const preset = PRESET_TEMPLATES[key];
    if (!preset) return;
    setForm({
      name: preset.name,
      description: preset.description,
      projectType: preset.projectType,
      phases: preset.phases,
      budgetCategories: preset.budgetCategories,
      autoMessages: preset.autoMessages,
      isDefault: preset.isDefault,
    });
    setEditId(null);
    setShowForm(true);
    setShowPresets(false);
  };

  const startEdit = (t: WorkflowTemplate) => {
    setForm({
      name: t.name,
      description: t.description || "",
      projectType: t.projectType || "",
      phases: t.phases.length > 0 ? t.phases : [{ ...emptyPhase }],
      budgetCategories: t.budgetCategories.length > 0 ? t.budgetCategories : [],
      autoMessages: t.autoMessages || [],
      isDefault: t.isDefault,
    });
    setEditId(t.id);
    setShowForm(true);
  };

  const updatePhase = (idx: number, field: keyof Phase, value: string | number | PhaseTask[]) => {
    const updated = [...form.phases];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, phases: updated });
  };

  const addPhase = () => {
    setForm({
      ...form,
      phases: [...form.phases, { ...emptyPhase, daysFromStart: form.phases.length > 0 ? form.phases[form.phases.length - 1].daysFromStart + form.phases[form.phases.length - 1].duration : 0 }],
    });
  };

  const removePhase = (idx: number) => {
    setForm({ ...form, phases: form.phases.filter((_, i) => i !== idx) });
  };

  const addTaskToPhase = (phaseIdx: number) => {
    const text = newTaskText[phaseIdx]?.trim();
    if (!text) return;
    const updated = [...form.phases];
    updated[phaseIdx] = {
      ...updated[phaseIdx],
      tasks: [...updated[phaseIdx].tasks, { title: text }],
    };
    setForm({ ...form, phases: updated });
    setNewTaskText({ ...newTaskText, [phaseIdx]: "" });
  };

  const removeTaskFromPhase = (phaseIdx: number, taskIdx: number) => {
    const updated = [...form.phases];
    updated[phaseIdx] = {
      ...updated[phaseIdx],
      tasks: updated[phaseIdx].tasks.filter((_, i) => i !== taskIdx),
    };
    setForm({ ...form, phases: updated });
  };

  const addBudgetCategory = () => {
    if (!newBudgetCat.trim()) return;
    setForm({ ...form, budgetCategories: [...form.budgetCategories, newBudgetCat.trim()] });
    setNewBudgetCat("");
  };

  const removeBudgetCategory = (idx: number) => {
    setForm({ ...form, budgetCategories: form.budgetCategories.filter((_, i) => i !== idx) });
  };

  const addAutoMessage = () => {
    setForm({
      ...form,
      autoMessages: [...form.autoMessages, { phase: "", message: "" }],
    });
  };

  const updateAutoMessage = (idx: number, field: keyof AutoMessage, value: string) => {
    const updated = [...form.autoMessages];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, autoMessages: updated });
  };

  const removeAutoMessage = (idx: number) => {
    setForm({ ...form, autoMessages: form.autoMessages.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">תבניות תהליך</h2>
            <p className="text-white/50" style={{ fontSize: "10px" }}>
              ניהול תבניות עבודה לפרויקטים
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-outline flex items-center gap-2"
            onClick={() => setShowPresets(!showPresets)}
          >
            <Sparkles className="w-4 h-4" />
            תבניות מוכנות
          </button>
          <button
            className="btn-gold flex items-center gap-2"
            onClick={() => {
              setForm(emptyForm);
              setEditId(null);
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4" />
            תבנית חדשה
          </button>
        </div>
      </div>

      {/* Presets Selector */}
      {showPresets && (
        <div className="card-static space-y-3 animate-in border-2 border-gold/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              תבניות מוכנות — בחרי והתאימי לצרכייך
            </h3>
            <button onClick={() => setShowPresets(false)} className="p-1 rounded hover:bg-white/10">
              <X className="w-4 h-4 text-white/40" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(PRESET_TEMPLATES).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => loadPreset(key)}
                className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-gold/10 hover:border-gold/30 transition-all text-right group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Workflow className="w-5 h-5 text-gold" />
                  <span className="text-sm font-semibold text-white">{preset.name}</span>
                </div>
                <p className="text-white/40 mb-2" style={{ fontSize: "10px" }}>{preset.description}</p>
                <div className="flex gap-2 flex-wrap">
                  <span className="badge-blue">{preset.phases.length} שלבים</span>
                  <span className="badge-gray">{preset.phases.reduce((sum, p) => sum + p.tasks.length, 0)} משימות</span>
                  <span className="badge-gray">{preset.budgetCategories.length} קטגוריות</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Templates List */}
      {loading ? (
        <div className="empty-state">
          <Loader2 className="empty-state-icon animate-spin" />
          <p>טוען...</p>
        </div>
      ) : templates.length === 0 && !showPresets ? (
        <div className="empty-state">
          <Workflow className="empty-state-icon" />
          <p className="font-medium text-text-secondary">אין תבניות תהליך עדיין</p>
          <p className="text-sm mt-1 mb-4 text-text-muted">בחרי תבנית מוכנה או צרי חדשה מאפס</p>
          <button
            onClick={() => setShowPresets(true)}
            className="btn-gold"
          >
            <Sparkles className="w-4 h-4 inline ml-1" />
            בחרי מתבניות מוכנות
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <div key={t.id} className="card-static overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition"
                onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
              >
                <div className="flex items-center gap-3">
                  <Workflow className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{t.name}</span>
                      <span className="badge-blue">{t.phases.length} שלבים</span>
                      {t.isDefault && (
                        <span className="badge-gold flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          ברירת מחדל
                        </span>
                      )}
                      {t.projectType && <span className="badge-gray">{t.projectType}</span>}
                    </div>
                    {t.description && (
                      <p className="text-white/40 mt-1" style={{ fontSize: "10px" }}>
                        {t.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn-outline flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApply(t);
                    }}
                    disabled={applying === t.id}
                  >
                    {applying === t.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    החל על פרויקט
                  </button>
                  <button className="btn-ghost p-1" onClick={(e) => { e.stopPropagation(); startEdit(t); }}>
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button className="btn-ghost p-1 text-red-400" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedId === t.id ? (
                    <ChevronUp className="w-4 h-4 text-white/40" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/40" />
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === t.id && (
                <div className="border-t border-white/10 p-4 space-y-4">
                  {/* Phases */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <h4 className="text-sm font-semibold text-white">שלבים</h4>
                    </div>
                    <div className="space-y-2">
                      {t.phases.map((phase, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-white/5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-white font-medium">{phase.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-white/40" style={{ fontSize: "10px" }}>
                                יום {phase.daysFromStart} | {phase.duration} ימים
                              </span>
                            </div>
                          </div>
                          {phase.tasks.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {phase.tasks.map((task, tIdx) => (
                                <span key={tIdx} className="badge-gray">{task.title}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Budget Categories */}
                  {t.budgetCategories.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-amber-400" />
                        <h4 className="text-sm font-semibold text-white">קטגוריות תקציב</h4>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {t.budgetCategories.map((cat, idx) => (
                          <span key={idx} className="badge-blue">{cat}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Auto Messages */}
                  {t.autoMessages.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4 text-amber-400" />
                        <h4 className="text-sm font-semibold text-white">הודעות אוטומטיות</h4>
                      </div>
                      <div className="space-y-1">
                        {t.autoMessages.map((msg, idx) => (
                          <div key={idx} className="p-2 rounded bg-white/5 flex items-start gap-2">
                            <span className="badge-gold flex-shrink-0">{msg.phase}</span>
                            <span className="text-white/60" style={{ fontSize: "10px" }}>{msg.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div
            className="modal-content animate-in w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">
                {editId ? "עריכת תבנית" : "תבנית חדשה"}
              </h3>
              <button className="btn-ghost p-1" onClick={() => { setShowForm(false); setEditId(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="form-label">שם התבנית</label>
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="למשל: תהליך שיפוץ דירה"
                  />
                </div>
                <div>
                  <label className="form-label">תיאור</label>
                  <input
                    className="input-field"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="אופציונלי"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">סוג פרויקט</label>
                    <select
                      className="select-field"
                      value={form.projectType}
                      onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                    >
                      <option value="">בחר סוג</option>
                      {projectTypes.map((pt) => (
                        <option key={pt} value={pt}>{pt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={form.isDefault}
                      onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <label htmlFor="isDefault" className="form-label mb-0 cursor-pointer">
                      ברירת מחדל
                    </label>
                  </div>
                </div>
              </div>

              <div className="section-divider" />

              {/* Phases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-white">שלבים ({form.phases.length})</h4>
                  </div>
                  <button className="btn-ghost flex items-center gap-1" onClick={addPhase}>
                    <Plus className="w-3 h-3" />
                    הוסף שלב
                  </button>
                </div>

                <div className="space-y-3">
                  {form.phases.map((phase, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-white/40" style={{ fontSize: "10px" }}>
                          שלב {idx + 1}
                        </span>
                        <button className="btn-ghost p-1 text-red-400" onClick={() => removePhase(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="form-label">שם</label>
                          <input
                            className="input-field"
                            value={phase.name}
                            onChange={(e) => updatePhase(idx, "name", e.target.value)}
                            placeholder="למשל: תכנון"
                          />
                        </div>
                        <div>
                          <label className="form-label">יום התחלה</label>
                          <input
                            type="number"
                            className="input-field"
                            value={phase.daysFromStart}
                            onChange={(e) => updatePhase(idx, "daysFromStart", parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <label className="form-label">משך (ימים)</label>
                          <input
                            type="number"
                            className="input-field"
                            value={phase.duration}
                            onChange={(e) => updatePhase(idx, "duration", parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>

                      {/* Tasks in phase */}
                      <div>
                        <label className="form-label">משימות ({phase.tasks.length})</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {phase.tasks.map((task, tIdx) => (
                            <span
                              key={tIdx}
                              className="badge-gray flex items-center gap-1 cursor-pointer"
                              onClick={() => removeTaskFromPhase(idx, tIdx)}
                            >
                              {task.title}
                              <X className="w-2 h-2" />
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            className="input-field flex-1"
                            value={newTaskText[idx] || ""}
                            onChange={(e) => setNewTaskText({ ...newTaskText, [idx]: e.target.value })}
                            placeholder="הוסף משימה"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); addTaskToPhase(idx); }
                            }}
                          />
                          <button className="btn-ghost p-1" onClick={() => addTaskToPhase(idx)}>
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="section-divider" />

              {/* Budget Categories */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-semibold text-white">קטגוריות תקציב ({form.budgetCategories.length})</h4>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {form.budgetCategories.map((cat, idx) => (
                    <span
                      key={idx}
                      className="badge-blue flex items-center gap-1 cursor-pointer"
                      onClick={() => removeBudgetCategory(idx)}
                    >
                      {cat}
                      <X className="w-2 h-2" />
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="input-field flex-1"
                    value={newBudgetCat}
                    onChange={(e) => setNewBudgetCat(e.target.value)}
                    placeholder="הוסף קטגוריה"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addBudgetCategory(); }
                    }}
                  />
                  <button className="btn-ghost p-1" onClick={addBudgetCategory}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="section-divider" />

              {/* Auto Messages */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-semibold text-white">הודעות אוטומטיות ({form.autoMessages.length})</h4>
                  </div>
                  <button className="btn-ghost flex items-center gap-1" onClick={addAutoMessage}>
                    <Plus className="w-3 h-3" />
                    הוסף הודעה
                  </button>
                </div>
                <div className="space-y-2">
                  {form.autoMessages.map((msg, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 rounded bg-white/5">
                      <select
                        className="select-field max-w-[140px]"
                        value={msg.phase}
                        onChange={(e) => updateAutoMessage(idx, "phase", e.target.value)}
                      >
                        <option value="">בחר שלב</option>
                        {form.phases.map((p, pIdx) => (
                          <option key={pIdx} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        className="input-field flex-1"
                        value={msg.message}
                        onChange={(e) => updateAutoMessage(idx, "message", e.target.value)}
                        placeholder="תוכן ההודעה"
                      />
                      <button className="btn-ghost p-1 text-red-400" onClick={() => removeAutoMessage(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button className="btn-gold flex items-center gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editId ? "עדכן" : "צור תבנית"}
              </button>
              <button className="btn-ghost" onClick={() => { setShowForm(false); setEditId(null); }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
