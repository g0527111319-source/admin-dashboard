"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Calendar, Clock, MapPin, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Link2, Download, CheckCircle2, Loader2, Users, FolderOpen, X, Eye, Bell, Circle, ListChecks, CalendarSearch } from "lucide-react";
import { getHebrewDateStr, getMonthHolidays, gregorianToHebrew } from "@/lib/hebrew-calendar";

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  location: string | null;
  isAllDay: boolean;
  color: string | null;
  projectId: string | null;
  clientId: string | null;
  createdAt: string;
  source?: "local" | "google";
};

type CrmTask = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: string;
  projectId: string | null;
  clientId: string | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null;
};

type Project = { id: string; name: string; client: { name: string } };
type Client = { id: string; name: string };
type ViewMode = "month" | "week" | "day";
type AddMode = "event" | "task";

const taskStatusColors: Record<string, string> = {
  TODO: "bg-orange-100 text-orange-800 border-orange-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 border-yellow-200",
  DONE: "bg-emerald-100 text-emerald-800 border-emerald-200",
};
const taskStatusLabel: Record<string, string> = { TODO: "לביצוע", IN_PROGRESS: "בתהליך", DONE: "הושלם" };

export default function CrmCalendar({ clientId, projectId, gender }: { clientId?: string; projectId?: string; gender?: string } = {}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>("event");
  const [saving, setSaving] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showJumpTo, setShowJumpTo] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    location: "",
    isAllDay: false,
    color: "#2563eb",
    projectId: "",
    clientId: "",
    reminderMin: "",
  });
  const [taskFormData, setTaskFormData] = useState({ title: "", description: "", dueDate: "", clientId: "", projectId: "" });

  const [holidays, setHolidays] = useState<{ date: string; name: string; isYomTov: boolean; emoji: string }[]>([]);

  useEffect(() => {
    const h = getMonthHolidays(currentDate.getFullYear(), currentDate.getMonth() + 1);
    setHolidays(h);
  }, [currentDate]);

  // Fetch local CRM events
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    let start: string, end: string;
    if (viewMode === "month") {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
    } else if (viewMode === "week") {
      const dayOfWeek = currentDate.getDay();
      const sunday = new Date(currentDate);
      sunday.setDate(currentDate.getDate() - dayOfWeek);
      const saturday = new Date(sunday);
      saturday.setDate(sunday.getDate() + 6);
      start = sunday.toISOString();
      end = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate(), 23, 59, 59).toISOString();
    } else {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).toISOString();
      end = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59).toISOString();
    }
    try {
      const params = new URLSearchParams({ start, end });
      if (clientId) params.set("clientId", clientId);
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/designer/crm/calendar?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.map((e: CalendarEvent) => ({ ...e, source: "local" as const })));
      }
    } catch { /* */ } finally { setLoading(false); }
  }, [currentDate, viewMode, clientId, projectId]);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (clientId) params.set("clientId", clientId);
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/designer/crm/tasks?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.filter((t: CrmTask) => t.dueDate && t.status !== "DONE" && t.status !== "CANCELLED"));
      }
    } catch { /* */ }
  }, [clientId, projectId]);

  // Fetch Google Calendar events
  const fetchGoogleEvents = useCallback(async () => {
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const res = await fetch(`/api/designer/crm/google-calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      if (res.ok) setGoogleEvents(await res.json());
    } catch { /* */ }
  }, [currentDate]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/projects");
      if (res.ok) setProjects(await res.json());
    } catch { /* */ }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/clients?limit=200");
      if (res.ok) {
        const data = await res.json();
        setClients(Array.isArray(data) ? data : data.clients || []);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => { fetchProjects(); fetchClients(); }, [fetchProjects, fetchClients]);

  // Google Calendar status
  const [gcalStatus, setGcalStatus] = useState<{ configured: boolean; connected: boolean; syncEnabled: boolean; lastSyncAt: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/designer/crm/google-calendar")
      .then(r => r.json())
      .then(data => { setGcalStatus(data); if (data.connected) fetchGoogleEvents(); })
      .catch(() => {});
    const params = new URLSearchParams(window.location.search);
    const gs = params.get("google");
    if (gs) {
      if (gs === "error") alert("שגיאה בחיבור ל-Google Calendar. נסה שוב.");
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (gcalStatus?.connected) fetchGoogleEvents(); }, [gcalStatus?.connected, fetchGoogleEvents]);

  const handleGoogleAuth = async () => {
    const res = await fetch("/api/designer/crm/google-calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "auth" }) });
    const data = await res.json();
    if (data.authUrl) window.location.href = data.authUrl;
  };
  const handleGoogleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/designer/crm/google-calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync" }) });
      const data = await res.json();
      if (data.synced !== undefined) { alert(`סונכרנו ${data.synced} אירועים ל-Google Calendar`); setGcalStatus(prev => prev ? { ...prev, connected: true, syncEnabled: true, lastSyncAt: new Date().toISOString() } : prev); fetchGoogleEvents(); }
    } catch { /* */ } finally { setSyncing(false); }
  };
  const handleGoogleDisconnect = async () => {
    await fetch("/api/designer/crm/google-calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "disconnect" }) });
    setGcalStatus(prev => prev ? { ...prev, connected: false, syncEnabled: false } : prev);
    setGoogleEvents([]);
  };

  // Create event
  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.startAt) return;
    setSaving(true);
    try {
      await fetch("/api/designer/crm/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          projectId: formData.projectId || null,
          clientId: formData.clientId || null,
          endAt: formData.endAt || formData.startAt,
          reminderMin: formData.reminderMin ? parseInt(formData.reminderMin) : null,
        }),
      });
      setShowAdd(false);
      resetForm();
      fetchEvents();
    } catch { /* */ } finally { setSaving(false); }
  };

  // Create task
  const handleCreateTask = async () => {
    if (!taskFormData.title.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/designer/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskFormData.title,
          description: taskFormData.description || null,
          dueDate: taskFormData.dueDate || null,
          clientId: taskFormData.clientId || null,
          projectId: taskFormData.projectId || null,
        }),
      });
      setShowAdd(false);
      setTaskFormData({ title: "", description: "", dueDate: "", clientId: "", projectId: "" });
      fetchTasks();
    } catch { /* */ } finally { setSaving(false); }
  };

  const resetForm = () => setFormData({ title: "", description: "", startAt: "", endAt: "", location: "", isAllDay: false, color: "#2563eb", projectId: "", clientId: "", reminderMin: "" });

  const deleteEvent = async (eventId: string) => {
    await fetch(`/api/designer/crm/calendar?eventId=${eventId}`, { method: "DELETE" });
    fetchEvents();
  };

  const generateIcs = (evt: CalendarEvent): string => {
    const fmt = (s: string) => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Zirat//CRM//HE","BEGIN:VEVENT",`UID:${evt.id}@zirat`,`DTSTAMP:${fmt(new Date().toISOString())}`,`DTSTART:${fmt(evt.startAt)}`,`DTEND:${fmt(evt.endAt)}`,`SUMMARY:${evt.title}`,
      ...(evt.description?[`DESCRIPTION:${evt.description}`]:[]),
      ...(evt.location?[`LOCATION:${evt.location}`]:[]),
      "END:VEVENT","END:VCALENDAR"].join("\r\n");
  };
  const downloadIcs = (evt: CalendarEvent) => {
    const blob = new Blob([generateIcs(evt)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${evt.title.replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // All events + tasks merged
  const allEvents = useMemo(() => [...events, ...googleEvents], [events, googleEvents]);

  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };
  const navigateMonths = (count: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + count);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());
  const jumpToDate = (dateStr: string) => {
    if (!dateStr) return;
    const d = new Date(dateStr + "T12:00:00");
    if (!isNaN(d.getTime())) { setCurrentDate(d); setShowJumpTo(false); }
  };
  const jumpToMonthYear = (month: number, year: number) => {
    setCurrentDate(new Date(year, month, 1));
    setShowJumpTo(false);
  };

  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const startDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = startDay - 1; i >= 0; i--) cells.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    for (let i = 1; i <= totalDays; i++) cells.push({ date: new Date(year, month, i), isCurrentMonth: true });
    const rem = 7 - (cells.length % 7);
    if (rem < 7) for (let i = 1; i <= rem; i++) cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    return cells;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const dow = currentDate.getDay();
    const sun = new Date(currentDate); sun.setDate(currentDate.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(sun); d.setDate(sun.getDate() + i); return d; });
  }, [currentDate]);

  const fmtDateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const getEventsForDate = (date: Date) => { const k = fmtDateKey(date); return allEvents.filter(e => fmtDateKey(new Date(e.startAt)) === k); };
  const getTasksForDate = (date: Date) => { const k = fmtDateKey(date); return tasks.filter(t => t.dueDate && fmtDateKey(new Date(t.dueDate)) === k); };
  const getHolidayForDate = (date: Date) => { const k = fmtDateKey(date); return holidays.filter(h => h.date === k); };

  const isToday = (d: Date) => { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); };
  const isSameDay = (a: Date, b: Date) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const openAddForDate = (date: Date, mode: AddMode = "event", hour?: number) => {
    const h = hour ?? 9;
    const ds = `${fmtDateKey(date)}T${String(h).padStart(2, "0")}:00`;
    const es = `${fmtDateKey(date)}T${String(h + 1).padStart(2, "0")}:00`;
    if (mode === "event") {
      setFormData({ title: "", description: "", startAt: ds, endAt: es, location: "", isAllDay: false, color: "#2563eb", projectId: "", clientId: "", reminderMin: "" });
    } else {
      setTaskFormData({ title: "", description: "", dueDate: fmtDateKey(date), clientId: "", projectId: "" });
    }
    setAddMode(mode);
    setShowAdd(true);
  };

  const viewTitle = useMemo(() => {
    if (viewMode === "month") return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (viewMode === "week") {
      const s = weekDays[0], e = weekDays[6];
      return s.getMonth() === e.getMonth() ? `${s.getDate()}-${e.getDate()} ${monthNames[s.getMonth()]} ${s.getFullYear()}` : `${s.getDate()} ${monthNames[s.getMonth()]} — ${e.getDate()} ${monthNames[e.getMonth()]}`;
    }
    return `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode, weekDays]);

  const hebrewRange = useMemo(() => {
    if (viewMode === "month") { const f = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); const l = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); return `${getHebrewDateStr(f)} — ${getHebrewDateStr(l)}`; }
    if (viewMode === "week") return `${getHebrewDateStr(weekDays[0])} — ${getHebrewDateStr(weekDays[6])}`;
    return getHebrewDateStr(currentDate);
  }, [currentDate, viewMode, weekDays]);

  const getProjectName = (pid: string | null) => projects.find(p => p.id === pid)?.name;
  const getClientName = (cid: string | null) => clients.find(c => c.id === cid)?.name;

  // Quick add button component
  const QuickAdd = ({ date, hour, className = "" }: { date: Date; hour?: number; className?: string }) => (
    <button
      onClick={e => { e.stopPropagation(); openAddForDate(date, "event", hour); }}
      className={`opacity-0 group-hover:opacity-100 transition-opacity text-gold/60 hover:text-gold hover:bg-gold/10 rounded-full w-5 h-5 flex items-center justify-center text-xs ${className}`}
      title="הוסף אירוע או משימה">
      <Plus className="w-3 h-3" />
    </button>
  );

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-heading text-text-primary flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gold" /> יומן
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {gcalStatus?.connected ? (
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 text-xs flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Google</span>
              <button onClick={handleGoogleSync} disabled={syncing} className="btn-outline text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all">
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}{syncing ? "מסנכרן..." : "סנכרן"}
              </button>
              <button onClick={handleGoogleDisconnect} className="text-xs text-red-500 hover:underline">נתק</button>
            </div>
          ) : (
            <button onClick={handleGoogleAuth} disabled={!gcalStatus?.configured} className="btn-outline text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-subtle hover:border-gold hover:text-gold transition-all">
              <Link2 className="w-3.5 h-3.5" /> {gcalStatus?.configured ? "חבר Google Calendar" : "Google Calendar לא מוגדר"}
            </button>
          )}
          <button onClick={() => { setAddMode("event"); setShowAdd(!showAdd); }} className="btn-gold text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> חדש</button>
        </div>
      </div>

      {/* View mode + Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-bg-surface rounded-lg p-1">
          {(["month", "week", "day"] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${viewMode === mode ? "bg-white shadow-sm text-gold font-medium" : "text-text-muted hover:text-text-primary"}`}>
              {mode === "month" ? "חודש" : mode === "week" ? "שבוע" : "יום"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {viewMode === "month" && (
            <button onClick={() => navigateMonths(-12)} className="p-1.5 hover:bg-bg-surface rounded-btn transition-colors text-text-muted hover:text-text-primary" title="שנה אחורה">
              <ChevronsRight className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-bg-surface rounded-btn transition-colors" title={viewMode === "month" ? "חודש אחורה" : viewMode === "week" ? "שבוע אחורה" : "יום אחורה"}>
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs border border-border-subtle rounded-lg hover:border-gold hover:text-gold transition-all">היום</button>
          <button onClick={() => navigate(1)} className="p-2 hover:bg-bg-surface rounded-btn transition-colors" title={viewMode === "month" ? "חודש קדימה" : viewMode === "week" ? "שבוע קדימה" : "יום קדימה"}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          {viewMode === "month" && (
            <button onClick={() => navigateMonths(12)} className="p-1.5 hover:bg-bg-surface rounded-btn transition-colors text-text-muted hover:text-text-primary" title="שנה קדימה">
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setShowJumpTo(!showJumpTo)}
            className={`p-2 rounded-btn transition-colors mr-1 ${showJumpTo ? "bg-gold/10 text-gold" : "hover:bg-bg-surface text-text-muted hover:text-text-primary"}`}
            title="קפיצה לתאריך">
            <CalendarSearch className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Jump to date panel */}
      {showJumpTo && (
        <div className="card-static border border-gold/20 p-3 space-y-3 animate-in">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-text-primary flex items-center gap-1.5">
              <CalendarSearch className="w-4 h-4 text-gold" /> קפיצה לתאריך
            </h4>
            <button onClick={() => setShowJumpTo(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            {/* Date picker */}
            <div>
              <label className="text-text-secondary text-xs block mb-1">תאריך מדויק</label>
              <input
                type="date"
                className="input-field text-sm py-1.5 px-2 w-40"
                dir="ltr"
                onChange={e => jumpToDate(e.target.value)}
              />
            </div>
            {/* Month + Year selectors */}
            <div>
              <label className="text-text-secondary text-xs block mb-1">חודש</label>
              <select
                className="select-field text-sm py-1.5 px-2"
                value={currentDate.getMonth()}
                onChange={e => jumpToMonthYear(parseInt(e.target.value), currentDate.getFullYear())}
              >
                {monthNames.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-text-secondary text-xs block mb-1">שנה</label>
              <select
                className="select-field text-sm py-1.5 px-2"
                value={currentDate.getFullYear()}
                onChange={e => jumpToMonthYear(currentDate.getMonth(), parseInt(e.target.value))}
              >
                {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Quick jump buttons */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "-6 חודשים", months: -6 },
              { label: "-3 חודשים", months: -3 },
              { label: "+3 חודשים", months: 3 },
              { label: "+6 חודשים", months: 6 },
              { label: "+שנה", months: 12 },
              { label: "+שנתיים", months: 24 },
            ].map(btn => (
              <button
                key={btn.months}
                onClick={() => { navigateMonths(btn.months); setShowJumpTo(false); }}
                className="px-2.5 py-1 text-xs rounded-lg border border-border-subtle hover:border-gold hover:text-gold transition-all"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-lg font-heading text-text-primary">{viewTitle}</h3>
        <p className="text-sm text-gold">{hebrewRange}</p>
      </div>

      {/* ======== ADD FORM ======== */}
      {showAdd && (
        <div className="card-static space-y-3 border border-gold/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-bg-surface rounded-lg p-1">
              <button onClick={() => setAddMode("event")} className={`px-3 py-1 text-xs rounded-md ${addMode === "event" ? "bg-white shadow-sm text-gold font-medium" : "text-text-muted"}`}>
                <Calendar className="w-3 h-3 inline ml-1" />אירוע
              </button>
              <button onClick={() => setAddMode("task")} className={`px-3 py-1 text-xs rounded-md ${addMode === "task" ? "bg-white shadow-sm text-gold font-medium" : "text-text-muted"}`}>
                <ListChecks className="w-3 h-3 inline ml-1" />משימה
              </button>
            </div>
            <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
          </div>

          {addMode === "event" ? (
            <>
              <input type="text" className="input-field" placeholder="כותרת האירוע" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              <textarea className="input-field min-h-[50px]" placeholder="תיאור (אופציונלי)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-text-secondary text-xs block mb-1">התחלה</label><input type="datetime-local" className="input-field" value={formData.startAt} onChange={e => setFormData({ ...formData, startAt: e.target.value })} dir="ltr" /></div>
                <div><label className="text-text-secondary text-xs block mb-1">סיום</label><input type="datetime-local" className="input-field" value={formData.endAt} onChange={e => setFormData({ ...formData, endAt: e.target.value })} dir="ltr" /></div>
              </div>
              <input type="text" className="input-field" placeholder="מיקום (אופציונלי)" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className="select-field" value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })}>
                  <option value="">ללא לקוח</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="select-field" value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })}>
                  <option value="">ללא פרויקט</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-text-secondary text-xs">צבע:</label>
                  <input type="color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0" />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                  <input type="checkbox" checked={formData.isAllDay} onChange={e => setFormData({ ...formData, isAllDay: e.target.checked })} className="rounded" />
                  כל היום
                </label>
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-text-muted" />
                  <select className="select-field text-xs py-1 px-2" value={formData.reminderMin} onChange={e => setFormData({ ...formData, reminderMin: e.target.value })}>
                    <option value="">ללא תזכורת</option>
                    <option value="5">5 דקות לפני</option>
                    <option value="10">10 דקות לפני</option>
                    <option value="15">15 דקות לפני</option>
                    <option value="30">30 דקות לפני</option>
                    <option value="60">שעה לפני</option>
                    <option value="120">שעתיים לפני</option>
                    <option value="1440">יום לפני</option>
                  </select>
                </div>
              </div>
              <button onClick={handleCreate} disabled={saving} className="btn-gold w-full text-sm">{saving ? "שומר..." : "הוסף אירוע"}</button>
            </>
          ) : (
            <>
              <input type="text" className="input-field" placeholder="כותרת המשימה" value={taskFormData.title} onChange={e => setTaskFormData({ ...taskFormData, title: e.target.value })} />
              <textarea className="input-field min-h-[50px]" placeholder="תיאור (אופציונלי)" value={taskFormData.description} onChange={e => setTaskFormData({ ...taskFormData, description: e.target.value })} />
              <div><label className="text-text-secondary text-xs block mb-1">תאריך יעד</label><input type="date" className="input-field" value={taskFormData.dueDate} onChange={e => setTaskFormData({ ...taskFormData, dueDate: e.target.value })} dir="ltr" /></div>
              <div className="grid grid-cols-2 gap-3">
                <select className="select-field" value={taskFormData.clientId} onChange={e => setTaskFormData({ ...taskFormData, clientId: e.target.value })}>
                  <option value="">ללא לקוח</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="select-field" value={taskFormData.projectId} onChange={e => setTaskFormData({ ...taskFormData, projectId: e.target.value })}>
                  <option value="">ללא פרויקט</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button onClick={handleCreateTask} disabled={saving} className="btn-gold w-full text-sm">{saving ? "שומר..." : "הוסף משימה"}</button>
            </>
          )}
        </div>
      )}

      {/* ======== MONTH VIEW ======== */}
      {viewMode === "month" && (
        <div className="border border-border-subtle rounded-card overflow-hidden">
          <div className="grid grid-cols-7 bg-bg-surface border-b border-border-subtle">
            {dayNames.map(day => (
              <div key={day} className={`text-center py-2 text-xs font-medium ${day === "שבת" ? "text-gold" : "text-text-muted"}`}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthGrid.map((cell, idx) => {
              const dayEvents = getEventsForDate(cell.date);
              const dayTasks = getTasksForDate(cell.date);
              const dayHolidays = getHolidayForDate(cell.date);
              const heb = gregorianToHebrew(cell.date.getFullYear(), cell.date.getMonth() + 1, cell.date.getDate());
              const isShabbat = cell.date.getDay() === 6;
              const selected = selectedDay && isSameDay(cell.date, selectedDay);
              const allItems = [...dayHolidays.map(() => "h"), ...dayEvents.map(() => "e"), ...dayTasks.map(() => "t")];

              return (
                <div key={idx} onClick={() => setSelectedDay(cell.date)}
                  className={`group min-h-[90px] border-b border-l border-border-subtle p-1 cursor-pointer transition-colors relative
                    ${!cell.isCurrentMonth ? "bg-gray-50/50" : "bg-white"} ${isToday(cell.date) ? "ring-2 ring-inset ring-gold/40" : ""}
                    ${selected ? "bg-gold/5" : "hover:bg-gray-50"} ${isShabbat ? "bg-amber-50/30" : ""}`}>
                  <div className="flex items-start justify-between mb-0.5">
                    <span className={`text-sm font-medium leading-none ${!cell.isCurrentMonth ? "text-text-muted/40" : isToday(cell.date) ? "bg-gold text-white w-6 h-6 rounded-full flex items-center justify-center text-xs" : "text-text-primary"}`}>
                      {cell.date.getDate()}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <QuickAdd date={cell.date} />
                      <span className={`text-[10px] leading-none ${!cell.isCurrentMonth ? "text-text-muted/30" : "text-gold/70"}`}>{heb.dayHeb}</span>
                    </div>
                  </div>
                  {dayHolidays.map((h, hi) => (
                    <div key={`h${hi}`} className={`text-[9px] leading-tight truncate px-1 py-0.5 rounded mb-0.5 ${h.isYomTov ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"}`}>
                      {h.emoji} {h.name}
                    </div>
                  ))}
                  {dayEvents.slice(0, 2).map(evt => (
                    <div key={evt.id} className="text-[10px] leading-tight truncate px-1 py-0.5 rounded mb-0.5 text-white"
                      style={{ backgroundColor: evt.source === "google" ? "#4285F4" : (evt.color || "#2563eb") }}>
                      {evt.isAllDay ? "" : new Date(evt.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) + " "}{evt.title}
                    </div>
                  ))}
                  {dayTasks.slice(0, 2).map(t => (
                    <div key={t.id} className="text-[10px] leading-tight truncate px-1 py-0.5 rounded mb-0.5 bg-orange-100 text-orange-800 flex items-center gap-0.5">
                      <Circle className="w-2 h-2 flex-shrink-0" />{t.title}
                    </div>
                  ))}
                  {allItems.length > 4 && <div className="text-[9px] text-text-muted text-center">+{allItems.length - 4}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======== WEEK VIEW ======== */}
      {viewMode === "week" && (
        <div className="border border-border-subtle rounded-card overflow-hidden">
          <div className="grid grid-cols-7 bg-bg-surface border-b border-border-subtle">
            {weekDays.map((day, i) => {
              const heb = gregorianToHebrew(day.getFullYear(), day.getMonth() + 1, day.getDate());
              return (
                <div key={i} className={`group text-center py-2 border-l border-border-subtle relative ${isToday(day) ? "bg-gold/10" : ""}`}>
                  <div className="text-xs text-text-muted">{dayNames[i]}</div>
                  <div className={`text-lg font-heading ${isToday(day) ? "text-gold" : "text-text-primary"}`}>{day.getDate()}</div>
                  <div className="text-[10px] text-gold/70">{heb.dayHeb} {heb.monthName}</div>
                  <div className="absolute top-1 left-1"><QuickAdd date={day} /></div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[300px]">
            {weekDays.map((day, i) => {
              const dayEvents = getEventsForDate(day);
              const dayTasks = getTasksForDate(day);
              const dayHolidays = getHolidayForDate(day);
              return (
                <div key={i} className={`group border-l border-border-subtle p-1.5 space-y-1 cursor-pointer hover:bg-gray-50 transition-colors ${day.getDay() === 6 ? "bg-amber-50/30" : ""}`}
                  onClick={() => { setSelectedDay(day); setViewMode("day"); setCurrentDate(day); }}>
                  {dayHolidays.map((h, hi) => (
                    <div key={hi} className={`text-[10px] leading-tight truncate px-1.5 py-1 rounded ${h.isYomTov ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"}`}>
                      {h.emoji} {h.name}
                    </div>
                  ))}
                  {dayEvents.map(evt => (
                    <div key={evt.id} className="text-[11px] leading-tight px-1.5 py-1 rounded text-white truncate"
                      style={{ backgroundColor: evt.source === "google" ? "#4285F4" : (evt.color || "#2563eb") }}>
                      {!evt.isAllDay && <span className="font-medium">{new Date(evt.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</span>}
                      {" "}{evt.title}
                    </div>
                  ))}
                  {dayTasks.map(t => (
                    <div key={t.id} className="text-[11px] leading-tight px-1.5 py-1 rounded bg-orange-100 text-orange-800 truncate flex items-center gap-1">
                      <Circle className="w-2.5 h-2.5 flex-shrink-0" />{t.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======== DAY VIEW ======== */}
      {viewMode === "day" && (() => {
        const dayEvents = getEventsForDate(currentDate);
        const dayTasks = getTasksForDate(currentDate);
        const dayHolidays = getHolidayForDate(currentDate);
        const heb = gregorianToHebrew(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
        const hours = Array.from({ length: 14 }, (_, i) => i + 7);

        return (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm text-gold">{heb.display}</p>
              <p className="text-xs text-text-muted">{dayNames[currentDate.getDay()]}</p>
            </div>
            {dayHolidays.length > 0 && (
              <div className="space-y-1">
                {dayHolidays.map((h, i) => (
                  <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-btn ${h.isYomTov ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-100"}`}>
                    {h.emoji && <span>{h.emoji}</span>}<span className="font-medium">{h.name}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Tasks for today */}
            {dayTasks.length > 0 && (
              <div className="card-static space-y-1.5">
                <h4 className="text-xs font-medium text-orange-700 flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" /> משימות להיום</h4>
                {dayTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-sm px-3 py-2 rounded-btn bg-orange-50 border border-orange-200">
                    <Circle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                    <span className="flex-1 text-text-primary">{t.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${taskStatusColors[t.status] || ""}`}>{taskStatusLabel[t.status] || t.status}</span>
                    {t.project && <span className="text-[10px] text-gold flex items-center gap-0.5"><FolderOpen className="w-2.5 h-2.5" />{t.project.name}</span>}
                  </div>
                ))}
              </div>
            )}
            {/* Timeline */}
            <div className="border border-border-subtle rounded-card overflow-hidden bg-white">
              {hours.map(hour => {
                const hourEvents = dayEvents.filter(e => new Date(e.startAt).getHours() === hour);
                return (
                  <div key={hour} className="group flex border-b border-border-subtle min-h-[48px]">
                    <div className="w-14 flex-shrink-0 text-xs text-text-muted py-2 text-center border-l border-border-subtle bg-bg-surface">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    <div className="flex-1 p-1 space-y-1 cursor-pointer hover:bg-gray-50 transition-colors relative"
                      onClick={() => openAddForDate(currentDate, "event", hour)}>
                      <div className="absolute top-1 left-1"><QuickAdd date={currentDate} hour={hour} /></div>
                      {hourEvents.map(evt => (
                        <div key={evt.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white"
                          style={{ backgroundColor: evt.source === "google" ? "#4285F4" : (evt.color || "#2563eb") }}
                          onClick={e => e.stopPropagation()}>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{evt.title}</span>
                            {evt.location && <span className="text-white/80 text-xs mr-2">• {evt.location}</span>}
                          </div>
                          <span className="text-xs text-white/80 flex-shrink-0">
                            {new Date(evt.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} - {new Date(evt.endAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {evt.source !== "google" && (
                            <button onClick={e2 => { e2.stopPropagation(); deleteEvent(evt.id); }} className="text-white/60 hover:text-white"><Trash2 className="w-3 h-3" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ======== SELECTED DAY DETAIL ======== */}
      {selectedDay && viewMode === "month" && (() => {
        const dayEvents = getEventsForDate(selectedDay);
        const dayTasks = getTasksForDate(selectedDay);
        const dayHolidays = getHolidayForDate(selectedDay);
        const heb = gregorianToHebrew(selectedDay.getFullYear(), selectedDay.getMonth() + 1, selectedDay.getDate());
        return (
          <div className="card-static space-y-3 border border-gold/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-heading text-text-primary">{selectedDay.getDate()} {monthNames[selectedDay.getMonth()]} — {dayNames[selectedDay.getDay()]}</h4>
                <p className="text-xs text-gold">{heb.display}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openAddForDate(selectedDay, "event")} className="btn-gold text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> אירוע</button>
                <button onClick={() => openAddForDate(selectedDay, "task")} className="text-xs px-2 py-1 rounded-lg border border-orange-300 text-orange-700 hover:bg-orange-50 flex items-center gap-1"><ListChecks className="w-3 h-3" /> משימה</button>
                <button onClick={() => { setCurrentDate(selectedDay); setViewMode("day"); }} className="text-xs text-gold hover:underline flex items-center gap-1"><Eye className="w-3 h-3" /> יום</button>
                <button onClick={() => setSelectedDay(null)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
            </div>
            {dayHolidays.map((h, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-btn ${h.isYomTov ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-100"}`}>
                {h.emoji && <span>{h.emoji}</span>}<span className="font-medium">{h.name}</span>
              </div>
            ))}
            {dayEvents.length === 0 && dayTasks.length === 0 && dayHolidays.length === 0 && <p className="text-sm text-text-muted text-center py-4">אין אירועים ומשימות ביום זה</p>}
            {dayEvents.map(evt => (
              <div key={evt.id} className="flex items-start gap-3 p-3 rounded-btn border border-border-subtle bg-white">
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: evt.source === "google" ? "#4285F4" : (evt.color || "#2563eb"), minHeight: 40 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-text-primary text-sm font-medium">{evt.title}</p>
                    {evt.source === "google" && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Google</span>}
                  </div>
                  {evt.description && <p className="text-xs text-text-muted mt-0.5">{evt.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{evt.isAllDay ? "כל היום" : `${new Date(evt.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })} - ${new Date(evt.endAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`}</span>
                    {evt.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{evt.location}</span>}
                    {evt.projectId && <span className="flex items-center gap-1 text-gold"><FolderOpen className="w-3 h-3" />{getProjectName(evt.projectId)}</span>}
                    {evt.clientId && <span className="flex items-center gap-1 text-emerald-600"><Users className="w-3 h-3" />{getClientName(evt.clientId)}</span>}
                  </div>
                </div>
                {evt.source !== "google" && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => downloadIcs(evt)} className="text-text-muted hover:text-gold transition-colors"><Download className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteEvent(evt.id)} className="text-text-muted hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
            {dayTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-btn border border-orange-200 bg-orange-50">
                <Circle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium">{t.title}</p>
                  {t.description && <p className="text-xs text-text-muted mt-0.5">{t.description}</p>}
                  <div className="flex gap-2 mt-1 text-xs text-text-muted">
                    {t.project && <span className="flex items-center gap-0.5 text-gold"><FolderOpen className="w-3 h-3" />{t.project.name}</span>}
                    {t.client && <span className="flex items-center gap-0.5 text-emerald-600"><Users className="w-3 h-3" />{t.client.name}</span>}
                  </div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${taskStatusColors[t.status] || ""}`}>{taskStatusLabel[t.status] || t.status}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Holidays summary */}
      {viewMode === "month" && holidays.length > 0 && (
        <details className="card-static">
          <summary className="text-sm font-medium text-gold flex items-center gap-1.5 cursor-pointer"><Calendar className="w-4 h-4" /> חגים ואירועים החודש ({holidays.length})</summary>
          <div className="mt-3 space-y-1.5">
            {holidays.map((h, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-btn ${h.isYomTov ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-100"}`}>
                {h.emoji && <span>{h.emoji}</span>}
                <span className="font-medium">{h.name}</span>
                <span className="text-text-muted mr-auto">{new Date(h.date + "T00:00:00").toLocaleDateString("he-IL", { day: "numeric", month: "long" })}</span>
                <span className="text-xs text-text-muted">{getHebrewDateStr(new Date(h.date + "T00:00:00"))}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {loading && <div className="text-center py-4 text-text-muted text-sm">טוען...</div>}
    </div>
  );
}
