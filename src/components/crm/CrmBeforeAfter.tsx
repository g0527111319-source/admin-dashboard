"use client";

import { useState, useEffect } from "react";
import { Plus, X, Image, Eye, EyeOff, Globe, Trash2, Edit3 } from "lucide-react";

type BeforeAfterSet = {
  id: string;
  projectId: string;
  title: string;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  beforeCaption: string | null;
  afterCaption: string | null;
  isVisibleInPortal: boolean;
  isPublic: boolean;
  createdAt: string;
};

type Project = { id: string; name: string; clientId: string; client: { name: string } };

export default function CrmBeforeAfter() {
  const [sets, setSets] = useState<BeforeAfterSet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    beforeImageUrl: "",
    afterImageUrl: "",
    beforeCaption: "",
    afterCaption: "",
    isVisibleInPortal: true,
    isPublic: false,
  });

  useEffect(() => {
    fetch("/api/designer/crm/projects").then(r => r.ok ? r.json() : []).then(d => {
      const projs = Array.isArray(d) ? d : d.projects || [];
      setProjects(projs);
      if (projs.length > 0) setSelectedProject(projs[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedProject) fetchSets();
  }, [selectedProject]);

  const fetchSets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/designer/crm/projects/${selectedProject}/before-after`);
      if (res.ok) setSets(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ title: "", beforeImageUrl: "", afterImageUrl: "", beforeCaption: "", afterCaption: "", isVisibleInPortal: true, isPublic: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.title || !selectedProject) return;
    const url = editingId
      ? `/api/designer/crm/projects/${selectedProject}/before-after/${editingId}`
      : `/api/designer/crm/projects/${selectedProject}/before-after`;
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { resetForm(); fetchSets(); }
  };

  const handleEdit = (set: BeforeAfterSet) => {
    setForm({
      title: set.title,
      beforeImageUrl: set.beforeImageUrl || "",
      afterImageUrl: set.afterImageUrl || "",
      beforeCaption: set.beforeCaption || "",
      afterCaption: set.afterCaption || "",
      isVisibleInPortal: set.isVisibleInPortal,
      isPublic: set.isPublic,
    });
    setEditingId(set.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את הסט הזה?")) return;
    await fetch(`/api/designer/crm/projects/${selectedProject}/before-after/${id}`, { method: "DELETE" });
    fetchSets();
  };

  const toggleVisibility = async (set: BeforeAfterSet, field: "isVisibleInPortal" | "isPublic") => {
    await fetch(`/api/designer/crm/projects/${selectedProject}/before-after/${set.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !set[field] }),
    });
    fetchSets();
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading text-text-primary">לפני ואחרי</h2>
          <p className="text-sm text-text-muted mt-1">גלריית השוואה — הציגי את העבודה שלך</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-gold flex items-center gap-2">
          <Plus className="w-4 h-4" /> הוסיפי סט
        </button>
      </div>

      {/* Project selector */}
      <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="border border-border-subtle rounded-lg px-3 py-2 text-sm">
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {/* Form */}
      {showForm && (
        <div className="card-static space-y-4 border-2 border-gold/30">
          <div className="flex justify-between items-center">
            <h3 className="font-heading font-semibold">{editingId ? "עריכת" : "הוספת"} סט לפני/אחרי</h3>
            <button onClick={resetForm}><X className="w-5 h-5 text-text-muted" /></button>
          </div>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="שם החדר (לדוגמה: סלון)" className="w-full border border-border-subtle rounded-lg px-3 py-2" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">תמונת לפני</label>
              <input value={form.beforeImageUrl} onChange={e => setForm({ ...form, beforeImageUrl: e.target.value })} placeholder="URL תמונה" className="w-full border border-border-subtle rounded-lg px-3 py-2 text-sm" />
              <input value={form.beforeCaption} onChange={e => setForm({ ...form, beforeCaption: e.target.value })} placeholder="כיתוב (אופציונלי)" className="w-full border border-border-subtle rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">תמונת אחרי</label>
              <input value={form.afterImageUrl} onChange={e => setForm({ ...form, afterImageUrl: e.target.value })} placeholder="URL תמונה" className="w-full border border-border-subtle rounded-lg px-3 py-2 text-sm" />
              <input value={form.afterCaption} onChange={e => setForm({ ...form, afterCaption: e.target.value })} placeholder="כיתוב (אופציונלי)" className="w-full border border-border-subtle rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isVisibleInPortal} onChange={e => setForm({ ...form, isVisibleInPortal: e.target.checked })} />
              הצגה בפורטל הלקוח
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPublic} onChange={e => setForm({ ...form, isPublic: e.target.checked })} />
              הצגה בכרטיס הביקור (פומבי)
            </label>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-text-muted">ביטול</button>
            <button onClick={handleSubmit} disabled={!form.title} className="btn-gold">{editingId ? "עדכני" : "הוסיפי"}</button>
          </div>
        </div>
      )}

      {/* Sets grid */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">טוען...</div>
      ) : sets.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>אין תמונות לפני/אחרי בפרויקט הזה</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sets.map(set => (
            <div key={set.id} className="card-static">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{set.title}</h3>
                <div className="flex gap-1">
                  <button onClick={() => toggleVisibility(set, "isVisibleInPortal")} title={set.isVisibleInPortal ? "מוצג בפורטל" : "מוסתר מפורטל"} className={`p-1.5 rounded ${set.isVisibleInPortal ? "text-green-600" : "text-gray-300"}`}>
                    {set.isVisibleInPortal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => toggleVisibility(set, "isPublic")} title={set.isPublic ? "פומבי" : "פרטי"} className={`p-1.5 rounded ${set.isPublic ? "text-gold" : "text-gray-300"}`}>
                    <Globe className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEdit(set)} className="p-1.5 text-text-muted hover:text-text-primary"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(set.id)} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-100 rounded-lg h-36 flex flex-col items-center justify-center text-gray-400">
                  {set.beforeImageUrl ? (
                    <div className="w-full h-full bg-cover bg-center rounded-lg" style={{ backgroundImage: `url(${set.beforeImageUrl})` }} />
                  ) : (
                    <><Image className="w-8 h-8 mb-1" /><span className="text-xs">לפני</span></>
                  )}
                </div>
                <div className="bg-gray-100 rounded-lg h-36 flex flex-col items-center justify-center text-gray-400">
                  {set.afterImageUrl ? (
                    <div className="w-full h-full bg-cover bg-center rounded-lg" style={{ backgroundImage: `url(${set.afterImageUrl})` }} />
                  ) : (
                    <><Image className="w-8 h-8 mb-1" /><span className="text-xs">אחרי</span></>
                  )}
                </div>
              </div>

              {(set.beforeCaption || set.afterCaption) && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <p className="text-xs text-text-muted text-center">{set.beforeCaption}</p>
                  <p className="text-xs text-text-muted text-center">{set.afterCaption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
