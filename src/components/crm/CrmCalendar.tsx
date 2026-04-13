"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Calendar, Clock, MapPin, Trash2, ChevronLeft, ChevronRight, Link2, Download, CheckCircle2, Loader2 } from "lucide-react";
import { getHebrewDateStr, getMonthHolidays } from "@/lib/hebrew-calendar";

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
};

type Project = { id: string; name: string; client: { name: string } };

export default function CrmCalendar({ clientId, projectId, gender }: { clientId?: string; projectId?: string; gender?: string } = {}) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    location: "",
    isAllDay: false,
    color: "#2563eb",
    projectId: "",
  });

  const [holidays, setHolidays] = useState<{ date: string; name: string; isYomTov: boolean; emoji: string }[]>([]);

  useEffect(() => {
    const h = getMonthHolidays(currentMonth.getFullYear(), currentMonth.getMonth() + 1);
    setHolidays(h);
  }, [currentMonth]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString();
    try {
      const params = new URLSearchParams({ start, end });
      if (clientId) params.set("clientId", clientId);
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/designer/crm/calendar?${params}`);
      if (res.ok) setEvents(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  }, [currentMonth, clientId, projectId]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/projects");
      if (res.ok) setProjects(await res.json());
    } catch { /* */ }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchProjects(); }, [fetchProjects]);

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
          endAt: formData.endAt || formData.startAt,
        }),
      });
      setShowAdd(false);
      setFormData({ title: "", description: "", startAt: "", endAt: "", location: "", isAllDay: false, color: "#2563eb", projectId: "" });
      fetchEvents();
    } catch { /* */ } finally { setSaving(false); }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      await fetch(`/api/designer/crm/calendar?eventId=${eventId}`, { method: "DELETE" });
      fetchEvents();
    } catch { /* */ }
  };

  // Generate ICS file content for a single event
  const generateIcs = (evt: CalendarEvent): string => {
    const formatIcsDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    };
    const now = formatIcsDate(new Date().toISOString());
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Zirat//CRM Calendar//HE",
      "BEGIN:VEVENT",
      `UID:${evt.id}@zirat-crm`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatIcsDate(evt.startAt)}`,
      `DTEND:${formatIcsDate(evt.endAt)}`,
      `SUMMARY:${evt.title}`,
      ...(evt.description ? [`DESCRIPTION:${evt.description}`] : []),
      ...(evt.location ? [`LOCATION:${evt.location}`] : []),
      "END:VEVENT",
      "END:VCALENDAR",
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

  const [gcalStatus, setGcalStatus] = useState<{ configured: boolean; connected: boolean; syncEnabled: boolean; lastSyncAt: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/designer/crm/google-calendar")
      .then(r => r.json())
      .then(setGcalStatus)
      .catch(() => {});
    // Show feedback from Google Calendar OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const googleStatus = params.get("google");
    if (googleStatus === "connected") {
      // Clean URL param silently
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.toString());
    } else if (googleStatus === "error") {
      alert("שגיאה בחיבור ל-Google Calendar. נסה שוב.");
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

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
  };

  const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  // Group events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  events.forEach(evt => {
    const date = new Date(evt.startAt).toLocaleDateString("he-IL");
    if (!eventsByDate[date]) eventsByDate[date] = [];
    eventsByDate[date].push(evt);
  });

  return (
    <div className="space-y-6 animate-in">
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
          <button onClick={() => setShowAdd(!showAdd)} className="btn-gold text-sm flex items-center gap-1">
            <Plus className="w-4 h-4" /> אירוע חדש
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <button onClick={prevMonth} className="p-2 hover:bg-bg-surface rounded-btn"><ChevronRight className="w-5 h-5" /></button>
        <h3 className="text-lg font-heading text-text-primary">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
        <button onClick={nextMonth} className="p-2 hover:bg-bg-surface rounded-btn"><ChevronLeft className="w-5 h-5" /></button>
      </div>
      <p className="text-sm text-text-muted text-center">
        {getHebrewDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1))} — {getHebrewDateStr(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0))}
      </p>

      {/* Add form */}
      {showAdd && (
        <div className="card-static space-y-3">
          <input type="text" className="input-field" placeholder="כותרת האירוע" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-text-secondary text-xs block mb-1">תאריך ושעה התחלה</label>
              <input type="datetime-local" className="input-field" value={formData.startAt} onChange={e => setFormData({ ...formData, startAt: e.target.value })} dir="ltr" />
            </div>
            <div>
              <label className="text-text-secondary text-xs block mb-1">תאריך ושעה סיום</label>
              <input type="datetime-local" className="input-field" value={formData.endAt} onChange={e => setFormData({ ...formData, endAt: e.target.value })} dir="ltr" />
            </div>
          </div>
          <input type="text" className="input-field" placeholder="מיקום (אופציונלי)" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
          <select className="select-field" value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: e.target.value })}>
            <option value="">ללא פרויקט</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-text-secondary text-sm">צבע:</label>
            <input type="color" value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
          </div>
          <button onClick={handleCreate} disabled={saving} className="btn-gold w-full text-sm">{saving ? "שומר..." : "הוסף אירוע"}</button>
        </div>
      )}

      {/* Jewish holidays */}
      {holidays.length > 0 && (
        <div className="card-static space-y-2">
          <h4 className="text-sm font-medium text-gold flex items-center gap-1.5">
            <Calendar className="w-4 h-4" /> חגים ואירועים
          </h4>
          {holidays.map((h, i) => (
            <div key={i} className={`flex items-center gap-2 text-sm px-3 py-2 rounded-btn ${h.isYomTov ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-100"}`}>
              {h.emoji && <span>{h.emoji}</span>}
              <span className="font-medium">{h.name}</span>
              <span className="text-text-muted mr-auto">{new Date(h.date + "T00:00:00").toLocaleDateString("he-IL", { day: "numeric", month: "long" })}</span>
              <span className="text-xs text-text-muted">{getHebrewDateStr(new Date(h.date + "T00:00:00"))}</span>
            </div>
          ))}
        </div>
      )}

      {/* Events list */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">טוען...</div>
      ) : events.length === 0 ? (
        <div className="card-static text-center py-12 text-text-muted">אין אירועים החודש</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(eventsByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, dayEvents]) => (
            <div key={date}>
              <h4 className="text-sm font-medium text-text-muted mb-2">
                {date}
                <span className="text-xs text-gold mr-2">
                  {getHebrewDateStr(new Date(dayEvents[0].startAt))}
                </span>
              </h4>
              <div className="space-y-2">
                {dayEvents.map(evt => (
                  <div key={evt.id} className="flex items-start gap-3 p-3 rounded-btn border border-border-subtle bg-white">
                    <div className="w-1 h-full self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: evt.color || "#2563eb", minHeight: 40 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary text-sm font-medium">{evt.title}</p>
                      {evt.description && <p className="text-xs text-text-muted mt-0.5">{evt.description}</p>}
                      <div className="flex gap-3 mt-1 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(evt.startAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                          {" - "}
                          {new Date(evt.endAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {evt.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{evt.location}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => downloadIcs(evt)} className="text-text-muted hover:text-gold transition-colors" title="ייצוא ל-Google Calendar">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteEvent(evt.id)} className="text-text-muted hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
