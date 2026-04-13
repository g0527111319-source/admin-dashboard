"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Calendar, Clock, MapPin, Trash2, ChevronLeft, ChevronRight, Link2, Download, CheckCircle2, Loader2, Users, FolderOpen, X, Eye } from "lucide-react";
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

type Project = { id: string; name: string; client: { name: string } };
type Client = { id: string; name: string };
type ViewMode = "month" | "week" | "day";

export default function CrmCalendar({ clientId, projectId, gender }: { clientId?: string; projectId?: string; gender?: string } = {}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
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
  });

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

  // Fetch Google Calendar events
  const fetchGoogleEvents = useCallback(async () => {
    try {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const res = await fetch(`/api/designer/crm/google-calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      if (res.ok) {
        const data = await res.json();
        setGoogleEvents(data);
      }
    } catch { /* Google events fetch is optional */ }
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
  useEffect(() => { fetchProjects(); fetchClients(); }, [fetchProjects, fetchClients]);

  // Fetch google events when connected
  const [gcalStatus, setGcalStatus] = useState<{ configured: boolean; connected: boolean; syncEnabled: boolean; lastSyncAt: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/designer/crm/google-calendar")
      .then(r => r.json())
      .then(data => {
        setGcalStatus(data);
        if (data.connected) fetchGoogleEvents();
      })
      .catch(() => {});
    // Show feedback from Google Calendar OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get("google");
    if (googleStatus === "connected") {
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.toString());
    } else if (googleStatus === "error") {
      alert("שגיאה בחיבור ל-Google Calendar. נסה שוב.");
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (gcalStatus?.connected) fetchGoogleEvents();
  }, [gcalStatus?.connected, fetchGoogleEvents]);

  const handleGoogleAuth = async () => {
    const res = await fetch("/api/designer/crm/google-calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auth" }),
    });
    const data = await res.json();
    if (data.authUrl) window.location.href = data.authUrl;
  };

  const handleGoogleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/designer/crm/google-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await res.json();
      if (data.synced !== undefined) {
        alert(`סונכרנו ${data.synced} אירועים ל-Google Calendar`);
        setGcalStatus(prev => prev ? { ...prev, connected: true, syncEnabled: true, lastSyncAt: new Date().toISOString() } : prev);
        fetchGoogleEvents();
      }
    } catch { /* */ }
    finally { setSyncing(false); }
  };

  const handleGoogleDisconnect = async () => {
    await fetch("/api/designer/crm/google-calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disconnect" }),
    });
    setGcalStatus(prev => prev ? { ...prev, connected: false, syncEnabled: false } : prev);
    setGoogleEvents([]);
  };

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
        }),
      });
      setShowAdd(false);
      setFormData({ title: "", description: "", startAt: "", endAt: "", location: "", isAllDay: false, color: "#2563eb", projectId: "", clientId: "" });
      fetchEvents();
    } catch { /* */ } finally { setSaving(false); }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      await fetch(`/api/designer/crm/calendar?eventId=${eventId}`, { method: "DELETE" });
      fetchEvents();
    } catch { /* */ }
  };

  const generateIcs = (evt: CalendarEvent): string => {
    const formatIcsDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    };
    const now = formatIcsDate(new Date().toISOString());
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Zirat//CRM Calendar//HE",
      "BEGIN:VEVENT", `UID:${evt.id}@zirat-crm`, `DTSTAMP:${now}`,
      `DTSTART:${formatIcsDate(evt.startAt)}`, `DTEND:${formatIcsDate(evt.endAt)}`,
      `SUMMARY:${evt.title}`,
      ...(evt.description ? [`DESCRIPTION:${evt.description}`] : []),
      ...(evt.location ? [`LOCATION:${evt.location}`] : []),
      "END:VEVENT", "END:VCALENDAR",
    ];
    return lines.join("\r\n");
  };

  const downloadIcs = (evt: CalendarEvent) => {
    const icsContent = generateIcs(evt);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${evt.title.replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // All events merged
  const allEvents = useMemo(() => [...events, ...googleEvents], [events, googleEvents]);

  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

  // Navigation
  const navigate = (dir: -1 | 1) => {
    const d = new Date(currentDate);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    else if (viewMode === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  // Build month grid
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay(); // 0=Sun
    const totalDays = lastDay.getDate();

    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      cells.push({ date: d, isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= totalDays; i++) {
      cells.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Next month padding
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }
    return cells;
  }, [currentDate]);

  // Build week grid
  const weekDays = useMemo(() => {
    const dayOfWeek = currentDate.getDay();
    const sunday = new Date(currentDate);
    sunday.setDate(currentDate.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return allEvents.filter(evt => {
      const evtDate = new Date(evt.startAt);
      const evtStr = `${evtDate.getFullYear()}-${String(evtDate.getMonth() + 1).padStart(2, "0")}-${String(evtDate.getDate()).padStart(2, "0")}`;
      return evtStr === dateStr;
    });
  };

  // Get holidays for a specific date
  const getHolidayForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return holidays.filter(h => h.date === dateStr);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  // Open add form with pre-filled date
  const openAddForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T09:00`;
    const endStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T10:00`;
    setFormData({ ...formData, startAt: dateStr, endAt: endStr, title: "", description: "", location: "", isAllDay: false, color: "#2563eb", projectId: "", clientId: "" });
    setShowAdd(true);
  };

  // View title
  const viewTitle = useMemo(() => {
    if (viewMode === "month") return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (viewMode === "week") {
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) return `${start.getDate()}-${end.getDate()} ${monthNames[start.getMonth()]} ${start.getFullYear()}`;
      return `${start.getDate()} ${monthNames[start.getMonth()]} — ${end.getDate()} ${monthNames[end.getMonth()]}`;
    }
    return `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode, weekDays]);

  const hebrewRange = useMemo(() => {
    if (viewMode === "month") {
      const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      return `${getHebrewDateStr(first)} — ${getHebrewDateStr(last)}`;
    }
    if (viewMode === "week") {
      return `${getHebrewDateStr(weekDays[0])} — ${getHebrewDateStr(weekDays[6])}`;
    }
    return getHebrewDateStr(currentDate);
  }, [currentDate, viewMode, weekDays]);

  // Get project/client name for display
  const getProjectName = (pid: string | null) => projects.find(p => p.id === pid)?.name;
  const getClientName = (cid: string | null) => clients.find(c => c.id === cid)?.name;

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
              <span className="text-emerald-600 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> מחובר ל-Google
              </span>
              <button onClick={handleGoogleSync} disabled={syncing} className="btn-outline text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-all">
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                {syncing ? "מסנכרן..." : "סנכרן עכשיו"}
              </button>
              <button onClick={handleGoogleDisconnect} className="text-xs text-red-500 hover:underline">נתק</button>
            </div>
          ) : (
            <button onClick={handleGoogleAuth} disabled={!gcalStatus?.configured} className="btn-outline text-xs flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-subtle hover:border-gold hover:text-gold transition-all">
              <Link2 className="w-3.5 h-3.5" /> {gcalStatus?.configured ? "התחבר ל-Google Calendar" : "Google Calendar לא מוגדר"}
            </button>
          )}
          <button onClick={() => { setShowAdd(!showAdd); }} className="btn-gold text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> אירוע חדש
          </button>
        </div>
      </div>

      {/* View mode tabs + Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-bg-surface rounded-lg p-1">
          {(["month", "week", "day"] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all ${viewMode === mode ? "bg-white shadow-sm text-gold font-medium" : "text-text-muted hover:text-text-primary"}`}>
              {mode === "month" ? "חודש" : mode === "week" ? "שבוע" : "יום"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-bg-surface rounded-btn transition-colors"><ChevronRight className="w-5 h-5" /></button>
          <button onClick={goToday} className="px-3 py-1.5 text-xs border border-border-subtle rounded-lg hover:border-gold hover:text-gold transition-all">היום</button>
          <button onClick={() => navigate(1)} className="p-2 hover:bg-bg-surface rounded-btn transition-colors"><ChevronLeft className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Title + Hebrew range */}
      <div className="text-center">
        <h3 className="text-lg font-heading text-text-primary">{viewTitle}</h3>
        <p className="text-sm text-gold">{hebrewRange}</p>
      </div>

      {/* Add event form */}
      {showAdd && (
        <div className="card-static space-y-3 border border-gold/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-text-primary">אירוע חדש</h4>
            <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
          </div>
          <input type="text" className="input-field" placeholder="כותרת האירוע" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          <textarea className="input-field min-h-[60px]" placeholder="תיאור (אופציונלי)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-text-secondary text-xs block mb-1">התחלה</label>
              <input type="datetime-local" className="input-field" value={formData.startAt} onChange={e => setFormData({ ...formData, startAt: e.target.value })} dir="ltr" />
            </div>
            <div>
              <label className="text-text-secondary text-xs block mb-1">סיום</label>
              <input type="datetime-local" className="input-field" value={formData.endAt} onChange={e => setFormData({ ...formData, endAt: e.target.value })} dir="ltr" />
            </div>
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-text-secondary text-xs">צבע:</label>
              <input type="color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-7 h-7 rounded cursor-pointer border-0" />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
              <input type="checkbox" checked={formData.isAllDay} onChange={e => setFormData({ ...formData, isAllDay: e.target.checked })} className="rounded" />
              כל היום
            </label>
          </div>
          <button onClick={handleCreate} disabled={saving} className="btn-gold w-full text-sm">{saving ? "שומר..." : "הוסף אירוע"}</button>
        </div>
      )}

      {/* ======== MONTH VIEW ======== */}
      {viewMode === "month" && (
        <div className="border border-border-subtle rounded-card overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 bg-bg-surface border-b border-border-subtle">
            {dayNames.map(day => (
              <div key={day} className={`text-center py-2 text-xs font-medium ${day === "שבת" ? "text-gold" : "text-text-muted"}`}>
                {day}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {monthGrid.map((cell, idx) => {
              const dayEvents = getEventsForDate(cell.date);
              const dayHolidays = getHolidayForDate(cell.date);
              const heb = gregorianToHebrew(cell.date.getFullYear(), cell.date.getMonth() + 1, cell.date.getDate());
              const isShabbat = cell.date.getDay() === 6;
              const selected = selectedDay && isSameDay(cell.date, selectedDay);

              return (
                <div key={idx}
                  onClick={() => setSelectedDay(cell.date)}
                  onDoubleClick={() => openAddForDate(cell.date)}
                  className={`min-h-[90px] border-b border-l border-border-subtle p-1 cursor-pointer transition-colors
                    ${!cell.isCurrentMonth ? "bg-gray-50/50" : "bg-white"}
                    ${isToday(cell.date) ? "ring-2 ring-inset ring-gold/40" : ""}
                    ${selected ? "bg-gold/5" : "hover:bg-gray-50"}
                    ${isShabbat ? "bg-amber-50/30" : ""}
                  `}>
                  {/* Date numbers */}
                  <div className="flex items-start justify-between mb-0.5">
                    <span className={`text-sm font-medium leading-none ${!cell.isCurrentMonth ? "text-text-muted/40" : isToday(cell.date) ? "bg-gold text-white w-6 h-6 rounded-full flex items-center justify-center text-xs" : "text-text-primary"}`}>
                      {cell.date.getDate()}
                    </span>
                    <span className={`text-[10px] leading-none ${!cell.isCurrentMonth ? "text-text-muted/30" : "text-gold/70"}`}>
                      {heb.dayHeb}
                    </span>
                  </div>
                  {/* Holidays */}
                  {dayHolidays.map((h, hi) => (
                    <div key={hi} className={`text-[9px] leading-tight truncate px-1 py-0.5 rounded mb-0.5 ${h.isYomTov ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"}`}>
                      {h.emoji} {h.name}
                    </div>
                  ))}
                  {/* Events */}
                  {dayEvents.slice(0, 3).map(evt => (
                    <div key={evt.id} className="text-[10px] leading-tight truncate px-1 py-0.5 rounded mb-0.5 text-white"
                      style={{ backgroundColor: evt.source === "google" ? "#4285F4" : (evt.color || "#2563eb") }}
                      title={evt.title}>
                      {evt.isAllDay ? "" : new Date(evt.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }) + " "}{evt.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[9px] text-text-muted text-center">+{dayEvents.length - 3} נוספים</div>
                  )}
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
                <div key={i} className={`text-center py-2 border-l border-border-subtle ${isToday(day) ? "bg-gold/10" : ""}`}>
                  <div className="text-xs text-text-muted">{dayNames[i]}</div>
                  <div className={`text-lg font-heading ${isToday(day) ? "text-gold" : "text-text-primary"}`}>{day.getDate()}</div>
                  <div className="text-[10px] text-gold/70">{heb.dayHeb} {heb.monthName}</div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-7 min-h-[300px]">
            {weekDays.map((day, i) => {
              const dayEvents = getEventsForDate(day);
              const dayHolidays = getHolidayForDate(day);
              return (
                <div key={i} className={`border-l border-border-subtle p-2 space-y-1 cursor-pointer hover:bg-gray-50 transition-colors ${day.getDay() === 6 ? "bg-amber-50/30" : ""}`}
                  onClick={() => { setSelectedDay(day); setViewMode("day"); setCurrentDate(day); }}>
                  {dayHolidays.map((h, hi) => (
                    <div key={hi} className={`text-[10px] leading-tight truncate px-1.5 py-1 rounded ${h.isYomTov ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-700"}`}>
                      {h.emoji} {h.name}
                    </div>
                  ))}
                  {dayEvents.map(evt => (
                    <div key={evt.id} className="text-[11px] leading-tight px-1.5 py-1 rounded text-white truncate"
                      style={{ backgroundColor: evt.source === "google" ? "#4285F4" : (evt.color || "#2563eb") }}>
                      <span className="font-medium">{!evt.isAllDay && new Date(evt.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</span>
                      {" "}{evt.title}
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
        const dayHolidays = getHolidayForDate(currentDate);
        const heb = gregorianToHebrew(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
        const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00-20:00

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
                    {h.emoji && <span>{h.emoji}</span>}
                    <span className="font-medium">{h.name}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Timeline */}
            <div className="border border-border-subtle rounded-card overflow-hidden bg-white">
              {hours.map(hour => {
                const hourEvents = dayEvents.filter(evt => {
                  const h = new Date(evt.startAt).getHours();
                  return h === hour;
                });
                return (
                  <div key={hour} className="flex border-b border-border-subtle min-h-[48px]"
                    onClick={() => {
                      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`;
                      const endStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}T${String(hour + 1).padStart(2, "0")}:00`;
                      setFormData({ ...formData, startAt: dateStr, endAt: endStr });
                      setShowAdd(true);
                    }}>
                    <div className="w-14 flex-shrink-0 text-xs text-text-muted py-2 text-center border-l border-border-subtle bg-bg-surface">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    <div className="flex-1 p-1 space-y-1 cursor-pointer hover:bg-gray-50 transition-colors">
                      {hourEvents.map(evt => (
                        <div key={evt.id} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm text-white"
                          style={{ backgroundColor: evt.source === "google" ? "#4285F4" : (evt.color || "#2563eb") }}>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{evt.title}</span>
                            {evt.location && <span className="text-white/80 text-xs mr-2">• {evt.location}</span>}
                          </div>
                          <span className="text-xs text-white/80 flex-shrink-0">
                            {new Date(evt.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                            {" - "}
                            {new Date(evt.endAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                          </span>
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

      {/* ======== SELECTED DAY DETAIL PANEL ======== */}
      {selectedDay && viewMode === "month" && (() => {
        const dayEvents = getEventsForDate(selectedDay);
        const dayHolidays = getHolidayForDate(selectedDay);
        const heb = gregorianToHebrew(selectedDay.getFullYear(), selectedDay.getMonth() + 1, selectedDay.getDate());

        return (
          <div className="card-static space-y-3 border border-gold/20">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-heading text-text-primary">
                  {selectedDay.getDate()} {monthNames[selectedDay.getMonth()]} — {dayNames[selectedDay.getDay()]}
                </h4>
                <p className="text-xs text-gold">{heb.display}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openAddForDate(selectedDay)} className="btn-gold text-xs flex items-center gap-1">
                  <Plus className="w-3 h-3" /> הוסף
                </button>
                <button onClick={() => { setCurrentDate(selectedDay); setViewMode("day"); }} className="text-xs text-gold hover:underline flex items-center gap-1">
                  <Eye className="w-3 h-3" /> תצוגת יום
                </button>
                <button onClick={() => setSelectedDay(null)} className="text-text-muted hover:text-text-primary">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {dayHolidays.map((h, i) => (
              <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-btn ${h.isYomTov ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-100"}`}>
                {h.emoji && <span>{h.emoji}</span>}
                <span className="font-medium">{h.name}</span>
              </div>
            ))}

            {dayEvents.length === 0 && dayHolidays.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">אין אירועים ביום זה</p>
            )}

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
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {evt.isAllDay ? "כל היום" : (
                        <>
                          {new Date(evt.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                          {" - "}
                          {new Date(evt.endAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        </>
                      )}
                    </span>
                    {evt.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{evt.location}</span>}
                    {evt.projectId && <span className="flex items-center gap-1 text-gold"><FolderOpen className="w-3 h-3" />{getProjectName(evt.projectId)}</span>}
                    {evt.clientId && <span className="flex items-center gap-1 text-emerald-600"><Users className="w-3 h-3" />{getClientName(evt.clientId)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {evt.source !== "google" && (
                    <>
                      <button onClick={() => downloadIcs(evt)} className="text-text-muted hover:text-gold transition-colors" title="ייצוא">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteEvent(evt.id)} className="text-text-muted hover:text-red-500 transition-colors" title="מחק">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Holidays summary for month */}
      {viewMode === "month" && holidays.length > 0 && (
        <details className="card-static">
          <summary className="text-sm font-medium text-gold flex items-center gap-1.5 cursor-pointer">
            <Calendar className="w-4 h-4" /> חגים ואירועים החודש ({holidays.length})
          </summary>
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

      {loading && <div className="text-center py-4 text-text-muted text-sm">טוען אירועים...</div>}
    </div>
  );
}
