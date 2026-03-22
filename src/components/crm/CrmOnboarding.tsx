"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2, Circle, Plus, X, Settings, GripVertical, Trash2, Users
} from "lucide-react";

type OnboardingTemplate = {
  id: string;
  title: string;
  sortOrder: number;
  isDefault: boolean;
};

type OnboardingItem = {
  id: string;
  title: string;
  sortOrder: number;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string | null;
};

type Client = { id: string; name: string };

export default function CrmOnboarding() {
  const [view, setView] = useState<"templates" | "clients">("clients");
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    fetchClients();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedClient) fetchItems();
  }, [selectedClient]);

  const fetchClients = async () => {
    const res = await fetch("/api/designer/crm/clients");
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.clients || [];
      setClients(list);
      if (list.length > 0) setSelectedClient(list[0].id);
    }
    setLoading(false);
  };

  const fetchTemplates = async () => {
    const res = await fetch("/api/designer/crm/onboarding/templates");
    if (res.ok) setTemplates(await res.json());
  };

  const fetchItems = async () => {
    const res = await fetch(`/api/designer/crm/onboarding/${selectedClient}`);
    if (res.ok) setItems(await res.json());
  };

  // Template management
  const addTemplate = async () => {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/designer/crm/onboarding/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, sortOrder: templates.length }),
    });
    if (res.ok) { setNewTitle(""); fetchTemplates(); }
  };

  const deleteTemplate = async (id: string) => {
    await fetch(`/api/designer/crm/onboarding/templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  };

  const toggleDefault = async (tmpl: OnboardingTemplate) => {
    await fetch(`/api/designer/crm/onboarding/templates/${tmpl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: !tmpl.isDefault }),
    });
    fetchTemplates();
  };

  // Client items
  const addItem = async () => {
    if (!newTitle.trim() || !selectedClient) return;
    const res = await fetch(`/api/designer/crm/onboarding/${selectedClient}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, sortOrder: items.length }),
    });
    if (res.ok) { setNewTitle(""); fetchItems(); }
  };

  const loadDefaults = async () => {
    const res = await fetch(`/api/designer/crm/onboarding/${selectedClient}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromDefaults: true }),
    });
    if (res.ok) fetchItems();
  };

  const toggleItem = async (item: OnboardingItem) => {
    await fetch(`/api/designer/crm/onboarding/${selectedClient}/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !item.isCompleted, completedBy: "designer" }),
    });
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    await fetch(`/api/designer/crm/onboarding/${selectedClient}/${id}`, { method: "DELETE" });
    fetchItems();
  };

  const completedCount = items.filter(i => i.isCompleted).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  if (loading) return <div className="text-center py-12 text-text-muted">טוען...</div>;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading text-text-primary">צ׳קליסט כניסה</h2>
          <p className="text-sm text-text-muted mt-1">נהלי את תהליך הקליטה של לקוחות חדשים</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("clients")} className={`px-3 py-1.5 rounded-lg text-sm ${view === "clients" ? "bg-gold text-white" : "bg-bg text-text-muted"}`}>
            <Users className="w-4 h-4 inline ml-1" /> לקוחות
          </button>
          <button onClick={() => setView("templates")} className={`px-3 py-1.5 rounded-lg text-sm ${view === "templates" ? "bg-gold text-white" : "bg-bg text-text-muted"}`}>
            <Settings className="w-4 h-4 inline ml-1" /> תבנית ברירת מחדל
          </button>
        </div>
      </div>

      {view === "templates" ? (
        /* Templates view */
        <div className="card-static space-y-4">
          <h3 className="font-heading font-semibold">פריטי ברירת מחדל לכל לקוח חדש</h3>
          <p className="text-sm text-text-muted">הפריטים שמסומנים כ&quot;ברירת מחדל&quot; ייווצרו אוטומטית בצ׳קליסט של כל לקוח חדש</p>

          <div className="space-y-2">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="flex items-center gap-3 bg-bg rounded-lg px-3 py-2">
                <GripVertical className="w-4 h-4 text-text-muted" />
                <span className="flex-1 text-sm">{tmpl.title}</span>
                <button onClick={() => toggleDefault(tmpl)} className={`text-xs px-2 py-0.5 rounded-full ${tmpl.isDefault ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {tmpl.isDefault ? "ברירת מחדל ✓" : "לא פעיל"}
                </button>
                <button onClick={() => deleteTemplate(tmpl.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && addTemplate()} placeholder="פריט חדש לתבנית..." className="flex-1 border border-border-subtle rounded-lg px-3 py-2 text-sm" />
            <button onClick={addTemplate} disabled={!newTitle.trim()} className="btn-gold"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      ) : (
        /* Client items view */
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="border border-border-subtle rounded-lg px-3 py-2 text-sm flex-1">
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {items.length === 0 && templates.length > 0 && (
              <button onClick={loadDefaults} className="btn-gold text-sm">טען ברירות מחדל</button>
            )}
          </div>

          {items.length > 0 && (
            <div className="card-static">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{completedCount} מתוך {items.length} הושלמו</span>
                <span className="text-sm text-gold font-bold">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="bg-gold rounded-full h-2 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            {items.sort((a, b) => a.sortOrder - b.sortOrder).map(item => (
              <div key={item.id} className={`flex items-center gap-3 bg-white rounded-lg border px-4 py-3 transition-all ${item.isCompleted ? "border-green-200 bg-green-50/50" : "border-border-subtle"}`}>
                <button onClick={() => toggleItem(item)}>
                  {item.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-300" />
                  )}
                </button>
                <span className={`flex-1 text-sm ${item.isCompleted ? "line-through text-text-muted" : "text-text-primary"}`}>
                  {item.title}
                </span>
                {item.completedAt && (
                  <span className="text-xs text-text-muted">
                    {item.completedBy === "client" ? "✓ לקוח" : "✓ מעצבת"} • {new Date(item.completedAt).toLocaleDateString("he-IL")}
                  </span>
                )}
                <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && addItem()} placeholder="הוסיפי פריט לצ׳קליסט..." className="flex-1 border border-border-subtle rounded-lg px-3 py-2 text-sm" />
            <button onClick={addItem} disabled={!newTitle.trim()} className="btn-gold"><Plus className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
