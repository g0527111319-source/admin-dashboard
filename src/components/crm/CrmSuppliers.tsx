"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Phone, Mail, Globe, Edit3, Trash2, ChevronLeft, Building2 } from "lucide-react";

type CrmSupplier = {
  id: string;
  name: string;
  category: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  createdAt: string;
};

const SUPPLIER_CATEGORIES = ["ריצוף וחיפוי", "תאורה", "מטבחים", "חוץ ונוף", "דלתות וחלונות", "נגרות", "סנטרייה", "חשמל", "צבע ושפכטל", "ריהוט", "טקסטיל", "מוצרי אמבטיה", "מיזוג אוויר", "אחר"];

export default function CrmSuppliers() {
  const [suppliers, setSuppliers] = useState<CrmSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CrmSupplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", category: "אחר", contactName: "", phone: "", email: "", website: "", notes: "" });

  const fetchSuppliers = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter !== "ALL") params.set("category", categoryFilter);
    try {
      const res = await fetch(`/api/designer/crm/suppliers?${params}`);
      if (res.ok) setSuppliers(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  }, [search, categoryFilter]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const url = editing ? `/api/designer/crm/suppliers/${editing.id}` : "/api/designer/crm/suppliers";
      await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setShowForm(false);
      setEditing(null);
      setFormData({ name: "", category: "אחר", contactName: "", phone: "", email: "", website: "", notes: "" });
      fetchSuppliers();
    } catch { /* */ } finally { setSaving(false); }
  };

  const startEdit = (s: CrmSupplier) => {
    setEditing(s);
    setFormData({ name: s.name, category: s.category, contactName: s.contactName || "", phone: s.phone || "", email: s.email || "", website: s.website || "", notes: s.notes || "" });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק ספק?")) return;
    try { await fetch(`/api/designer/crm/suppliers/${id}`, { method: "DELETE" }); fetchSuppliers(); } catch { /* */ }
  };

  if (showForm) {
    return (
      <div className="space-y-6 animate-in max-w-lg mx-auto">
        <button onClick={() => { setShowForm(false); setEditing(null); }} className="flex items-center gap-1 text-gold text-sm hover:underline">
          <ChevronLeft className="w-4 h-4" /> חזרה
        </button>
        <h2 className="text-xl font-heading text-text-primary">{editing ? "עריכת ספק" : "ספק חדש"}</h2>
        <form onSubmit={handleSubmit} className="card-static space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">שם העסק *</label>
              <input type="text" className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">קטגוריה</label>
              <select className="select-field" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">איש קשר</label>
              <input type="text" className="input-field" value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} />
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">טלפון</label>
              <input type="tel" className="input-field" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} dir="ltr" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">מייל</label>
              <input type="email" className="input-field" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} dir="ltr" />
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">אתר</label>
              <input type="url" className="input-field" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} dir="ltr" />
            </div>
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">הערות</label>
            <textarea className="input-field h-20 resize-none" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
          </div>
          <button type="submit" disabled={saving} className="btn-gold w-full">{saving ? "שומר..." : editing ? "עדכון" : "הוספה"}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-text-primary flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gold" /> הספקים שלי
        </h2>
        <button onClick={() => { setFormData({ name: "", category: "אחר", contactName: "", phone: "", email: "", website: "", notes: "" }); setEditing(null); setShowForm(true); }} className="btn-gold text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> ספק חדש
        </button>
      </div>

      <div className="card-static">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input type="text" className="input-field pr-12" placeholder="חיפוש ספק..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select-field sm:w-40" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="ALL">כל הקטגוריות</option>
            {SUPPLIER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">טוען...</div>
      ) : suppliers.length === 0 ? (
        <div className="card-static text-center py-12 text-text-muted">
          {search || categoryFilter !== "ALL" ? "לא נמצאו ספקים" : "אין ספקים עדיין"}
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map(s => (
            <div key={s.id} className="card-static">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-gold font-bold">{s.name[0]}</span>
                  </div>
                  <div>
                    <p className="text-text-primary font-medium">{s.name}</p>
                    <span className="badge-gold text-[10px]">{s.category}</span>
                    <div className="flex gap-3 mt-1 text-xs text-text-muted">
                      {s.contactName && <span>{s.contactName}</span>}
                      {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                      {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(s)} className="p-1.5 text-text-muted hover:text-gold"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 text-text-muted hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
