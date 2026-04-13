"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, CheckCircle2, Circle, Clock, Trash2, Calendar, Sparkles, FileDown, Layers } from "lucide-react";
import { g } from "@/lib/gender";

type Task = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  assignee: string | null;
  dueDate: string | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
};

type Project = { id: string; name: string; client: { name: string } };
type WorkflowTemplate = { id: string; name: string; phases: { name: string; tasks: { title: string; description?: string }[] }[] };

const statusLabel: Record<string, string> = {
  TODO: "לביצוע",
  IN_PROGRESS: "בתהליך",
  DONE: "הושלם",
  CANCELLED: "בוטל",
};

const statusColor: Record<string, string> = {
  TODO: "text-text-muted",
  IN_PROGRESS: "text-gold",
  DONE: "text-emerald-600",
  CANCELLED: "text-red-400",
};

// Default renovation task templates that can be loaded without a saved workflow template
const DEFAULT_TASK_SETS: { name: string; icon: string; tasks: { title: string; description: string }[] }[] = [
  {
    name: "שיפוץ מלא — משימות בסיסיות",
    icon: "🏠",
    tasks: [
      { title: "פגישת תכנון ראשונית עם לקוח", description: "הגדרת צרכים, סגנון, תקציב ולוחות זמנים" },
      { title: "מדידות ותכנית מצב קיים", description: "ביקור באתר, מדידות מלאות, תיעוד צילומי" },
      { title: "הכנת תכנית עיצוב", description: "תכנית רהיטים, חתכים, תכנית חשמל ואינסטלציה" },
      { title: "הכנת לוח חומרים (mood board)", description: "בחירת צבעים, טקסטורות, חומרי גמר" },
      { title: "קבלת הצעות מחיר מקבלנים", description: "לפחות 3 הצעות לכל תחום עיקרי" },
      { title: "חתימת חוזה עם קבלן ראשי", description: "סיכום לוח זמנים, תנאי תשלום, אחריות" },
      { title: "הזמנת חומרים — ריצוף וחיפוי", description: "אריחים, פוגות, דבק, ספים" },
      { title: "הזמנת מטבח", description: "ארונות, משטח, כיור, ברז, ידיות" },
      { title: "הזמנת ארונות קיר", description: "חדרי שינה, מבואה, מחסן" },
      { title: "הזמנת דלתות פנים + דלת כניסה", description: "מידות, סוג, צבע, ידיות" },
      { title: "הזמנת כלים סניטריים", description: "אסלות, כיורים, ברזים, אגנית/מקלחון" },
      { title: "הזמנת גופי תאורה", description: "ספוטים, פלפונים, נברשות, פסי LED" },
      { title: "פיקוח — שלב פירוק", description: "פירוק ריצוף, קירות, מטבח ישן" },
      { title: "פיקוח — שלב אינסטלציה", description: "צנרת מים חמים/קרים, ניקוז, גז" },
      { title: "פיקוח — שלב חשמל", description: "נקודות חשמל, תקשורת, לוח חשמל" },
      { title: "פיקוח — שלב טיח וגבס", description: "ישור קירות, תקרות, נישות" },
      { title: "פיקוח — שלב איטום", description: "איטום חדרים רטובים, מרפסות" },
      { title: "פיקוח — שלב ריצוף", description: "הנחת אריחים, ספים, פוגות" },
      { title: "פיקוח — שלב נגרות", description: "התקנת מטבח, ארונות, דלתות" },
      { title: "פיקוח — שלב צבע", description: "שפכטל, יסוד, שכבות צבע" },
      { title: "פיקוח — שלב גמר", description: "גופי תאורה, אביזרים, ניקיונות" },
      { title: "בחירת רהיטים עם הלקוח", description: "ספות, שולחנות, מיטות, שידות" },
      { title: "הזמנת טקסטיל", description: "וילונות, שטיחים, כריות נוי" },
      { title: "סטיילינג סופי", description: "אביזרי נוי, צמחים, אמנות" },
      { title: "צילום פרויקט מוגמר", description: "צלם מקצועי, תיעוד לפורטפוליו" },
      { title: "מסירת הדירה ללקוח", description: "סיור, צ'קליסט מסירה, מסמכי אחריות" },
    ],
  },
  {
    name: "שיפוץ מטבח",
    icon: "🍳",
    tasks: [
      { title: "מדידות מטבח מדויקות", description: "כולל חלון, נקודות חשמל ומים" },
      { title: "תכנון מטבח — layout", description: "מיקום ארונות, משטח, כיריים, תנור, מדיח" },
      { title: "בחירת חומרים — ארונות ומשטח", description: "סוג, צבע, ידיות, סוג משטח" },
      { title: "בחירת חיפוי קיר (backsplash)", description: "אריחים/זכוכית/אבן" },
      { title: "הזמנת מטבח מנגר/ספק", description: "אישור תכנית סופית והזמנה" },
      { title: "הזמנת כיור + ברז", description: "סוג, מידה, גמר" },
      { title: "הזמנת מכשירי חשמל", description: "כיריים, תנור, מדיח, מנדף, מיקרו" },
      { title: "פירוק מטבח ישן", description: "פינוי ארונות, משטח, חיפוי" },
      { title: "עבודות אינסטלציה", description: "הזזת/הוספת נקודות מים וניקוז" },
      { title: "עבודות חשמל", description: "נקודות חדשות, תאורה מטבח" },
      { title: "ריצוף וחיפוי", description: "רצפה + קיר (backsplash)" },
      { title: "התקנת ארונות מטבח", description: "ארונות עליונים ותחתונים" },
      { title: "התקנת משטח עבודה", description: "חיתוך, הדבקה, סיליקון" },
      { title: "חיבור כיור וברז", description: "אינסטלציה + סיליקון" },
      { title: "חיבור מכשירי חשמל", description: "כיריים, תנור, מדיח, מנדף" },
      { title: "בדיקה סופית ומסירה", description: "כל המערכות פועלות, ניקיון, מסירה" },
    ],
  },
  {
    name: "עיצוב דירה חדשה מקבלן",
    icon: "🏢",
    tasks: [
      { title: "בדיקת מפרט קבלן", description: "הבנת מה כלול, אפשרויות שינויים" },
      { title: "הגשת שינויי דייר", description: "תכנית שינויים לקבלן בזמן" },
      { title: "תכנון עיצוב פנים מלא", description: "תכניות, חתכים, פרטי נגרות" },
      { title: "בחירת שדרוגים מקבלן", description: "ריצוף, חיפוי, כלים סניטריים" },
      { title: "הזמנת מטבח", description: "תכנון ובחירת חומרים" },
      { title: "הזמנת ארונות קיר", description: "חדרי שינה וכניסה" },
      { title: "הזמנת דלתות פנים", description: "סוג, צבע, ידיות" },
      { title: "בחירת גופי תאורה", description: "ספוטים, נברשות, פסי LED" },
      { title: "פיקוח שלב שינויי דייר", description: "ביקורת חשמל ואינסטלציה" },
      { title: "פיקוח שלב ריצוף", description: "ביקורת הנחה ופוגות" },
      { title: "פיקוח שלב נגרות", description: "מטבח, ארונות, דלתות" },
      { title: "פיקוח שלב גמר", description: "צבע, תאורה, אביזרים" },
      { title: "בחירת רהיטים", description: "ספות, שולחנות, מיטות" },
      { title: "הזמנת טקסטיל ואביזרים", description: "וילונות, שטיחים, כריות" },
      { title: "סטיילינג סופי", description: "אביזרי נוי, תמונות, צמחים" },
      { title: "מסירה מקבלן — ביקורת ליקויים", description: "בדיקה מקיפה + דו\"ח ליקויים" },
      { title: "צילום פרויקט מוגמר", description: "תיעוד מקצועי לפורטפוליו" },
    ],
  },
];

