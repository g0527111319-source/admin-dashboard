"use client";
// Per-client supplier list — visible inside a client's detail view in
// /designer/[id] → "לקוחות" → client → "ספקים".
//
// Designer can:
//   - add a supplier from the community (logo captured), from her personal
//     CrmSupplier list (no logo), or as a custom one-off entry (typed in)
//   - edit any of the snapshot fields (name/contact/phone/email/website/logo/notes)
//   - hide an entry from the client portal (showToClient toggle)
//   - soft-delete an entry

import { useCallback, useEffect, useState } from "react";
import {
  Building2, Plus, Edit3, Trash2, Eye, EyeOff, Loader2, AlertTriangle,
  Phone, Mail, Globe, X as XIcon, Save,
} from "lucide-react";

interface ClientSupplier {
  id: string;
  name: string;
  category: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  notes: string | null;
  communitySupplierId: string | null;
  crmSupplierId: string | null;
  showToClient: boolean;
  createdAt: string;
}

type Source = "community" | "personal" | "custom";

interface CommunitySupplier { id: string; name: string; category: string; logo: string | null; city: string | null }
interface CrmSupplier { id: string; name: string; category: string }

interface Props { clientId: string }

const EMPTY_FORM = {
  source: "community" as Source,
  communitySupplierId: "",
  crmSupplierId: "",
  name: "",
  category: "",
  contactName: "",
  phone: "",
  email: "",
  website: "",
  notes: "",
};

