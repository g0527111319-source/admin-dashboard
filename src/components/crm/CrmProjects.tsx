"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, ChevronLeft, FolderOpen, CheckCircle2, Clock, PauseCircle,
  XCircle, MessageCircle, FileText, Image, Send, Trash2, Edit3,
} from "lucide-react";
import { g } from "@/lib/gender";

type Phase = {
  id: string;
  name: string;
  sortOrder: number;
  isCurrent: boolean;
  isCompleted: boolean;
  completedAt: string | null;
};

type Message = {
  id: string;
  senderType: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  projectType: string;
  status: string;
  estimatedBudget: number | null;
  address: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  client: { id: string; name: string; phone?: string };
  phases: Phase[];
  messages?: Message[];
  documents?: { id: string; fileName: string; title: string | null; createdAt: string }[];
  photos?: { id: string; imageUrl: string; caption: string | null; createdAt: string }[];
  _count: { messages: number; documents: number; photos: number };
};

type Client = { id: string; name: string };

const typeLabel: Record<string, string> = {
  RENOVATION: "שיפוץ",
  CONSTRUCTION: "בנייה חדשה",
  HOME_STYLING: "הום סטיילינג",
  CONSULTATION: "ייעוץ",
  COMMERCIAL: "מסחרי",
  OTHER: "אחר",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "פעיל",
  ON_HOLD: "בהמתנה",
  COMPLETED: "הושלם",
  CANCELLED: "בוטל",
};

const statusIcon: Record<string, typeof CheckCircle2> = {
  ACTIVE: Clock,
  ON_HOLD: PauseCircle,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
};

const statusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  ON_HOLD: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-red-50 text-red-700",
};

