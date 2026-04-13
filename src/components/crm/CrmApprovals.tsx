"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2, XCircle, Clock, Plus, X, Send, Image,
  MessageSquare, ChevronDown, ChevronUp, ExternalLink, Copy, Check
} from "lucide-react";
import FileUpload, { type UploadedFile } from "@/components/ui/FileUpload";

type ApprovalOption = {
  id: string;
  label: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isSelected: boolean;
};

type ApprovalRequest = {
  id: string;
  projectId: string;
  clientId: string;
  type: "SINGLE" | "SELECTION";
  title: string;
  description: string | null;
  status: "PENDING_CLIENT" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
  clientComment: string | null;
  token: string;
  respondedAt: string | null;
  reminderSentAt: string | null;
  createdAt: string;
  options: ApprovalOption[];
  project?: { name: string };
  client?: { name: string };
};

type Project = { id: string; name: string; clientId: string; client: { id: string; name: string } };

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING_CLIENT: { label: "ממתין ללקוח", color: "text-amber-600 bg-amber-50", icon: Clock },
  APPROVED: { label: "אושר", color: "text-green-600 bg-green-50", icon: CheckCircle2 },
  CHANGES_REQUESTED: { label: "ביקש שינויים", color: "text-blue-600 bg-blue-50", icon: MessageSquare },
  REJECTED: { label: "נדחה", color: "text-red-600 bg-red-50", icon: XCircle },
};

