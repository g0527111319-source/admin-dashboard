"use client";

import { useState, useEffect } from "react";
import {
  Star, Send, Plus, X, CheckCircle2, Clock, Copy,
  BarChart3, MessageSquare, ExternalLink
} from "lucide-react";

type Survey = {
  id: string;
  projectId: string;
  clientId: string;
  overallScore: number | null;
  communicationScore: number | null;
  qualityScore: number | null;
  timelinessScore: number | null;
  freeTextComment: string | null;
  sentAt: string | null;
  completedAt: string | null;
  token: string;
  createdAt: string;
  client?: { id: string; name: string };
  project?: { id: string; name: string };
};

type Project = {
  id: string;
  name: string;
  clientId: string;
  client?: { id: string; name: string };
};

export default function CrmSurveys() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formProjectId, setFormProjectId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [surveysRes, projectsRes] = await Promise.all([
        fetch("/api/designer/crm/surveys"),
        fetch("/api/designer/crm/projects"),
      ]);
      if (surveysRes.ok) setSurveys(await surveysRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createSurvey() {
    if (!formProjectId) return;
    const project = projects.find(p => p.id === formProjectId);
    if (!project) return;

    try {
      const res = await fetch("/api/designer/crm/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: formProjectId, clientId: project.clientId }),
      });
      if (res.ok) {
        const created = await res.json();
        setSurveys(prev => [created, ...prev]);
        setShowForm(false);
        setFormProjectId("");
      }
    } catch (e) {
      console.error(e);
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/api/designer/crm/surveys/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function renderStars(score: number | null) {
    if (score === null) return <span className="text-gray-400 text-xs">—</span>;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <Star key={n} size={12} className={n <= score ? "text-yellow-500 fill-yellow-500" : "text-gray-200"} />
        ))}
      </div>
    );
  }

  // Stats
  const completed = surveys.filter(s => s.completedAt);
  const avgScore = completed.length > 0
    ? (completed.reduce((sum, s) => sum + (s.overallScore || 0), 0) / completed.length).toFixed(1)
    : "—";
  const pending = surveys.filter(s => !s.completedAt);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          סקרי שביעות רצון
        </h2>
        <button onClick={() => setShowForm(true)} className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-yellow-600 flex items-center gap-1">
          <Plus size={14} /> שלח סקר
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-4 text-center">
          <BarChart3 size={20} className="mx-auto text-yellow-500 mb-1" />
          <p className="text-2xl font-bold text-gray-800">{avgScore}</p>
          <p className="text-xs text-gray-500">ממוצע כללי</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <CheckCircle2 size={20} className="mx-auto text-green-500 mb-1" />
          <p className="text-2xl font-bold text-gray-800">{completed.length}</p>
          <p className="text-xs text-gray-500">הושלמו</p>
        </div>
        <div className="bg-white border rounded-xl p-4 text-center">
          <Clock size={20} className="mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold text-gray-800">{pending.length}</p>
          <p className="text-xs text-gray-500">ממתינים</p>
        </div>
      </div>

      {/* Send form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">שלח סקר שביעות רצון</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <select value={formProjectId} onChange={e => setFormProjectId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">— בחר פרויקט —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">ביטול</button>
            <button onClick={createSurvey} disabled={!formProjectId} className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-1">
              <Send size={14} /> שלח
            </button>
          </div>
        </div>
      )}

      {/* Survey list */}
      <div className="space-y-3">
        {surveys.map(s => (
          <div key={s.id} className={`bg-white border rounded-xl p-4 ${s.completedAt ? "border-r-4 border-r-green-400" : "border-r-4 border-r-yellow-400"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-800">{s.client?.name || "לקוח"}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.completedAt ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {s.completedAt ? "הושלם" : "ממתין"}
                  </span>
                </div>
                {s.project && <p className="text-xs text-gray-500 mb-2">פרויקט: {s.project.name}</p>}

                {s.completedAt ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 w-16">כללי:</span>
                      {renderStars(s.overallScore)}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 w-16">תקשורת:</span>
                      {renderStars(s.communicationScore)}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 w-16">איכות:</span>
                      {renderStars(s.qualityScore)}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 w-16">זמנים:</span>
                      {renderStars(s.timelinessScore)}
                    </div>
                    {s.freeTextComment && (
                      <div className="bg-gray-50 rounded-lg p-2 mt-2">
                        <p className="text-xs text-gray-600 flex items-start gap-1">
                          <MessageSquare size={12} className="mt-0.5 shrink-0" />
                          {s.freeTextComment}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    נשלח: {s.sentAt ? new Date(s.sentAt).toLocaleDateString("he-IL") : "—"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => copyLink(s.token)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="העתק לינק לסקר"
                >
                  {copiedId === s.token ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        ))}

        {surveys.length === 0 && !showForm && (
          <div className="text-center py-12 text-gray-400">
            <Star size={40} className="mx-auto mb-3 opacity-30" />
            <p>אין סקרים עדיין</p>
            <p className="text-sm mt-1">שלח סקר שביעות רצון ללקוח בסוף פרויקט</p>
          </div>
        )}
      </div>
    </div>
  );
}