export default function CrmTasks({ clientId, projectId, gender }: { clientId?: string; projectId?: string; gender?: string } = {}) {
  const gdr = gender || "female";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showAdd, setShowAdd] = useState(false);
  const [showLoadTemplate, setShowLoadTemplate] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", dueDate: "" });
  const [saving, setSaving] = useState(false);

  const DEMO_PROJECTS: Project[] = [
    { id: "demo-proj-1", name: "שיפוץ דירת 4 חדרים — הרצל 42", client: { name: "רונית ואבי כהן" } },
    { id: "demo-proj-2", name: "עיצוב דירה חדשה — רוטשילד 15", client: { name: "יוסי ומיכל לוי" } },
    { id: "demo-proj-3", name: "שיפוץ מטבח — נחלת בנימין 8", client: { name: "דנה אברהם" } },
  ];

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/projects");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setProjects(data);
          if (!selectedProjectId) setSelectedProjectId(data[0].id);
          return;
        }
      }
      // Fallback to demo
      setProjects(DEMO_PROJECTS);
      if (!selectedProjectId) setSelectedProjectId(DEMO_PROJECTS[0].id);
    } catch {
      setProjects(DEMO_PROJECTS);
      if (!selectedProjectId) setSelectedProjectId(DEMO_PROJECTS[0].id);
    }
  }, [selectedProjectId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/workflows");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/designer/crm/projects/${selectedProjectId}/tasks`);
      if (res.ok) setTasks(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [selectedProjectId]);

  useEffect(() => { fetchProjects(); fetchTemplates(); }, [fetchProjects, fetchTemplates]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !selectedProjectId) return;
    setSaving(true);
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTask),
      });
      setNewTask({ title: "", description: "", dueDate: "" });
      setShowAdd(false);
      fetchTasks();
    } catch { /* ignore */ } finally { setSaving(false); }
  };

  const loadTasksFromTemplate = async (tasksToLoad: { title: string; description?: string }[]) => {
    if (!selectedProjectId || tasksToLoad.length === 0) return;
    setLoadingTemplate(true);
    try {
      for (const t of tasksToLoad) {
        await fetch(`/api/designer/crm/projects/${selectedProjectId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: t.title, description: t.description || "" }),
        });
      }
      fetchTasks();
      setShowLoadTemplate(false);
    } catch { /* ignore */ }
    finally { setLoadingTemplate(false); }
  };

  const loadFromWorkflowTemplate = async (template: WorkflowTemplate) => {
    const allTasks: { title: string; description?: string }[] = [];
    for (const phase of template.phases) {
      for (const task of phase.tasks) {
        allTasks.push({ title: `[${phase.name}] ${task.title}`, description: task.description });
      }
    }
    await loadTasksFromTemplate(allTasks);
  };

  const toggleStatus = async (task: Task) => {
    const nextStatus = task.status === "DONE" ? "TODO" : task.status === "TODO" ? "IN_PROGRESS" : "DONE";
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchTasks();
    } catch { /* ignore */ }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/tasks/${taskId}`, { method: "DELETE" });
      fetchTasks();
    } catch { /* ignore */ }
  };

  const grouped = {
    TODO: tasks.filter(t => t.status === "TODO"),
    IN_PROGRESS: tasks.filter(t => t.status === "IN_PROGRESS"),
    DONE: tasks.filter(t => t.status === "DONE"),
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-text-primary">משימות</h2>
        <div className="flex gap-2">
          {selectedProjectId && (
            <button onClick={() => setShowLoadTemplate(!showLoadTemplate)} className="btn-ghost text-sm flex items-center gap-1">
              <FileDown className="w-4 h-4" /> טען תבנית
            </button>
          )}
          <button onClick={() => setShowAdd(!showAdd)} className="btn-gold text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> משימה חדשה
          </button>
        </div>
      </div>

      {/* Project selector */}
      <div className="relative">
        <select
          className="select-field"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          <option value="">{g(gdr, "בחר פרויקט...", "בחרי פרויקט...")}</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name} — {p.client.name}</option>
          ))}
        </select>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div className="card-static space-y-3">
          <input
            type="text"
            className="input-field"
            placeholder="כותרת המשימה..."
            value={newTask.title}
            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
          />
          <input
            type="text"
            className="input-field"
            placeholder="תיאור (אופציונלי)"
            value={newTask.description}
            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
          />
          <input
            type="date"
            className="input-field"
            value={newTask.dueDate}
            onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })}
            dir="ltr"
          />
          <button onClick={handleAddTask} disabled={saving} className="btn-gold w-full">
            {saving ? "שומר..." : "הוסף משימה"}
          </button>
        </div>
      )}

      {/* Load from template */}
      {showLoadTemplate && selectedProjectId && (
        <div className="card-static space-y-4 animate-in">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold" />
              טען משימות מתבנית
            </h3>
            <button onClick={() => setShowLoadTemplate(false)} className="text-text-muted hover:text-text-primary text-sm">✕</button>
          </div>

          {/* Default task sets */}
          <div>
            <p className="text-xs font-semibold text-text-muted mb-2">תבניות מוכנות</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEFAULT_TASK_SETS.map((set, i) => (
                <button
                  key={i}
                  onClick={() => loadTasksFromTemplate(set.tasks)}
                  disabled={loadingTemplate}
                  className="text-right p-3 rounded-xl border border-border-subtle hover:border-gold hover:bg-gold/5 transition-all disabled:opacity-50"
                >
                  <span className="text-lg">{set.icon}</span>
                  <p className="text-sm font-medium text-text-primary mt-1">{set.name}</p>
                  <p className="text-xs text-text-muted">{set.tasks.length} משימות</p>
                </button>
              ))}
            </div>
          </div>

          {/* Saved workflow templates */}
          {templates.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted mb-2">תבניות עבודה שמורות</p>
              <div className="space-y-2">
                {templates.map(t => {
                  const taskCount = t.phases?.reduce((sum: number, p: { tasks: { title: string }[] }) => sum + (p.tasks?.length || 0), 0) || 0;
                  return (
                    <button
                      key={t.id}
                      onClick={() => loadFromWorkflowTemplate(t)}
                      disabled={loadingTemplate}
                      className="w-full text-right p-3 rounded-xl border border-border-subtle hover:border-gold hover:bg-gold/5 transition-all flex items-center gap-3 disabled:opacity-50"
                    >
                      <Layers className="w-5 h-5 text-gold flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary">{t.name}</p>
                        <p className="text-xs text-text-muted">{t.phases?.length || 0} שלבים · {taskCount} משימות</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {loadingTemplate && (
            <div className="flex items-center gap-2 text-sm text-gold">
              <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              טוען משימות...
            </div>
          )}
        </div>
      )}

      {!selectedProjectId ? (
        <div className="card-static text-center py-12 text-text-muted">{g(gdr, "בחר פרויקט כדי לראות משימות", "בחרי פרויקט כדי לראות משימות")}</div>
      ) : loading ? (
        <div className="text-center py-12 text-text-muted">טוען...</div>
      ) : tasks.length === 0 ? (
        <div className="card-static text-center py-12">
          <p className="text-text-muted mb-3">אין משימות עדיין</p>
          <div className="flex justify-center gap-2">
            <button onClick={() => setShowAdd(true)} className="btn-ghost text-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> הוסף ידנית
            </button>
            <button onClick={() => setShowLoadTemplate(true)} className="btn-gold text-sm flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> טען מתבנית
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(["TODO", "IN_PROGRESS", "DONE"] as const).map(status => {
            const group = grouped[status];
            if (group.length === 0) return null;
            return (
              <div key={status}>
                <h3 className={`text-sm font-medium mb-2 ${statusColor[status]}`}>
                  {statusLabel[status]} ({group.length})
                </h3>
                <div className="space-y-2">
                  {group.map(task => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 rounded-btn border transition-colors ${
                        task.status === "DONE" ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-border-subtle"
                      }`}
                    >
                      <button onClick={() => toggleStatus(task)} className="mt-0.5 flex-shrink-0">
                        {task.status === "DONE" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : task.status === "IN_PROGRESS" ? (
                          <Clock className="w-5 h-5 text-gold" />
                        ) : (
                          <Circle className="w-5 h-5 text-text-muted" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${task.status === "DONE" ? "line-through text-text-muted" : "text-text-primary"}`}>
                          {task.title}
                        </p>
                        {task.description && <p className="text-xs text-text-muted mt-0.5">{task.description}</p>}
                        {task.dueDate && (
                          <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(task.dueDate).toLocaleDateString("he-IL")}
                          </p>
                        )}
                      </div>
                      <button onClick={() => deleteTask(task.id)} className="text-text-muted hover:text-red-500 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
