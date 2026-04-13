"use client";
import { useState, useEffect } from "react";
import { DollarSign, Plus, X, Edit3, Trash2, AlertTriangle, TrendingUp, PieChart, CheckCircle2 } from "lucide-react";
import { g } from "@/lib/gender";

interface BudgetItem {
  id: string;
  projectId: string;
  category: string;
  description: string | null;
  plannedAmount: number;
  actualAmount: number;
  supplierName: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

type Project = { id: string; name: string; estimatedBudget: number | null };

const BUDGET_CATEGORIES = ["מטבח", "ריצוף", "תאורה", "נגרות", "אינסטלציה", "חשמל", "צבע", "ריהוט", "טקסטיל", "אביזרים", "עבודות בנייה", "אחר"];
const STATUS_OPTIONS = [
  { value: "planned", label: "מתוכנן", color: "badge-gray" },
  { value: "quoted", label: "הצעת מחיר", color: "badge-blue" },
  { value: "approved", label: "מאושר", color: "badge-yellow" },
  { value: "paid", label: "שולם", color: "badge-green" },
];

export default function CrmBudgetTracker({ clientId, projectId, gender }: { clientId?: string; projectId?: string; gender?: string } = {}) {
  const gdr = gender || "female";
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "מטבח", description: "", plannedAmount: "", actualAmount: "", supplierName: "", status: "planned", notes: "" });

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (selectedProject) fetchItems(); }, [selectedProject]);

  async function fetchData() {
    try {
      const res = await fetch("/api/designer/crm/projects");
      if (res.ok) {
        const p = await res.json();
        setProjects(p);
        if (p.length > 0) setSelectedProject(p[0].id);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchItems() {
    try {
      const res = await fetch(`/api/designer/crm/budget?projectId=${selectedProject}`);
      if (res.ok) setItems(await res.json());
    } catch (e) { console.error(e); }
  }

  async function saveItem() {
    const data = {
      projectId: selectedProject,
      category: form.category,
      description: form.description || null,
      plannedAmount: parseFloat(form.plannedAmount) || 0,
      actualAmount: parseFloat(form.actualAmount) || 0,
      supplierName: form.supplierName || null,
      status: form.status,
      notes: form.notes || null,
    };
    try {
      const url = editingId ? `/api/designer/crm/budget/${editingId}` : "/api/designer/crm/budget";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const saved = await res.json();
        if (editingId) {
          setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
        } else {
          setItems(prev => [...prev, saved]);
        }
        resetForm();
      }
    } catch (e) { console.error(e); }
  }

  async function deleteItem(id: string) {
    try {
      const res = await fetch(`/api/designer/crm/budget/${id}`, { method: "DELETE" });
      if (res.ok) setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) { console.error(e); }
  }

  function editItem(item: BudgetItem) {
    setForm({
      category: item.category,
      description: item.description || "",
      plannedAmount: item.plannedAmount.toString(),
      actualAmount: item.actualAmount.toString(),
      supplierName: item.supplierName || "",
      status: item.status,
      notes: item.notes || "",
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  function resetForm() {
    setForm({ category: "מטבח", description: "", plannedAmount: "", actualAmount: "", supplierName: "", status: "planned", notes: "" });
    setEditingId(null);
    setShowForm(false);
  }

  // Calculations
  const totalPlanned = items.reduce((s, i) => s + i.plannedAmount, 0);
  const totalActual = items.reduce((s, i) => s + i.actualAmount, 0);
  const projectBudget = projects.find(p => p.id === selectedProject)?.estimatedBudget || totalPlanned;
  const overBudget = totalActual > projectBudget;
  const budgetPct = projectBudget > 0 ? Math.round((totalActual / projectBudget) * 100) : 0;

  // Group by category
  const byCategory = items.reduce<Record<string, { planned: number; actual: number; items: BudgetItem[] }>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = { planned: 0, actual: 0, items: [] };
    acc[item.category].planned += item.plannedAmount;
    acc[item.category].actual += item.actualAmount;
    acc[item.category].items.push(item);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gold" />
          מעקב תקציב
        </h2>
        <div className="flex items-center gap-2">
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="select-field text-sm w-48">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowForm(true)} className="btn-gold flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> שורה חדשה
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-static text-center">
            <p className="text-xs text-text-muted">תקציב מתוכנן</p>
            <p className="stat-number mt-1">₪{totalPlanned.toLocaleString()}</p>
          </div>
          <div className="card-static text-center">
            <p className="text-xs text-text-muted">בפועל</p>
            <p className={`stat-number mt-1 ${overBudget ? "text-red-500" : "text-emerald-600"}`}>₪{totalActual.toLocaleString()}</p>
          </div>
          <div className="card-static text-center">
            <p className="text-xs text-text-muted">ניצול תקציב</p>
            <p className={`stat-number mt-1 ${budgetPct > 90 ? "text-red-500" : budgetPct > 70 ? "text-amber-500" : "text-emerald-600"}`}>{budgetPct}%</p>
          </div>
          <div className="card-static text-center">
            <p className="text-xs text-text-muted">הפרש</p>
            <p className={`stat-number mt-1 ${totalActual > totalPlanned ? "text-red-500" : "text-emerald-600"}`}>
              {totalActual > totalPlanned ? "+" : ""}₪{Math.abs(totalActual - totalPlanned).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Budget progress bar */}
      {items.length > 0 && (
        <div className="card-static">
          <div className="flex justify-between text-xs text-text-muted mb-2">
            <span>₪0</span>
            <span>₪{projectBudget.toLocaleString()}</span>
          </div>
          <div className="w-full h-4 bg-bg-surface rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${budgetPct > 90 ? "bg-red-500" : budgetPct > 70 ? "bg-amber-400" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          {overBudget && (
            <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> חריגה מהתקציב!
            </p>
          )}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="card-static space-y-3 animate-in">
          <h3 className="text-sm font-semibold text-text-primary">{editingId ? "עריכת שורה" : "שורה חדשה"}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="select-field text-sm">
              {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="input-field text-sm" placeholder="תיאור" />
            <input value={form.plannedAmount} onChange={e => setForm(p => ({ ...p, plannedAmount: e.target.value }))} type="number" className="input-field text-sm" placeholder="מתוכנן ₪" dir="ltr" />
            <input value={form.actualAmount} onChange={e => setForm(p => ({ ...p, actualAmount: e.target.value }))} type="number" className="input-field text-sm" placeholder="בפועל ₪" dir="ltr" />
            <input value={form.supplierName} onChange={e => setForm(p => ({ ...p, supplierName: e.target.value }))} className="input-field text-sm" placeholder="ספק" />
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="select-field text-sm">
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={saveItem} className="btn-gold text-sm">{editingId ? "עדכן" : "הוסף"}</button>
            <button onClick={resetForm} className="btn-ghost text-sm">ביטול</button>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {Object.entries(byCategory).map(([cat, data]) => {
        const catPct = data.planned > 0 ? Math.round((data.actual / data.planned) * 100) : 0;
        return (
          <div key={cat} className="card-static">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-primary">{cat}</h3>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span>מתוכנן: ₪{data.planned.toLocaleString()}</span>
                <span className={catPct > 100 ? "text-red-500 font-medium" : ""}>בפועל: ₪{data.actual.toLocaleString()}</span>
                {catPct > 90 && <AlertTriangle className="w-3 h-3 text-amber-500" />}
              </div>
            </div>
            <div className="w-full h-1.5 bg-bg-surface rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full ${catPct > 100 ? "bg-red-500" : "bg-gold"}`}
                style={{ width: `${Math.min(catPct, 100)}%` }}
              />
            </div>
            <div className="space-y-1">
              {data.items.map(item => {
                const st = STATUS_OPTIONS.find(s => s.value === item.status);
                return (
                  <div key={item.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-bg-surface transition-colors group text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-text-primary">{item.description || cat}</span>
                      {item.supplierName && <span className="text-text-faint text-xs">· {item.supplierName}</span>}
                      <span className={st?.color || "badge-gray"} style={{ fontSize: "10px" }}>{st?.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted font-mono text-xs">₪{item.plannedAmount.toLocaleString()}</span>
                      <span className="text-text-primary font-mono text-xs font-medium">₪{item.actualAmount.toLocaleString()}</span>
                      <button onClick={() => editItem(item)} className="p-1 opacity-0 group-hover:opacity-100 text-text-faint hover:text-gold transition-all">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="p-1 opacity-0 group-hover:opacity-100 text-text-faint hover:text-red-500 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {items.length === 0 && !showForm && (
        <div className="empty-state">
          <PieChart className="empty-state-icon" />
          <p className="font-medium text-text-secondary">אין פריטי תקציב</p>
          <p className="text-sm mt-1 mb-4">{g(gdr, "הוסף שורות תקציב לפרויקט למעקב חי", "הוסיפי שורות תקציב לפרויקט למעקב חי")}</p>
        </div>
      )}
    </div>
  );
}
