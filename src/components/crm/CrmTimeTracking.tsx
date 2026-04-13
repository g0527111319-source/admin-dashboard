"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Clock, Play, Square, Trash2 } from "lucide-react";
import { g } from "@/lib/gender";

type TimeEntry = {
  id: string;
  projectId: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  durationMin: number | null;
  billable: boolean;
  hourlyRate: number | null;
  createdAt: string;
};

type Project = { id: string; name: string; client: { name: string } };

export default function CrmTimeTracking({ clientId, projectId, gender }: { clientId?: string; projectId?: string; gender?: string } = {}) {
  const gdr = gender || "female";
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStart, setTrackingStart] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    durationMin: "",
    billable: true,
    hourlyRate: "",
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

  const fetchEntries = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/designer/crm/projects/${selectedProjectId}/time-entries`);
      if (res.ok) setEntries(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  }, [selectedProjectId]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const startTracking = () => {
    setIsTracking(true);
    setTrackingStart(new Date());
  };

  const stopTracking = async () => {
    if (!trackingStart || !selectedProjectId) return;
    const endTime = new Date();
    const durationMin = Math.round((endTime.getTime() - trackingStart.getTime()) / 60000);
    setSaving(true);
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description || "מעקב שעות",
          startTime: trackingStart.toISOString(),
          endTime: endTime.toISOString(),
          durationMin,
          billable: formData.billable,
          hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : null,
        }),
      });
      setIsTracking(false);
      setTrackingStart(null);
      setFormData({ description: "", durationMin: "", billable: true, hourlyRate: "" });
      fetchEntries();
    } catch { /* */ } finally { setSaving(false); }
  };

  const addManualEntry = async () => {
    if (!selectedProjectId || !formData.durationMin) return;
    setSaving(true);
    const now = new Date();
    try {
      await fetch(`/api/designer/crm/projects/${selectedProjectId}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description,
          startTime: now.toISOString(),
          durationMin: Number(formData.durationMin),
          billable: formData.billable,
          hourlyRate: formData.hourlyRate ? Number(formData.hourlyRate) : null,
        }),
      });
      setShowAdd(false);
      setFormData({ description: "", durationMin: "", billable: true, hourlyRate: "" });
      fetchEntries();
    } catch { /* */ } finally { setSaving(false); }
  };

  const totalMinutes = entries.reduce((s, e) => s + (e.durationMin || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const billableMinutes = entries.filter(e => e.billable).reduce((s, e) => s + (e.durationMin || 0), 0);
  const totalRevenue = entries.filter(e => e.billable && e.hourlyRate).reduce((s, e) => s + ((e.durationMin || 0) / 60) * (e.hourlyRate || 0), 0);

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-text-primary flex items-center gap-2">
          <Clock className="w-5 h-5 text-gold" /> מעקב שעות
        </h2>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-gold text-sm flex items-center gap-1">
          <Plus className="w-4 h-4" /> הזנה ידנית
        </button>
      </div>

      <select className="select-field" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
        <option value="">{g(gdr, "בחר פרויקט...", "בחרי פרויקט...")}</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.client.name}</option>)}
      </select>

      {/* Timer */}
      {selectedProjectId && (
        <div className="card-static flex items-center gap-4">
          <input type="text" className="input-field flex-1" placeholder="מה עשית?" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          {isTracking ? (
            <button onClick={stopTracking} disabled={saving} className="bg-red-500 text-white px-4 py-2 rounded-btn flex items-center gap-2 hover:bg-red-600 transition-colors">
              <Square className="w-4 h-4" /> עצור
            </button>
          ) : (
            <button onClick={startTracking} className="bg-emerald-500 text-white px-4 py-2 rounded-btn flex items-center gap-2 hover:bg-emerald-600 transition-colors">
              <Play className="w-4 h-4" /> התחל
            </button>
          )}
        </div>
      )}

      {/* Manual entry form */}
      {showAdd && selectedProjectId && (
        <div className="card-static space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-text-secondary text-xs block mb-1">משך (דקות)</label>
              <input type="number" className="input-field" value={formData.durationMin} onChange={e => setFormData({ ...formData, durationMin: e.target.value })} dir="ltr" />
            </div>
            <div>
              <label className="text-text-secondary text-xs block mb-1">תעריף לשעה (₪)</label>
              <input type="number" className="input-field" value={formData.hourlyRate} onChange={e => setFormData({ ...formData, hourlyRate: e.target.value })} dir="ltr" />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={formData.billable} onChange={e => setFormData({ ...formData, billable: e.target.checked })} />
            <span className="text-sm text-text-secondary">לחיוב</span>
          </label>
          <button onClick={addManualEntry} disabled={saving} className="btn-gold w-full text-sm">{saving ? "שומר..." : "הוסף"}</button>
        </div>
      )}

      {/* Stats */}
      {selectedProjectId && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card-static text-center">
            <p className="text-2xl font-bold font-mono text-text-primary">{totalHours}</p>
            <p className="text-text-muted text-xs">שעות סה״כ</p>
          </div>
          <div className="card-static text-center">
            <p className="text-2xl font-bold font-mono text-gold">{(billableMinutes / 60).toFixed(1)}</p>
            <p className="text-text-muted text-xs">שעות לחיוב</p>
          </div>
          <div className="card-static text-center">
            <p className="text-2xl font-bold font-mono text-emerald-600">₪{Math.round(totalRevenue).toLocaleString()}</p>
            <p className="text-text-muted text-xs">הכנסה</p>
          </div>
        </div>
      )}

      {/* Entries list */}
      {!selectedProjectId ? (
        <div className="card-static text-center py-12 text-text-muted">{g(gdr, "בחר פרויקט", "בחרי פרויקט")}</div>
      ) : loading ? (
        <div className="text-center py-12 text-text-muted">טוען...</div>
      ) : entries.length === 0 ? (
        <div className="card-static text-center py-12 text-text-muted">אין רשומות שעות</div>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id} className="flex items-center gap-3 p-3 rounded-btn border border-border-subtle bg-white">
              <Clock className="w-4 h-4 text-gold flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">{entry.description || "ללא תיאור"}</p>
                <p className="text-xs text-text-muted">
                  {new Date(entry.startTime).toLocaleDateString("he-IL")} • {entry.durationMin} דקות
                  {entry.billable && entry.hourlyRate && ` • ₪${entry.hourlyRate}/שעה`}
                </p>
              </div>
              <div className="text-left">
                <p className="text-sm font-mono font-medium">{entry.durationMin ? `${(entry.durationMin / 60).toFixed(1)}h` : "-"}</p>
                {entry.billable && <span className="badge-gold text-[10px]">לחיוב</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
