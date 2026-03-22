"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  LayoutGrid,
} from "lucide-react";

type ScheduleBlock = {
  id: string;
  projectId: string;
  title: string;
  startDate: string;
  endDate: string;
  status: "pending" | "in_progress" | "completed" | "delayed";
  color: string;
  supplierName: string | null;
  dependOn: string | null;
};

type Project = { id: string; name: string; client: { name: string } };

const statusLabel: Record<string, string> = {
  pending: "ממתין",
  in_progress: "בתהליך",
  completed: "הושלם",
  delayed: "באיחור",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-400",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
  delayed: "bg-red-500",
};

const statusBadge: Record<string, string> = {
  pending: "badge-gray",
  in_progress: "badge-gold",
  completed: "badge-green",
  delayed: "badge-red",
};

const emptyBlock: Omit<ScheduleBlock, "id" | "projectId"> = {
  title: "",
  startDate: "",
  endDate: "",
  status: "pending",
  color: "#d4a574",
  supplierName: "",
  dependOn: null,
};

function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function addDays(d: string, n: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

export default function CrmScheduler() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyBlock);
  const [saving, setSaving] = useState(false);
  const [timelineOffset, setTimelineOffset] = useState(0);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      }
    } catch {
      /* ignore */
    }
  }, [selectedProjectId]);

  const fetchBlocks = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/designer/crm/schedule?projectId=${selectedProjectId}`
      );
      if (res.ok) setBlocks(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);
  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  const timelineStart = (() => {
    if (blocks.length === 0) return new Date().toISOString().slice(0, 10);
    const dates = blocks.map((b) => b.startDate).sort();
    return dates[0];
  })();

  const timelineEnd = (() => {
    if (blocks.length === 0) return addDays(new Date().toISOString().slice(0, 10), 30);
    const dates = blocks.map((b) => b.endDate).sort();
    return dates[dates.length - 1];
  })();

  const totalDays = Math.max(daysBetween(timelineStart, timelineEnd) + 1, 14);
  const visibleDays = 28;
  const effectiveStart = addDays(timelineStart, timelineOffset);

  const delayedIds = new Set(blocks.filter((b) => b.status === "delayed").map((b) => b.id));

  const hasDelayedDependency = (block: ScheduleBlock) => {
    return block.dependOn ? delayedIds.has(block.dependOn) : false;
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.startDate || !form.endDate) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/designer/crm/schedule/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/designer/crm/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, projectId: selectedProjectId }),
        });
      }
      setForm(emptyBlock);
      setShowForm(false);
      setEditingId(null);
      fetchBlocks();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/designer/crm/schedule/${id}`, { method: "DELETE" });
      fetchBlocks();
    } catch {
      /* ignore */
    }
  };

  const startEdit = (block: ScheduleBlock) => {
    setForm({
      title: block.title,
      startDate: block.startDate,
      endDate: block.endDate,
      status: block.status,
      color: block.color,
      supplierName: block.supplierName || "",
      dependOn: block.dependOn,
    });
    setEditingId(block.id);
    setShowForm(true);
  };

  const dayLabels: string[] = [];
  for (let i = 0; i < visibleDays; i++) {
    const d = new Date(addDays(effectiveStart, i));
    dayLabels.push(
      `${d.getDate()}/${d.getMonth() + 1}`
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">לוח זמנים חכם</h2>
            <p className="text-white/50" style={{ fontSize: "10px" }}>
              ניהול ותזמון שלבי פרויקט
            </p>
          </div>
        </div>
        <button
          className="btn-gold flex items-center gap-2"
          onClick={() => {
            setForm(emptyBlock);
            setEditingId(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4" />
          הוסף בלוק
        </button>
      </div>

      {/* Project Selector */}
      <div className="card-static p-4">
        <label className="form-label">בחר פרויקט</label>
        <select
          className="select-field"
          value={selectedProjectId}
          onChange={(e) => {
            setSelectedProjectId(e.target.value);
            setTimelineOffset(0);
          }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} – {p.client.name}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      <div className="card-static p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">ציר זמן</h3>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost p-1"
              onClick={() => setTimelineOffset((o) => Math.max(o - 7, -(totalDays - visibleDays)))}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-white/60" style={{ fontSize: "10px" }}>
              {effectiveStart}
            </span>
            <button
              className="btn-ghost p-1"
              onClick={() => setTimelineOffset((o) => Math.min(o + 7, totalDays - visibleDays))}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <Loader2 className="empty-state-icon animate-spin" />
            <p>טוען...</p>
          </div>
        ) : blocks.length === 0 ? (
          <div className="empty-state">
            <Calendar className="empty-state-icon" />
            <p>אין בלוקים בלוח הזמנים</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Day headers */}
            <div
              className="grid gap-0 mb-2"
              style={{
                gridTemplateColumns: `120px repeat(${visibleDays}, 1fr)`,
              }}
            >
              <div className="text-white/40" style={{ fontSize: "10px" }}>
                שלב
              </div>
              {dayLabels.map((lbl, i) => (
                <div
                  key={i}
                  className="text-center text-white/40 border-l border-white/10"
                  style={{ fontSize: "10px" }}
                >
                  {lbl}
                </div>
              ))}
            </div>

            <div className="section-divider mb-2" />

            {/* Blocks */}
            {blocks.map((block) => {
              const blockStartOffset = daysBetween(effectiveStart, block.startDate);
              const blockDuration = daysBetween(block.startDate, block.endDate) + 1;
              const colStart = Math.max(blockStartOffset, 0) + 2; // +2 for 1-indexed + label column
              const colEnd = Math.min(blockStartOffset + blockDuration, visibleDays) + 2;
              const visible = colEnd > 2 && colStart <= visibleDays + 1;

              return (
                <div
                  key={block.id}
                  className="grid gap-0 mb-1 items-center"
                  style={{
                    gridTemplateColumns: `120px repeat(${visibleDays}, 1fr)`,
                    minHeight: "36px",
                  }}
                >
                  {/* Label */}
                  <div className="flex items-center gap-1 pl-2 truncate">
                    {hasDelayedDependency(block) && (
                      <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    )}
                    <span
                      className="text-white/80 truncate"
                      style={{ fontSize: "10px" }}
                    >
                      {block.title}
                    </span>
                  </div>

                  {/* Bar */}
                  {visible && (
                    <div
                      className={`rounded h-7 flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80 ${statusColors[block.status]}`}
                      style={{
                        gridColumn: `${colStart} / ${colEnd}`,
                        opacity: 0.85,
                      }}
                      onClick={() => startEdit(block)}
                      title={`${block.title} | ${statusLabel[block.status]}${block.supplierName ? ` | ${block.supplierName}` : ""}`}
                    >
                      <span className="text-white font-medium truncate px-1" style={{ fontSize: "10px" }}>
                        {block.supplierName || statusLabel[block.status]}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Block List */}
      {blocks.length > 0 && (
        <div className="card-static p-4 space-y-3">
          <h3 className="text-sm font-semibold text-white mb-2">רשימת בלוקים</h3>
          {blocks.map((block) => (
            <div
              key={block.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${statusColors[block.status]}`}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">
                      {block.title}
                    </span>
                    <span className={statusBadge[block.status]}>
                      {statusLabel[block.status]}
                    </span>
                    {hasDelayedDependency(block) && (
                      <span className="badge-red flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        תלוי בשלב מאחר
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-white/40 flex items-center gap-1" style={{ fontSize: "10px" }}>
                      <Calendar className="w-3 h-3" />
                      {block.startDate} → {block.endDate}
                    </span>
                    {block.supplierName && (
                      <span className="text-white/40" style={{ fontSize: "10px" }}>
                        ספק: {block.supplierName}
                      </span>
                    )}
                    {block.dependOn && (
                      <span className="text-white/40" style={{ fontSize: "10px" }}>
                        <Clock className="w-3 h-3 inline ml-1" />
                        תלוי ב: {blocks.find((b) => b.id === block.dependOn)?.title || block.dependOn}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-ghost p-1" onClick={() => startEdit(block)}>
                  <Edit3 className="w-4 h-4" />
                </button>
                <button className="btn-ghost p-1 text-red-400" onClick={() => handleDelete(block.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(statusLabel).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${statusColors[key]}`} />
            <span className="text-white/50" style={{ fontSize: "10px" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div
            className="modal-content animate-in w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">
                {editingId ? "עריכת בלוק" : "בלוק חדש"}
              </h3>
              <button className="btn-ghost p-1" onClick={() => { setShowForm(false); setEditingId(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label">שם השלב</label>
                <input
                  className="input-field"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="למשל: שלב חשמל"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">תאריך התחלה</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">תאריך סיום</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">סטטוס</label>
                  <select
                    className="select-field"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ScheduleBlock["status"] })}
                  >
                    <option value="pending">ממתין</option>
                    <option value="in_progress">בתהליך</option>
                    <option value="completed">הושלם</option>
                    <option value="delayed">באיחור</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">צבע</label>
                  <input
                    type="color"
                    className="input-field h-10"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">שם ספק</label>
                <input
                  className="input-field"
                  value={form.supplierName || ""}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
                  placeholder="אופציונלי"
                />
              </div>

              <div>
                <label className="form-label">תלוי בבלוק</label>
                <select
                  className="select-field"
                  value={form.dependOn || ""}
                  onChange={(e) => setForm({ ...form, dependOn: e.target.value || null })}
                >
                  <option value="">ללא תלות</option>
                  {blocks
                    .filter((b) => b.id !== editingId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button className="btn-gold flex items-center gap-2" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? "עדכן" : "שמור"}
              </button>
              <button className="btn-ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
