"use client";

import { useState, useEffect } from "react";
import {
  Clock, CheckCircle2, Send, Image, MessageSquare, FileText,
  Upload, Star, Palette, Eye, UserCheck, Calendar, Filter
} from "lucide-react";

type ActivityLog = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, string> | null;
  actorType: string;
  createdAt: string;
  project?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null;
};

type Project = { id: string; name: string };

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  phase_completed: { label: "שלב הושלם", icon: CheckCircle2, color: "text-green-600 bg-green-50" },
  approval_sent: { label: "נשלח לאישור", icon: Send, color: "text-blue-600 bg-blue-50" },
  client_approved: { label: "לקוח אישר", icon: UserCheck, color: "text-green-600 bg-green-50" },
  client_changes_requested: { label: "לקוח ביקש שינויים", icon: MessageSquare, color: "text-amber-600 bg-amber-50" },
  client_viewed: { label: "לקוח צפה", icon: Eye, color: "text-gray-500 bg-gray-50" },
  message_sent: { label: "הודעה נשלחה", icon: MessageSquare, color: "text-blue-500 bg-blue-50" },
  photo_uploaded: { label: "תמונה הועלתה", icon: Image, color: "text-purple-500 bg-purple-50" },
  client_uploaded: { label: "לקוח העלה תמונה", icon: Upload, color: "text-indigo-500 bg-indigo-50" },
  quote_sent: { label: "הצעת מחיר נשלחה", icon: FileText, color: "text-gold bg-amber-50" },
  project_created: { label: "פרויקט נוצר", icon: Calendar, color: "text-blue-600 bg-blue-50" },
  moodboard_shared: { label: "מודבורד שותף", icon: Palette, color: "text-pink-500 bg-pink-50" },
  survey_completed: { label: "סקר שביעות רצון", icon: Star, color: "text-yellow-500 bg-yellow-50" },
  recommendation_received: { label: "המלצה התקבלה", icon: Star, color: "text-gold bg-amber-50" },
};

const DEFAULT_ACTION = { label: "פעולה", icon: Clock, color: "text-gray-500 bg-gray-50" };

export default function CrmTimeline() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [limit, setLimit] = useState(50);

  useEffect(() => { fetchData(); }, [filterProject, filterAction, limit]);

  useEffect(() => {
    fetch("/api/designer/crm/projects").then(r => r.ok ? r.json() : []).then(d => {
      setProjects(Array.isArray(d) ? d : d.projects || []);
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterProject !== "all") params.set("projectId", filterProject);
    if (filterAction !== "all") params.set("action", filterAction);
    params.set("limit", String(limit));
    try {
      const res = await fetch(`/api/designer/crm/activity-log?${params}`);
      if (res.ok) setLogs(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  };

  // Group by date
  const groupedByDate: Record<string, ActivityLog[]> = {};
  logs.forEach(log => {
    const date = new Date(log.createdAt).toLocaleDateString("he-IL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(log);
  });

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h2 className="text-xl font-heading text-text-primary">ציר זמן</h2>
        <p className="text-sm text-text-muted mt-1">כל ההיסטוריה של הפרויקטים שלך במקום אחד</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Filter className="w-4 h-4 text-text-muted" />
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="border border-border-subtle rounded-lg px-3 py-2 text-sm">
          <option value="all">כל הפרויקטים</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="border border-border-subtle rounded-lg px-3 py-2 text-sm">
          <option value="all">כל הפעולות</option>
          {Object.entries(ACTION_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">טוען...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>אין פעילות עדיין</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dayLogs]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-text-muted mb-3 sticky top-0 bg-bg py-1">{date}</h3>
              <div className="relative pr-6">
                {/* Vertical line */}
                <div className="absolute right-2.5 top-0 bottom-0 w-0.5 bg-border-subtle" />

                <div className="space-y-3">
                  {dayLogs.map(log => {
                    const config = ACTION_CONFIG[log.action] || DEFAULT_ACTION;
                    const ActionIcon = config.icon;
                    const time = new Date(log.createdAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

                    return (
                      <div key={log.id} className="relative flex items-start gap-3">
                        {/* Dot */}
                        <div className={`absolute right-0 w-5 h-5 rounded-full flex items-center justify-center ${config.color} ring-2 ring-white`}>
                          <ActionIcon className="w-3 h-3" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-white rounded-lg border border-border-subtle p-3 mr-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-text-primary">{config.label}</p>
                            <span className="text-xs text-text-muted">{time}</span>
                          </div>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {log.project && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{log.project.name}</span>
                            )}
                            {log.client && (
                              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{log.client.name}</span>
                            )}
                            {log.actorType === "client" && (
                              <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">פעולת לקוח</span>
                            )}
                          </div>
                          {log.metadata && typeof log.metadata === "object" && Object.keys(log.metadata).length > 0 && (
                            <p className="text-xs text-text-muted mt-1">
                              {Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {logs.length >= limit && (
            <button onClick={() => setLimit(l => l + 50)} className="w-full text-center py-3 text-sm text-gold hover:text-gold/80">
              הצג עוד...
            </button>
          )}
        </div>
      )}
    </div>
  );
}
