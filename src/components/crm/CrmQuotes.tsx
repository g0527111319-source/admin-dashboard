"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, FileText, ChevronLeft, Trash2, Send, CheckCircle2, Clock, Edit3, Download } from "lucide-react";
import PdfExportButton from "@/components/PdfExportButton";

type QuoteService = { name: string; description?: string; quantity: number; unitPrice: number; total: number };

type Quote = {
  id: string;
  projectId: string;
  quoteNumber: string | null;
  title: string;
  services: QuoteService[];
  totalAmount: number;
  paymentTerms: string | null;
  validUntil: string | null;
  status: string;
  createdAt: string;
};

type Project = { id: string; name: string; client: { name: string } };

const statusLabel: Record<string, string> = {
  DRAFT: "טיוטה",
  SENT: "נשלח",
  APPROVED: "אושר",
  REVISION_REQUESTED: "נדרש תיקון",
  REJECTED: "נדחה",
  CONVERTED_TO_CONTRACT: "הומר לחוזה",
};

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-50 text-blue-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REVISION_REQUESTED: "bg-amber-50 text-amber-700",
  REJECTED: "bg-red-50 text-red-700",
  CONVERTED_TO_CONTRACT: "bg-purple-50 text-purple-700",
};

export default function CrmQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    paymentTerms: "",
    validUntil: "",
    services: [{ name: "", description: "", quantity: 1, unitPrice: 0, total: 0 }] as QuoteService[],
  });

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) setSelectedProjectId(data[0].id);
      }
    } catch { /* */ }
  }, [selectedProjectId]);

  const fetchQuotes = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/designer/crm/projects/${selectedProjectId}/quotes`);
      if (res.ok) setQuotes(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  }, [selectedProjectId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const calcTotal = (services: QuoteService[]) => services.reduce((s, sv) => s + sv.total, 0);

  const buildQuoteHtml = (quote: Quote) => {
    const project = projects.find(p => p.id === quote.projectId);
    const rows = (quote.services || []).map(s =>
      `<tr><td>${s.name}</td><td>${s.quantity}</td><td>₪${s.unitPrice.toLocaleString()}</td><td>₪${s.total.toLocaleString()}</td></tr>`
    ).join("");
    return `
      <div class="info-row"><span class="info-label">פרויקט:</span><span class="info-value">${project?.name || ""}</span></div>
      <div class="info-row"><span class="info-label">לקוח:</span><span class="info-value">${project?.client?.name || ""}</span></div>
      ${quote.quoteNumber ? `<div class="info-row"><span class="info-label">מספר הצעה:</span><span class="info-value">#${quote.quoteNumber}</span></div>` : ""}
      ${quote.validUntil ? `<div class="info-row"><span class="info-label">בתוקף עד:</span><span class="info-value">${new Date(quote.validUntil).toLocaleDateString("he-IL")}</span></div>` : ""}
      ${quote.paymentTerms ? `<div class="info-row"><span class="info-label">תנאי תשלום:</span><span class="info-value">${quote.paymentTerms}</span></div>` : ""}
      <table>
        <thead><tr><th>שירות</th><th>כמות</th><th>מחיר ליחידה</th><th>סה״כ</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="total-row"><td colspan="3">סה״כ</td><td>₪${quote.totalAmount.toLocaleString()}</td></tr></tfoot>
      </table>
    `;
  };

  const updateService = (index: number, field: string, value: string | number) => {
    const updated = [...formData.services];
    (updated[index] as Record<string, unknown>)[field] = value;
    if (field === "quantity" || field === "unitPrice") {
      updated[index].total = Number(updated[index].quantity) * Number(updated[index].unitPrice);
    }
    setFormData({ ...formData, services: updated });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !selectedProjectId) return;
    setSaving(true);
    try {
      const url = editingQuote
        ? `/api/designer/crm/projects/${selectedProjectId}/quotes/${editingQuote.id}`
        : `/api/designer/crm/projects/${selectedProjectId}/quotes`;
      await fetch(url, {
        method: editingQuote ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          totalAmount: calcTotal(formData.services),
          validUntil: formData.validUntil || null,
        }),
      });
      setShowAdd(false);
      setEditingQuote(null);
      setFormData({ title: "", paymentTerms: "", validUntil: "", services: [{ name: "", description: "", quantity: 1, unitPrice: 0, total: 0 }] });
      fetchQuotes();
    } catch { /* */ } finally { setSaving(false); }
  };

  const updateStatus = async (quoteId: string, status: string) => {
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchQuotes();
    } catch { /* */ }
  };

  const deleteQuote = async (quoteId: string) => {
    if (!confirm("למחוק את ההצעה?")) return;
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/quotes/${quoteId}`, { method: "DELETE" });
      fetchQuotes();
    } catch { /* */ }
  };

  if (showAdd || editingQuote) {
    return (
      <div className="space-y-6 animate-in max-w-2xl mx-auto">
        <button onClick={() => { setShowAdd(false); setEditingQuote(null); }} className="flex items-center gap-1 text-gold text-sm hover:underline">
          <ChevronLeft className="w-4 h-4" /> חזרה
        </button>
        <h2 className="text-xl font-heading text-text-primary">{editingQuote ? "עריכת הצעת מחיר" : "הצעת מחיר חדשה"}</h2>
        <div className="card-static space-y-4">
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">כותרת *</label>
            <input type="text" className="input-field" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </div>

          <div>
            <label className="text-text-secondary text-sm font-medium block mb-2">שורות שירות</label>
            {formData.services.map((svc, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-4">
                  <input type="text" className="input-field text-sm" placeholder="שם השירות" value={svc.name} onChange={e => updateService(i, "name", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <input type="number" className="input-field text-sm" placeholder="כמות" value={svc.quantity} onChange={e => updateService(i, "quantity", Number(e.target.value))} dir="ltr" />
                </div>
                <div className="col-span-3">
                  <input type="number" className="input-field text-sm" placeholder="מחיר ליחידה" value={svc.unitPrice} onChange={e => updateService(i, "unitPrice", Number(e.target.value))} dir="ltr" />
                </div>
                <div className="col-span-2 text-sm font-mono text-text-primary text-center py-2">
                  ₪{svc.total.toLocaleString()}
                </div>
                <button className="col-span-1 text-red-400 hover:text-red-600 text-center pb-2" onClick={() => setFormData({ ...formData, services: formData.services.filter((_, idx) => idx !== i) })}>✕</button>
              </div>
            ))}
            <button onClick={() => setFormData({ ...formData, services: [...formData.services, { name: "", description: "", quantity: 1, unitPrice: 0, total: 0 }] })} className="text-gold text-sm hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" /> הוסף שורה
            </button>
          </div>

          <div className="flex justify-between items-center p-3 bg-gold/5 rounded-btn">
            <span className="font-heading font-bold">סה״כ</span>
            <span className="font-mono font-bold text-lg">₪{calcTotal(formData.services).toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">תנאי תשלום</label>
              <input type="text" className="input-field" value={formData.paymentTerms} onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })} placeholder="לדוגמה: 50% מקדמה, 50% בסיום" />
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">בתוקף עד</label>
              <input type="date" className="input-field" value={formData.validUntil} onChange={e => setFormData({ ...formData, validUntil: e.target.value })} dir="ltr" />
            </div>
          </div>

          <button onClick={handleSubmit} disabled={saving} className="btn-gold w-full">
            {saving ? "שומר..." : editingQuote ? "עדכון" : "יצירת הצעה"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-text-primary">הצעות מחיר</h2>
        <button onClick={() => { setShowAdd(true); setFormData({ title: "", paymentTerms: "", validUntil: "", services: [{ name: "", description: "", quantity: 1, unitPrice: 0, total: 0 }] }); }} className="btn-gold text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> הצעה חדשה
        </button>
      </div>

      <select className="select-field" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
        <option value="">בחרי פרויקט...</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.client.name}</option>)}
      </select>

      {!selectedProjectId ? (
        <div className="card-static text-center py-12 text-text-muted">בחרי פרויקט</div>
      ) : loading ? (
        <div className="text-center py-12 text-text-muted">טוען...</div>
      ) : quotes.length === 0 ? (
        <div className="card-static text-center py-12 text-text-muted">אין הצעות מחיר עדיין</div>
      ) : (
        <div className="space-y-3">
          {quotes.map(quote => (
            <div key={quote.id} className="card-static">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-text-primary font-medium">{quote.title}</h3>
                  {quote.quoteNumber && <p className="text-xs text-text-muted">#{quote.quoteNumber}</p>}
                </div>
                <span className={`badge text-[10px] px-2 py-0.5 rounded-full ${statusColor[quote.status]}`}>
                  {statusLabel[quote.status]}
                </span>
              </div>
              <p className="text-lg font-mono font-bold text-text-primary mb-2">₪{quote.totalAmount.toLocaleString()}</p>
              {quote.validUntil && <p className="text-xs text-text-muted mb-3">בתוקף עד: {new Date(quote.validUntil).toLocaleDateString("he-IL")}</p>}
              <div className="flex gap-2 flex-wrap">
                {quote.status === "DRAFT" && (
                  <button onClick={() => updateStatus(quote.id, "SENT")} className="text-xs px-3 py-1.5 rounded-btn bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1">
                    <Send className="w-3 h-3" /> שלח ללקוח
                  </button>
                )}
                {quote.status === "SENT" && (
                  <button onClick={() => updateStatus(quote.id, "APPROVED")} className="text-xs px-3 py-1.5 rounded-btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> אשר
                  </button>
                )}
                <button onClick={() => { setEditingQuote(quote); setFormData({ title: quote.title, paymentTerms: quote.paymentTerms || "", validUntil: quote.validUntil?.split("T")[0] || "", services: quote.services || [] }); }} className="text-xs px-3 py-1.5 rounded-btn border border-border-subtle text-text-muted hover:text-gold flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> ערוך
                </button>
                <PdfExportButton
                  title={quote.title}
                  filename={`quote-${quote.quoteNumber || quote.id}`}
                  htmlContent={buildQuoteHtml(quote)}
                  label="ייצוא PDF"
                />
                <button onClick={() => deleteQuote(quote.id)} className="text-xs px-3 py-1.5 rounded-btn text-red-400 hover:text-red-600 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> מחק
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
