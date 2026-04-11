"use client";
import { useState, useEffect } from "react";
import { ClipboardCheck, Plus, X, Check, Camera, MessageSquare, ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";

interface HandoffItem {
  id: string;
  label: string;
  category: string | null;
  assignee: "designer" | "client";
  isChecked: boolean;
  checkedAt: string | null;
  note: string | null;
  photoUrl: string | null;
  sortOrder: number;
}

interface Checklist {
  id: string;
  projectId: string;
  title: string;
  status: string;
  completedAt: string | null;
  items: HandoffItem[];
  project?: { name: string };
  createdAt: string;
}

type Project = { id: string; name: string };

const CATEGORIES = ["מטבח", "חדרים רטובים", "סלון", "חדרי שינה", "מרפסת", "חשמל ותאורה", "אינסטלציה", "ריצוף וחיפוי", "נגרות ודלתות", "צבע וגבס", "כללי"];
const DEFAULT_ITEMS: { label: string; category: string; assignee: "designer" | "client" }[] = [
  // מטבח
  { label: "ארונות מטבח — מותקנים, יישור ופלס תקין", category: "מטבח", assignee: "client" },
  { label: "משטח עבודה — ללא שריטות או פגמים", category: "מטבח", assignee: "client" },
  { label: "כיור מטבח — מותקן, אין נזילות, סיליקון תקין", category: "מטבח", assignee: "client" },
  { label: "ברז מטבח — פועל תקין, חם וקר", category: "מטבח", assignee: "client" },
  { label: "חיבור מדיח כלים — מים + ניקוז תקינים", category: "מטבח", assignee: "client" },
  { label: "חיבור תנור/כיריים — גז/חשמל תקין", category: "מטבח", assignee: "client" },
  { label: "מנדף — מותקן ויונק כראוי", category: "מטבח", assignee: "client" },
  { label: "חיפוי קיר (backsplash) — תקין, פוגות נקיות", category: "מטבח", assignee: "client" },
  { label: "ידיות/מנגנוני סגירה — כל הידיות מורכבות ותקינות", category: "מטבח", assignee: "client" },
  // חדרים רטובים
  { label: "אסלה — מותקנת, הדחה תקינה, אין נזילות", category: "חדרים רטובים", assignee: "client" },
  { label: "כיור אמבטיה — מותקן, ניקוז תקין", category: "חדרים רטובים", assignee: "client" },
  { label: "ברזים — פועלים תקין, חם וקר", category: "חדרים רטובים", assignee: "client" },
  { label: "מקלחון/אמבטיה — דלת/מסך תקין, אין נזילות", category: "חדרים רטובים", assignee: "client" },
  { label: "איטום מקלחת — בדיקת הצפה 24 שעות", category: "חדרים רטובים", assignee: "designer" },
  { label: "ארון אמבטיה — מותקן ומיושר", category: "חדרים רטובים", assignee: "client" },
  { label: "מראה — מותקנת ומאירה (אם יש תאורה)", category: "חדרים רטובים", assignee: "client" },
  { label: "אביזרי אמבטיה — מתלה מגבות, מחזיק נייר, ווים", category: "חדרים רטובים", assignee: "client" },
  { label: "חיפוי קירות — אריחים שלמים, פוגות תקינות", category: "חדרים רטובים", assignee: "client" },
  // חשמל ותאורה
  { label: "לוח חשמל — מסודר, מאפיינים תקינים", category: "חשמל ותאורה", assignee: "client" },
  { label: "שקעי חשמל — כולם פועלים ומכוסים", category: "חשמל ותאורה", assignee: "client" },
  { label: "מפסקי תאורה — כל המפסקים פועלים", category: "חשמל ותאורה", assignee: "client" },
  { label: "גופי תאורה — מותקנים ופועלים", category: "חשמל ותאורה", assignee: "client" },
  { label: "ספוטים/לדים — כולם דולקים, אין הבהוב", category: "חשמל ותאורה", assignee: "client" },
  { label: "תאורה חיצונית — מרפסת/כניסה פועלת", category: "חשמל ותאורה", assignee: "client" },
  // ריצוף וחיפוי
  { label: "ריצוף — שלם, ללא סדקים, פוגות תקינות", category: "ריצוף וחיפוי", assignee: "client" },
  { label: "פנלים/ספים — מותקנים בין חדרים", category: "ריצוף וחיפוי", assignee: "client" },
  { label: "שיש/אבן — ללא פגמים, חיתוכים נקיים", category: "ריצוף וחיפוי", assignee: "client" },
  { label: "פרקט/רצפה צפה — ללא חריקות, מרווחים תקינים", category: "ריצוף וחיפוי", assignee: "client" },
  // נגרות ודלתות
  { label: "דלתות פנים — נסגרות חלק, ללא חריקה", category: "נגרות ודלתות", assignee: "client" },
  { label: "דלת כניסה — נעילה תקינה, איטום", category: "נגרות ודלתות", assignee: "client" },
  { label: "ארונות קיר — מותקנים, מדפים ומוטות", category: "נגרות ודלתות", assignee: "client" },
  { label: "מזוזות ואדנים — מותקנים ומגומרים", category: "נגרות ודלתות", assignee: "client" },
  { label: "משקופים — תקינים, ללא רווחים", category: "נגרות ודלתות", assignee: "client" },
  // צבע וגבס
  { label: "צבע קירות — אחיד, ללא כתמים או טפטופים", category: "צבע וגבס", assignee: "client" },
  { label: "תקרה — צבע אחיד, ללא סדקים", category: "צבע וגבס", assignee: "client" },
  { label: "עבודות גבס — חלקות, ללא גבשושים", category: "צבע וגבס", assignee: "client" },
  { label: "פינות וקצוות — גמר נקי, ללא פגמים", category: "צבע וגבס", assignee: "client" },
  // אינסטלציה
  { label: "ברזי מים — כולם פועלים, אין נזילות", category: "אינסטלציה", assignee: "client" },
  { label: "ניקוז — כל הנקזים זורמים חופשי", category: "אינסטלציה", assignee: "client" },
  { label: "דוד שמש/בויילר — חימום מים תקין", category: "אינסטלציה", assignee: "client" },
  { label: "חיבור מכונת כביסה — מים + ניקוז", category: "אינסטלציה", assignee: "client" },
  // סלון
  { label: "חלונות סלון — נפתחים ונסגרים, איטום תקין", category: "סלון", assignee: "client" },
  { label: "מזגן — מותקן ופועל, שלט תקין", category: "סלון", assignee: "client" },
  { label: "נקודות תקשורת — TV, אינטרנט פועלים", category: "סלון", assignee: "client" },
  // חדרי שינה
  { label: "ארון קיר חדר שינה — דלתות, מדפים, מוטות", category: "חדרי שינה", assignee: "client" },
  { label: "תריסים/וילונות — מנגנון פועל חלק", category: "חדרי שינה", assignee: "client" },
  { label: "מזגן חדר — מותקן ופועל", category: "חדרי שינה", assignee: "client" },
  // מרפסת
  { label: "ריצוף מרפסת — שיפוע ניקוז תקין", category: "מרפסת", assignee: "client" },
  { label: "מעקה — יציב ותקני", category: "מרפסת", assignee: "client" },
  { label: "ברז מרפסת — פועל (אם קיים)", category: "מרפסת", assignee: "client" },
  // כללי — משימות מעצבת
  { label: "תיעוד סופי — צילומי לפני/אחרי הועלו", category: "כללי", assignee: "designer" },
  { label: "תכניות עדכניות — נשלחו ללקוח (PDF)", category: "כללי", assignee: "designer" },
  { label: "אחריות ספקים — כל המסמכים נאספו ונשלחו", category: "כללי", assignee: "designer" },
  { label: "מפרט טכני — עודכן עם שינויים סופיים", category: "כללי", assignee: "designer" },
  { label: "מדריך תחזוקה — הוכן ונמסר ללקוח", category: "כללי", assignee: "designer" },
  { label: "רשימת ספקים — טלפונים ואנשי קשר נמסרו", category: "כללי", assignee: "designer" },
  { label: "חשבון סופי — כל התשלומים סולקו", category: "כללי", assignee: "designer" },
  // כללי — לקוח
  { label: "ניקיון כללי — הדירה נוקתה לאחר השיפוץ", category: "כללי", assignee: "client" },
  { label: "מפתחות — כל המפתחות נמסרו", category: "כללי", assignee: "client" },
  { label: "שלטים — מזגנים, תריסים, שערים", category: "כללי", assignee: "client" },
];

export default function CrmHandoffChecklist({ clientId, projectId }: { clientId?: string; projectId?: string } = {}) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newProjectId, setNewProjectId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<{ label: string; category: string; assignee: "designer" | "client" }>({ label: "", category: "כללי", assignee: "client" });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [cRes, pRes] = await Promise.all([
        fetch("/api/designer/crm/handoff"),
        fetch("/api/designer/crm/projects"),
      ]);
      if (cRes.ok) setChecklists(await cRes.json());
      if (pRes.ok) setProjects(await pRes.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function createChecklist() {
    if (!newProjectId) return;
    try {
      const res = await fetch("/api/designer/crm/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: newProjectId, items: DEFAULT_ITEMS }),
      });
      if (res.ok) {
        const cl = await res.json();
        setChecklists(prev => [cl, ...prev]);
        setCreating(false);
        setNewProjectId("");
        setExpandedId(cl.id);
      }
    } catch (e) { console.error(e); }
  }

  async function toggleItem(checklistId: string, itemId: string, checked: boolean) {
    try {
      const res = await fetch(`/api/designer/crm/handoff/${checklistId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isChecked: checked }),
      });
      if (res.ok) {
        const updated = await res.json();
        setChecklists(prev => prev.map(c => c.id === checklistId
          ? { ...c, items: c.items.map(i => i.id === itemId ? updated : i) }
          : c
        ));
      }
    } catch (e) { console.error(e); }
  }

  async function addItem(checklistId: string) {
    if (!newItem.label.trim()) return;
    try {
      const res = await fetch(`/api/designer/crm/handoff/${checklistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        const item = await res.json();
        setChecklists(prev => prev.map(c => c.id === checklistId
          ? { ...c, items: [...c.items, item] }
          : c
        ));
        setNewItem({ label: "", category: "כללי", assignee: "client" });
        setAddingItem(null);
      }
    } catch (e) { console.error(e); }
  }

  async function addNote(checklistId: string, itemId: string, note: string) {
    try {
      await fetch(`/api/designer/crm/handoff/${checklistId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      setChecklists(prev => prev.map(c => c.id === checklistId
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, note } : i) }
        : c
      ));
    } catch (e) { console.error(e); }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-gold" />
            צ&apos;קליסט מסירה
          </h2>
          <p className="text-sm text-text-muted mt-0.5">ודאו שהכל מושלם לפני מסירה ללקוח</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-gold flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> צ&apos;קליסט חדש
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="card-static space-y-3 animate-in">
          <label className="form-label">בחרי פרויקט</label>
          <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)} className="select-field">
            <option value="">— בחרי —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={createChecklist} disabled={!newProjectId} className="btn-gold disabled:opacity-40">צרי עם פריטי ברירת מחדל</button>
            <button onClick={() => setCreating(false)} className="btn-ghost">ביטול</button>
          </div>
        </div>
      )}

      {/* Checklists */}
      {checklists.map(cl => {
        const total = cl.items.length;
        const checked = cl.items.filter(i => i.isChecked).length;
        const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
        const isExpanded = expandedId === cl.id;
        const designerItems = cl.items.filter(i => i.assignee === "designer");
        const clientItems = cl.items.filter(i => i.assignee === "client");

        return (
          <div key={cl.id} className="card-static">
            {/* Checklist header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : cl.id)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pct === 100 ? "bg-emerald-50" : "bg-gold/8"}`}>
                  {pct === 100
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    : <ClipboardCheck className="w-5 h-5 text-gold" />
                  }
                </div>
                <div className="text-right">
                  <h3 className="font-medium text-text-primary">{cl.project?.name || cl.title}</h3>
                  <p className="text-xs text-text-muted">{checked}/{total} פריטים · {pct}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Progress bar */}
                <div className="w-24 h-2 bg-bg-surface rounded-full overflow-hidden hidden sm:block">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? "bg-emerald-500" : "bg-gold"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
              </div>
            </button>

            {/* Expanded items */}
            {isExpanded && (
              <div className="mt-4 space-y-4 animate-in">
                {/* Client items */}
                <div>
                  <p className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    לאישור הלקוח ({clientItems.filter(i => i.isChecked).length}/{clientItems.length})
                  </p>
                  <div className="space-y-1">
                    {clientItems.map(item => (
                      <ChecklistItem key={item.id} item={item} checklistId={cl.id} onToggle={toggleItem} onAddNote={addNote} />
                    ))}
                  </div>
                </div>

                {/* Designer items */}
                <div>
                  <p className="text-xs font-semibold text-gold mb-2 flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-gold" />
                    לביצוע המעצבת ({designerItems.filter(i => i.isChecked).length}/{designerItems.length})
                  </p>
                  <div className="space-y-1">
                    {designerItems.map(item => (
                      <ChecklistItem key={item.id} item={item} checklistId={cl.id} onToggle={toggleItem} onAddNote={addNote} />
                    ))}
                  </div>
                </div>

                {/* Add item */}
                {addingItem === cl.id ? (
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <input value={newItem.label} onChange={e => setNewItem(p => ({ ...p, label: e.target.value }))} className="input-field text-sm" placeholder="פריט חדש..." />
                    </div>
                    <select value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))} className="select-field text-sm w-32">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={newItem.assignee} onChange={e => setNewItem(p => ({ ...p, assignee: e.target.value as "designer" | "client" }))} className="select-field text-sm w-28">
                      <option value="client">לקוח</option>
                      <option value="designer">מעצבת</option>
                    </select>
                    <button onClick={() => addItem(cl.id)} className="btn-gold text-sm">הוסף</button>
                    <button onClick={() => setAddingItem(null)} className="btn-ghost text-sm">ביטול</button>
                  </div>
                ) : (
                  <button onClick={() => setAddingItem(cl.id)} className="btn-ghost text-xs flex items-center gap-1">
                    <Plus className="w-3 h-3" /> הוסף פריט
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {checklists.length === 0 && !creating && (
        <div className="empty-state">
          <ClipboardCheck className="empty-state-icon" />
          <p className="font-medium text-text-secondary">אין צ&apos;קליסטים עדיין</p>
          <p className="text-sm mt-1 mb-4">צרי צ&apos;קליסט מסירה כשפרויקט מגיע לסיום</p>
          <button onClick={() => setCreating(true)} className="btn-gold">
            <Plus className="w-4 h-4 inline ml-1" /> צרי צ&apos;קליסט ראשון
          </button>
        </div>
      )}
    </div>
  );
}

function ChecklistItem({ item, checklistId, onToggle, onAddNote }: {
  item: HandoffItem;
  checklistId: string;
  onToggle: (clId: string, itemId: string, checked: boolean) => void;
  onAddNote: (clId: string, itemId: string, note: string) => void;
}) {
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(item.note || "");

  return (
    <div className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${item.isChecked ? "bg-emerald-50/50" : "hover:bg-bg-surface"}`}>
      <button
        onClick={() => onToggle(checklistId, item.id, !item.isChecked)}
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0
          ${item.isChecked ? "bg-emerald-500 border-emerald-500 text-white" : "border-border-subtle hover:border-gold"}`}
      >
        {item.isChecked && <Check className="w-3 h-3" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${item.isChecked ? "text-text-muted line-through" : "text-text-primary"}`}>
          {item.label}
        </p>
        {item.category && <span className="badge-gray text-2xs mt-0.5">{item.category}</span>}
        {item.note && !showNote && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {item.note}
          </p>
        )}
        {showNote && (
          <div className="mt-2 flex gap-2">
            <input value={noteText} onChange={e => setNoteText(e.target.value)} className="input-field text-xs" placeholder="הוסף הערה / בעיה..." />
            <button onClick={() => { onAddNote(checklistId, item.id, noteText); setShowNote(false); }} className="btn-ghost text-xs">שמור</button>
          </div>
        )}
      </div>
      <button onClick={() => setShowNote(!showNote)} className="p-1 rounded text-text-faint hover:text-gold transition-colors">
        <MessageSquare className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