export default function CrmApprovals({ clientId, projectId }: { clientId?: string; projectId?: string; gender?: string } = {}) {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    projectId: "",
    type: "SINGLE" as "SINGLE" | "SELECTION",
    title: "",
    description: "",
    options: [{ label: "", description: "", imageUrl: "" }],
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [appRes, projRes] = await Promise.all([
        fetch("/api/designer/crm/approvals"),
        fetch("/api/designer/crm/projects"),
      ]);
      if (appRes.ok) setApprovals(await appRes.json());
      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(Array.isArray(data) ? data : data.projects || []);
      }
    } catch { /* */ } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.projectId || !form.title) return;
    const project = projects.find(p => p.id === form.projectId);
    if (!project) return;

    const body: Record<string, unknown> = {
      projectId: form.projectId,
      clientId: project.clientId || project.client?.id,
      type: form.type,
      title: form.title,
      description: form.description || undefined,
    };
    if (form.type === "SELECTION") {
      body.options = form.options.filter(o => o.label.trim()).map((o, i) => ({
        label: o.label,
        description: o.description || undefined,
        imageUrl: o.imageUrl || undefined,
        sortOrder: i,
      }));
    }
    const res = await fetch("/api/designer/crm/approvals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      setShowForm(false);
      setForm({ projectId: "", type: "SINGLE", title: "", description: "", options: [{ label: "", description: "", imageUrl: "" }] });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק בקשת אישור זו?")) return;
    await fetch(`/api/designer/crm/approvals/${id}`, { method: "DELETE" });
    fetchData();
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/client-portal/approve/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const filtered = approvals.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterProject !== "all" && a.projectId !== filterProject) return false;
    return true;
  });

  if (loading) return <div className="text-center py-12 text-text-muted">טוען...</div>;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading text-text-primary">אישורים דיגיטליים</h2>
          <p className="text-sm text-text-muted mt-1">שלחי הדמיות, בחירות חומרים ואישורים ללקוחות</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-gold flex items-center gap-2">
          <Plus className="w-4 h-4" /> בקשת אישור חדשה
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "ממתין", count: approvals.filter(a => a.status === "PENDING_CLIENT").length, color: "text-amber-600 bg-amber-50" },
          { label: "אושר", count: approvals.filter(a => a.status === "APPROVED").length, color: "text-green-600 bg-green-50" },
          { label: "שינויים", count: approvals.filter(a => a.status === "CHANGES_REQUESTED").length, color: "text-blue-600 bg-blue-50" },
          { label: "סה״כ", count: approvals.length, color: "text-gray-600 bg-gray-50" },
        ].map(s => (
          <div key={s.label} className="card-static text-center">
            <p className="text-2xl font-bold font-mono">{s.count}</p>
            <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${s.color}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-border-subtle rounded-lg px-3 py-2 text-sm">
          <option value="all">כל הסטטוסים</option>
          <option value="PENDING_CLIENT">ממתין ללקוח</option>
          <option value="APPROVED">אושר</option>
          <option value="CHANGES_REQUESTED">ביקש שינויים</option>
          <option value="REJECTED">נדחה</option>
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="border border-border-subtle rounded-lg px-3 py-2 text-sm">
          <option value="all">כל הפרויקטים</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* New Approval Form */}
      {showForm && (
        <div className="card-static space-y-4 border-2 border-gold/30">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-semibold">בקשת אישור חדשה</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-text-muted" /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">פרויקט *</label>
              <select value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} className="w-full border border-border-subtle rounded-lg px-3 py-2">
                <option value="">בחרי פרויקט</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.client?.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">סוג</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as "SINGLE" | "SELECTION" })} className="w-full border border-border-subtle rounded-lg px-3 py-2">
                <option value="SINGLE">אישור פריט בודד</option>
                <option value="SELECTION">בחירה מרובה (A/B/C)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">כותרת *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="לדוגמה: אישור הדמיית סלון" className="w-full border border-border-subtle rounded-lg px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">תיאור</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="הסבר קצר ללקוח..." className="w-full border border-border-subtle rounded-lg px-3 py-2" />
          </div>

          {form.type === "SELECTION" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium">אפשרויות לבחירה</label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-start bg-bg rounded-lg p-3">
                  <span className="text-gold font-bold mt-2">{String.fromCharCode(65 + i)}</span>
                  <div className="flex-1 space-y-2">
                    <input value={opt.label} onChange={e => { const opts = [...form.options]; opts[i] = { ...opts[i], label: e.target.value }; setForm({ ...form, options: opts }); }} placeholder="שם האפשרות" className="w-full border border-border-subtle rounded-lg px-3 py-2 text-sm" />
                    <FileUpload
                      compact
                      dark
                      category="image"
                      folder="approvals"
                      currentUrl={opt.imageUrl}
                      label="העלאת תמונה"
                      onUpload={(file: UploadedFile) => { const opts = [...form.options]; opts[i] = { ...opts[i], imageUrl: file.url }; setForm({ ...form, options: opts }); }}
                      onError={(err: string) => alert(err)}
                    />
                  </div>
                  {form.options.length > 1 && (
                    <button onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })} className="text-red-400 hover:text-red-600 mt-2"><X className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
              {form.options.length < 5 && (
                <button onClick={() => setForm({ ...form, options: [...form.options, { label: "", description: "", imageUrl: "" }] })} className="text-gold text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> הוסיפי אפשרות
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary">ביטול</button>
            <button onClick={handleSubmit} disabled={!form.projectId || !form.title} className="btn-gold flex items-center gap-2">
              <Send className="w-4 h-4" /> שלחי לאישור
            </button>
          </div>
        </div>
      )}

      {/* Approvals List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>אין בקשות אישור {filterStatus !== "all" ? "בסטטוס זה" : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(approval => {
            const statusInfo = STATUS_MAP[approval.status];
            const StatusIcon = statusInfo.icon;
            const isExpanded = expandedId === approval.id;

            return (
              <div key={approval.id} className="card-static">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : approval.id)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusInfo.color}`}>
                      <StatusIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-text-primary">{approval.title}</p>
                      <p className="text-xs text-text-muted">
                        {approval.project?.name} • {approval.client?.name} •{" "}
                        {approval.type === "SELECTION" ? `${approval.options.length} אפשרויות` : "אישור בודד"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border-subtle space-y-4">
                    {approval.description && (
                      <p className="text-sm text-text-muted">{approval.description}</p>
                    )}

                    {/* Options */}
                    {approval.options.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {approval.options.map(opt => (
                          <div key={opt.id} className={`border rounded-lg p-3 ${opt.isSelected ? "border-gold bg-amber-50" : "border-border-subtle"}`}>
                            {opt.imageUrl && (
                              <div className="w-full h-32 bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                <Image className="w-8 h-8 text-gray-300" />
                              </div>
                            )}
                            <p className="font-medium text-sm">{opt.label}</p>
                            {opt.description && <p className="text-xs text-text-muted mt-1">{opt.description}</p>}
                            {opt.isSelected && <p className="text-xs text-gold font-semibold mt-1">⭐ נבחר</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Client comment */}
                    {approval.clientComment && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-800">הערת הלקוח:</p>
                        <p className="text-sm text-blue-700 mt-1">{approval.clientComment}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap items-center">
                      <button onClick={() => copyLink(approval.token)} className="text-sm flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border-subtle hover:bg-bg">
                        {copiedToken === approval.token ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                        {copiedToken === approval.token ? "הועתק!" : "העתיקי לינק"}
                      </button>
                      <button onClick={() => handleDelete(approval.id)} className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5">
                        מחיקה
                      </button>
                      <span className="text-xs text-text-muted mr-auto">
                        {new Date(approval.createdAt).toLocaleDateString("he-IL")}
                        {approval.respondedAt && ` • נענה ${new Date(approval.respondedAt).toLocaleDateString("he-IL")}`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