export default function ClientSuppliersPanel({ clientId }: Props) {
  const [items, setItems] = useState<ClientSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [communitySuppliers, setCommunitySuppliers] = useState<CommunitySupplier[]>([]);
  const [personalSuppliers, setPersonalSuppliers] = useState<CrmSupplier[]>([]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await fetch(`/api/designer/crm/clients/${clientId}/suppliers`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setItems(data.suppliers || []);
    } catch {
      setError("שגיאה בטעינת ספקי הפרויקט");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Lazy-load dropdowns on first add-form open.
  useEffect(() => {
    if (!showAdd) return;
    if (communitySuppliers.length === 0) {
      fetch("/api/suppliers?active=true")
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => Array.isArray(d) && setCommunitySuppliers(d.map((s: { id: string; name: string; category: string; logo: string | null; city: string | null }) => ({ id: s.id, name: s.name, category: s.category, logo: s.logo ?? null, city: s.city ?? null }))))
        .catch(() => { /* non-fatal */ });
    }
    if (personalSuppliers.length === 0) {
      fetch("/api/designer/crm/suppliers")
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => Array.isArray(d) && setPersonalSuppliers(d.map((s: { id: string; name: string; category: string }) => ({ id: s.id, name: s.name, category: s.category }))))
        .catch(() => { /* non-fatal */ });
    }
  }, [showAdd, communitySuppliers.length, personalSuppliers.length]);

  const openEdit = (s: ClientSupplier) => {
    setEditingId(s.id);
    setForm({
      source: s.communitySupplierId ? "community" : s.crmSupplierId ? "personal" : "custom",
      communitySupplierId: s.communitySupplierId || "",
      crmSupplierId: s.crmSupplierId || "",
      name: s.name,
      category: s.category || "",
      contactName: s.contactName || "",
      phone: s.phone || "",
      email: s.email || "",
      website: s.website || "",
      notes: s.notes || "",
    });
    setShowAdd(true);
  };

  const closeForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const submitForm = async () => {
    if (form.source === "community" && !form.communitySupplierId) { alert("בחרי ספק מהרשימה"); return; }
    if (form.source === "personal" && !form.crmSupplierId) { alert("בחרי ספק שלך"); return; }
    if (form.source === "custom" && !form.name.trim()) { alert("שם הספק חובה"); return; }
    setBusyId("__form__");
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim() || undefined,
        category: form.category.trim() || undefined,
        contactName: form.contactName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        website: form.website.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editingId) {
        // Edit only sends override fields — source can't change.
        const r = await fetch(`/api/designer/crm/clients/${clientId}/suppliers/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) { const e = await r.json().catch(() => ({})); alert(e.error || "שגיאה בשמירה"); return; }
      } else {
        // Add — picks up the source.
        payload.source = form.source;
        if (form.source === "community") payload.communitySupplierId = form.communitySupplierId;
        if (form.source === "personal") payload.crmSupplierId = form.crmSupplierId;
        const r = await fetch(`/api/designer/crm/clients/${clientId}/suppliers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) { const e = await r.json().catch(() => ({})); alert(e.error || "שגיאה בהוספה"); return; }
      }
      closeForm();
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const toggleVisibility = async (s: ClientSupplier) => {
    setBusyId(s.id);
    try {
      const r = await fetch(`/api/designer/crm/clients/${clientId}/suppliers/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showToClient: !s.showToClient }),
      });
      if (r.ok) await load();
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (s: ClientSupplier) => {
    if (!confirm(`להסיר את "${s.name}" מרשימת ספקי הפרויקט?`)) return;
    setBusyId(s.id);
    try {
      const r = await fetch(`/api/designer/crm/clients/${clientId}/suppliers/${s.id}`, { method: "DELETE" });
      if (r.ok) await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-heading text-text-primary flex items-center gap-2">
            <Building2 className="w-5 h-5" /> ספקי הפרויקט
          </h3>
          <p className="text-text-muted text-xs mt-1">
            ספקים שנבחרו עבור הפרויקט. הלקוח רואה רק רשומות שמסומנות &quot;מוצג ללקוח&quot;.
          </p>
        </div>
        {!showAdd && (
          <button onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); setShowAdd(true); }} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> הוסף ספק
          </button>
        )}
      </div>

      {showAdd && (
        <div className="card-static space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-text-primary">{editingId ? "עריכת ספק" : "הוספת ספק"}</h4>
            <button onClick={closeForm} className="text-text-muted hover:text-red-500"><XIcon className="w-4 h-4" /></button>
          </div>

          {!editingId && (
            <div>
              <label className="text-text-muted text-xs block mb-1">מקור</label>
              <div className="flex gap-2 flex-wrap">
                {([["community", "ספק קהילה"], ["personal", "ספק שלי"], ["custom", "הוסף ידני"]] as [Source, string][]).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setForm({ ...form, source: k, communitySupplierId: "", crmSupplierId: "", name: "" })}
                    className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${form.source === k ? "bg-gold/15 border-gold text-gold font-medium" : "border-border-subtle text-text-muted hover:text-text-primary"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!editingId && form.source === "community" && (
            <div>
              <label className="text-text-muted text-xs block mb-1">בחרי ספק מהקהילה</label>
              <select className="select-dark w-full" value={form.communitySupplierId} onChange={(e) => {
                const id = e.target.value;
                const picked = communitySuppliers.find((s) => s.id === id);
                setForm({
                  ...form,
                  communitySupplierId: id,
                  name: picked?.name || "",
                  category: picked?.category || "",
                });
              }}>
                <option value="">— בחרי —</option>
                {communitySuppliers.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.category}</option>)}
              </select>
            </div>
          )}

          {!editingId && form.source === "personal" && (
            <div>
              <label className="text-text-muted text-xs block mb-1">בחרי ספק מהרשימה האישית שלך</label>
              <select className="select-dark w-full" value={form.crmSupplierId} onChange={(e) => {
                const id = e.target.value;
                const picked = personalSuppliers.find((s) => s.id === id);
                setForm({
                  ...form,
                  crmSupplierId: id,
                  name: picked?.name || "",
                  category: picked?.category || "",
                });
              }}>
                <option value="">— בחרי —</option>
                {personalSuppliers.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.category}</option>)}
              </select>
              {personalSuppliers.length === 0 && (
                <p className="text-text-muted text-xs mt-1">אין לך עדיין ספקים אישיים. אפשר להוסיף ב&quot;ספקים שלי&quot;.</p>
              )}
            </div>
          )}

          {/* Override / custom fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-text-muted text-xs block mb-1">שם {form.source === "custom" && !editingId && <span className="text-red-500">*</span>}</label>
              <input className="input-dark w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-text-muted text-xs block mb-1">קטגוריה</label>
              <input className="input-dark w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <label className="text-text-muted text-xs block mb-1">איש קשר</label>
              <input className="input-dark w-full" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div>
              <label className="text-text-muted text-xs block mb-1">טלפון</label>
              <input dir="ltr" className="input-dark w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="text-text-muted text-xs block mb-1">מייל</label>
              <input dir="ltr" className="input-dark w-full" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-text-muted text-xs block mb-1">אתר</label>
              <input dir="ltr" className="input-dark w-full" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-text-muted text-xs block mb-1">הערות (פרטיות, לא מוצגות ללקוח)</label>
            <textarea rows={2} className="input-dark w-full resize-none" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <button onClick={submitForm} disabled={busyId === "__form__"} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-60">
              {busyId === "__form__" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingId ? "שמור שינויים" : "הוסף לרשימה"}
            </button>
            <button onClick={closeForm} className="btn-outline text-sm">ביטול</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-text-muted"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : error ? (
        <div className="text-red-500 text-center py-6"><AlertTriangle className="w-6 h-6 mx-auto mb-2" />{error}</div>
      ) : items.length === 0 ? (
        <div className="card-static text-center py-10 text-text-muted">
          <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p>עדיין לא נבחרו ספקים לפרויקט.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items.map((s) => (
            <div key={s.id} className={`card-static ${!s.showToClient ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                {s.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.logo} alt={s.name} className="w-12 h-12 rounded object-contain bg-white border border-border-subtle p-1 flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded bg-gold/15 flex items-center justify-center text-gold font-bold flex-shrink-0">{s.name[0]}</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-text-primary font-medium">{s.name}</p>
                    {s.communitySupplierId && <span className="text-[9px] bg-gold/10 text-gold px-1.5 py-0.5 rounded">קהילה</span>}
                    {s.crmSupplierId && <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">אישי</span>}
                    {!s.communitySupplierId && !s.crmSupplierId && <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">ידני</span>}
                  </div>
                  {s.category && <p className="text-text-muted text-xs">{s.category}</p>}
                  {s.contactName && <p className="text-text-muted text-xs mt-0.5">{s.contactName}</p>}
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-text-muted">
                    {s.phone && <a href={`tel:${s.phone}`} className="flex items-center gap-1 hover:text-gold" dir="ltr"><Phone className="w-3 h-3" />{s.phone}</a>}
                    {s.email && <a href={`mailto:${s.email}`} className="flex items-center gap-1 hover:text-gold truncate max-w-[180px]" dir="ltr"><Mail className="w-3 h-3" />{s.email}</a>}
                    {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-gold"><Globe className="w-3 h-3" />אתר</a>}
                  </div>
                  {s.notes && <p className="text-yellow-700 bg-yellow-50 text-xs rounded px-2 py-1 mt-2 border border-yellow-200">📝 {s.notes}</p>}
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-border/30">
                <button onClick={() => toggleVisibility(s)} disabled={busyId === s.id} className="text-text-muted hover:text-gold transition-colors" title={s.showToClient ? "הסתר מהלקוח" : "הצג ללקוח"}>
                  {s.showToClient ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => openEdit(s)} className="text-text-muted hover:text-gold transition-colors" title="ערוך">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => removeItem(s)} disabled={busyId === s.id} className="text-text-muted hover:text-red-500 transition-colors" title="מחק">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