export default function CrmProjects({
  initialProjectId,
  onClearProjectId,
  clientId,
  gender,
}: {
  initialProjectId?: string | null;
  onClearProjectId?: () => void;
  clientId?: string;
  gender?: string;
}) {
  const gdr = gender || "female";
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDetailTab, setProjectDetailTab] = useState<"phases" | "messages">("phases");
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    clientId: "",
    name: "",
    projectType: "RENOVATION",
    estimatedBudget: "",
    address: "",
    notes: "",
  });

  const fetchProjects = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (clientId) params.set("clientId", clientId);
      const res = await fetch(`/api/designer/crm/projects?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : data.data || []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [search, statusFilter, clientId]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, [fetchProjects, fetchClients]);

  // Open project by ID if provided
  useEffect(() => {
    if (initialProjectId && projects.length > 0) {
      openProject(initialProjectId);
      onClearProjectId?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId, projects]);

  const openProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/designer/crm/projects/${projectId}`);
      if (res.ok) {
        setSelectedProject(await res.json());
        setProjectDetailTab("phases");
      }
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.clientId) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/designer/crm/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          estimatedBudget: formData.estimatedBudget ? Number(formData.estimatedBudget) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה");
        return;
      }
      setShowAddForm(false);
      setFormData({ clientId: "", name: "", projectType: "RENOVATION", estimatedBudget: "", address: "", notes: "" });
      fetchProjects();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  };

  const handlePhaseToggle = async (phase: Phase) => {
    if (!selectedProject) return;

    try {
      await fetch(`/api/designer/crm/projects/${selectedProject.id}/phases/${phase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCompleted: !phase.isCompleted,
          isCurrent: !phase.isCompleted ? false : undefined,
        }),
      });
      openProject(selectedProject.id);
    } catch {
      console.error("Phase toggle failed");
    }
  };

  const handleSetCurrentPhase = async (phase: Phase) => {
    if (!selectedProject) return;

    try {
      await fetch(`/api/designer/crm/projects/${selectedProject.id}/phases/${phase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCurrent: true }),
      });
      openProject(selectedProject.id);
    } catch {
      console.error("Set current phase failed");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedProject) return;

    setSendingMessage(true);
    try {
      await fetch(`/api/designer/crm/projects/${selectedProject.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });
      setNewMessage("");
      openProject(selectedProject.id);
    } catch {
      console.error("Send message failed");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedProject) return;

    try {
      await fetch(`/api/designer/crm/projects/${selectedProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      openProject(selectedProject.id);
      fetchProjects();
    } catch {
      console.error("Status update failed");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("למחוק את הפרויקט?")) return;

    try {
      await fetch(`/api/designer/crm/projects/${projectId}`, { method: "DELETE" });
      if (selectedProject?.id === projectId) setSelectedProject(null);
      fetchProjects();
    } catch {
      console.error("Delete failed");
    }
  };

  // Project Detail View
  if (selectedProject) {
    const completedPhases = selectedProject.phases.filter((p) => p.isCompleted).length;
    const totalPhases = selectedProject.phases.length;
    const progress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
    const StatusIcon = statusIcon[selectedProject.status] || Clock;

    return (
      <div className="space-y-6 animate-in">
        <button
          onClick={() => setSelectedProject(null)}
          className="flex items-center gap-1 text-gold text-sm hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          חזרה לרשימת פרויקטים
        </button>

        {/* Project Header */}
        <div className="card-static">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-heading text-text-primary">{selectedProject.name}</h2>
              <p className="text-text-muted text-sm mt-1">
                {selectedProject.client.name} • {typeLabel[selectedProject.projectType]}
              </p>
            </div>
            <span className={`badge text-xs px-3 py-1 rounded-full flex items-center gap-1 ${statusColor[selectedProject.status]}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusLabel[selectedProject.status]}
            </span>
          </div>

          {/* Status buttons */}
          <div className="flex gap-2 flex-wrap mb-4">
            {["ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"].map((s) => (
              <button
                key={s}
                onClick={() => handleUpdateStatus(s)}
                disabled={selectedProject.status === s}
                className={`text-xs px-3 py-1.5 rounded-btn border transition-colors ${
                  selectedProject.status === s
                    ? "bg-gold/10 border-gold text-gold font-medium"
                    : "border-border-subtle text-text-muted hover:border-gold/30"
                }`}
              >
                {statusLabel[s]}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>התקדמות</span>
              <span>{progress}% ({completedPhases}/{totalPhases})</span>
            </div>
            <div className="w-full bg-bg-surface rounded-full h-2.5">
              <div
                className="bg-gold rounded-full h-2.5 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {selectedProject.estimatedBudget && (
            <p className="text-sm text-text-muted mt-2">
              תקציב משוער: ₪{selectedProject.estimatedBudget.toLocaleString()}
            </p>
          )}

          {selectedProject.address && (
            <p className="text-sm text-text-muted mt-1">
              📍 {selectedProject.address}
            </p>
          )}

          {selectedProject.notes && (
            <p className="text-sm text-text-muted mt-1 bg-bg-surface rounded-btn p-2">
              {selectedProject.notes}
            </p>
          )}
        </div>

        {/* Detail Tabs */}
        <div className="flex gap-1 bg-white rounded-btn p-1 border border-border-subtle">
          <button
            onClick={() => setProjectDetailTab("phases")}
            className={`flex-1 text-sm py-2 rounded-btn transition-colors ${
              projectDetailTab === "phases" ? "bg-gold/10 text-gold font-medium" : "text-text-muted"
            }`}
          >
            שלבים ({totalPhases})
          </button>
          <button
            onClick={() => setProjectDetailTab("messages")}
            className={`flex-1 text-sm py-2 rounded-btn transition-colors ${
              projectDetailTab === "messages" ? "bg-gold/10 text-gold font-medium" : "text-text-muted"
            }`}
          >
            הודעות ({selectedProject.messages?.length || 0})
          </button>
        </div>

        {/* Phases */}
        {projectDetailTab === "phases" && (
          <div className="card-static">
            <div className="space-y-2">
              {selectedProject.phases.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-4">לא הוגדרו שלבים לפרויקט זה</p>
              ) : (
                selectedProject.phases.map((phase) => (
                  <div
                    key={phase.id}
                    className={`flex items-center justify-between p-3 rounded-btn border transition-colors ${
                      phase.isCurrent
                        ? "border-gold bg-gold/5"
                        : phase.isCompleted
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-border-subtle bg-bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handlePhaseToggle(phase)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          phase.isCompleted
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-border-subtle hover:border-gold"
                        }`}
                      >
                        {phase.isCompleted && <CheckCircle2 className="w-4 h-4" />}
                      </button>
                      <span
                        className={`text-sm ${
                          phase.isCompleted ? "line-through text-text-muted" : "text-text-primary"
                        }`}
                      >
                        {phase.name}
                      </span>
                      {phase.isCurrent && (
                        <span className="badge-gold text-[10px] px-2 py-0.5">נוכחי</span>
                      )}
                    </div>
                    {!phase.isCurrent && !phase.isCompleted && (
                      <button
                        onClick={() => handleSetCurrentPhase(phase)}
                        className="text-xs text-gold hover:underline"
                      >
                        הגדר כנוכחי
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        {projectDetailTab === "messages" && (
          <div className="card-static">
            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
              {(!selectedProject.messages || selectedProject.messages.length === 0) ? (
                <p className="text-text-muted text-sm text-center py-6">אין הודעות עדיין</p>
              ) : (
                selectedProject.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-btn max-w-[80%] ${
                      msg.senderType === "designer"
                        ? "bg-gold/10 mr-auto text-right"
                        : "bg-bg-surface ml-auto text-right"
                    }`}
                  >
                    <p className="text-sm text-text-primary">{msg.content}</p>
                    <p className="text-xs text-text-muted mt-1">
                      {msg.senderType === "designer" ? g(gdr, "אתה", "את") : "לקוח"} •{" "}
                      {new Date(msg.createdAt).toLocaleString("he-IL")}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1"
                placeholder={g(gdr, "כתוב הודעה...", "כתבי הודעה...")}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage || !newMessage.trim()}
                className="btn-gold px-4"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Add Form
  if (showAddForm) {
    return (
      <div className="space-y-6 animate-in max-w-lg mx-auto">
        <button
          onClick={() => setShowAddForm(false)}
          className="flex items-center gap-1 text-gold text-sm hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          חזרה
        </button>
        <h2 className="text-xl font-heading text-text-primary">פרויקט חדש</h2>
        <form onSubmit={handleSubmit} className="card-static space-y-4">
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">לקוח *</label>
            <select
              className="select-field"
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              required
            >
              <option value="">{g(gdr, "בחר לקוח...", "בחרי לקוח...")}</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">שם הפרויקט *</label>
            <input
              type="text"
              className="input-field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">סוג פרויקט</label>
              <select
                className="select-field"
                value={formData.projectType}
                onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
              >
                {Object.entries(typeLabel).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-text-secondary text-sm font-medium block mb-1">תקציב משוער (₪)</label>
              <input
                type="number"
                className="input-field"
                value={formData.estimatedBudget}
                onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
                dir="ltr"
              />
            </div>
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">כתובת</label>
            <input
              type="text"
              className="input-field"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">הערות</label>
            <textarea
              className="input-field h-20 resize-none"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="btn-gold w-full">
            {saving ? "יוצר..." : "יצירת פרויקט"}
          </button>
          <p className="text-text-muted text-xs text-center">
            שלבי הפרויקט ייווצרו אוטומטית לפי ההגדרות שלך
          </p>
        </form>
      </div>
    );
  }

  // Project List
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-text-primary">הפרויקטים שלי</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-gold text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          פרויקט חדש
        </button>
      </div>

      <div className="card-static">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="חיפוש פרויקט..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pr-12"
            />
          </div>
          <select
            className="select-field sm:w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">כל הסטטוסים</option>
            {Object.entries(statusLabel).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="card-static text-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-text-muted">טוען...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card-static text-center py-12">
          <FolderOpen className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-text-muted">
            {search || statusFilter !== "ALL" ? "לא נמצאו פרויקטים" : g(gdr, "עדיין אין פרויקטים. צור את הראשון!", "עדיין אין פרויקטים. צרי את הראשון!")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const completedPhases = project.phases.filter((p) => p.isCompleted).length;
            const totalPhases = project.phases.length;
            const progress = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;
            const currentPhase = project.phases.find((p) => p.isCurrent);
            const SIcon = statusIcon[project.status] || Clock;

            return (
              <div
                key={project.id}
                onClick={() => openProject(project.id)}
                className="card-static hover:border-gold/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-text-primary font-medium">{project.name}</h3>
                    <p className="text-text-muted text-xs mt-0.5">
                      {project.client.name} • {typeLabel[project.projectType]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${statusColor[project.status]}`}>
                      <SIcon className="w-3 h-3" />
                      {statusLabel[project.status]}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                      className="p-1.5 text-text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress */}
                {totalPhases > 0 && (
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 bg-bg-surface rounded-full h-1.5">
                      <div
                        className="bg-gold rounded-full h-1.5 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted font-mono">{progress}%</span>
                  </div>
                )}

                {currentPhase && (
                  <p className="text-xs text-gold">שלב נוכחי: {currentPhase.name}</p>
                )}

                {project.estimatedBudget && (
                  <p className="text-xs text-text-muted mt-1">
                    תקציב: ₪{project.estimatedBudget.toLocaleString()}
                  </p>
                )}

                <div className="flex gap-4 text-xs text-text-muted mt-2">
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {project._count.messages}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {project._count.documents}
                  </span>
                  <span className="flex items-center gap-1">
                    <Image className="w-3 h-3" /> {project._count.photos}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
