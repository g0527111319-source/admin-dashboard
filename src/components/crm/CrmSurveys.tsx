"use client";

import { useState, useEffect } from "react";
import {
  Star, Send, Plus, X, CheckCircle2, Clock, Copy,
  BarChart3, MessageSquare, Share2, ShieldCheck, UserX, Trash2,
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
  publishConsent: string | null; // "ANONYMOUS" | "FULL" | "DECLINED" | null
  publishedAt: string | null;
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

type CreatedSurvey = Survey & {
  emailWarning?: { message: string; sandbox?: boolean; to?: string } | null;
};

export default function CrmSurveys({ clientId, projectId }: { clientId?: string; projectId?: string; gender?: string } = {}) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formProjectId, setFormProjectId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "warn" | "info"; text: string; link?: string } | null>(null);

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
        const created: CreatedSurvey = await res.json();
        const { emailWarning, ...surveyRow } = created;
        setSurveys(prev => [surveyRow as Survey, ...prev]);
        setShowForm(false);
        setFormProjectId("");

        const link = `${window.location.origin}/survey/${created.token}`;
        if (emailWarning) {
          setNotice({ kind: "warn", text: emailWarning.message, link });
        } else {
          setNotice({ kind: "info", text: "הסקר נשלח ללקוח/ה במייל.", link });
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setNotice({ kind: "warn", text: data.error || "שגיאה ביצירת הסקר" });
      }
    } catch (e) {
      console.error(e);
      setNotice({ kind: "warn", text: "שגיאת רשת ביצירת הסקר" });
    }
  }

  async function togglePublish(surveyId: string, publish: boolean) {
    try {
      const res = await fetch(`/api/designer/crm/surveys/${surveyId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setNotice({ kind: "warn", text: data.error || "שגיאה בעדכון פרסום" });
        return;
      }
      const updated: Survey = await res.json();
      setSurveys(prev => prev.map(s => (s.id === surveyId ? { ...s, publishedAt: updated.publishedAt } : s)));
      setNotice({
        kind: "info",
        text: publish ? "הביקורת פורסמה בכרטיס הביקור שלך." : "הביקורת הוסרה מכרטיס הביקור.",
      });
    } catch (e) {
      console.error(e);
      setNotice({ kind: "warn", text: "שגיאת רשת בעדכון פרסום" });
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/survey/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function deleteSurvey(surveyId: string, isCompleted: boolean) {
    const msg = isCompleted
      ? "למחוק את הסקר שמולא? הביקורת תוסר גם מכרטיס הביקור. הפעולה לא ניתנת לביטול."
      : "למחוק את בקשת הסקר שנשלחה? הלינק שכבר נשלח יפסיק לעבוד.";
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/designer/crm/surveys/${surveyId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setNotice({ kind: "warn", text: data.error || "שגיאה במחיקת הסקר" });
        return;
      }
      setSurveys(prev => prev.filter(s => s.id !== surveyId));
      setNotice({ kind: "info", text: "הסקר נמחק." });
    } catch (e) {
      console.error(e);
      setNotice({ kind: "warn", text: "שגיאת רשת במחיקה" });
    }
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

  function consentBadge(s: Survey) {
    if (!s.publishConsent) return null;
    if (s.publishConsent === "FULL") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck size={12} /> אישור לפרסום עם שם ופלאפון
        </span>
      );
    }
    if (s.publishConsent === "ANONYMOUS") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          <ShieldCheck size={12} /> אישור לפרסום אנונימי
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
        <UserX size={12} /> ללא אישור לפרסום
      </span>
    );
  }

  // Stats
  const completed = surveys.filter(s => s.completedAt);
  const avgScore = completed.length > 0 && completed.some(s => s.overallScore)
    ? (completed.reduce((sum, s) => sum + (s.overallScore || 0), 0) / completed.filter(s => s.overallScore).length).toFixed(1)
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

      {/* Notice (post-send / publish) */}
      {notice && (
        <div className={`rounded-xl border p-4 text-sm ${notice.kind === "warn" ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-emerald-50 border-emerald-200 text-emerald-900"}`}>
          <div className="flex items-start justify-between gap-3">
            <p className="flex-1">{notice.text}</p>
            <button onClick={() => setNotice(null)} className="text-current opacity-60 hover:opacity-100"><X size={16} /></button>
          </div>
          {notice.link && (
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 text-xs bg-white/70 border rounded px-2 py-1 truncate">{notice.link}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(notice.link!); setNotice({ ...notice, text: "הקישור הועתק." }); }}
                className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-50"
              >
                העתק
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-4 text-center">
          <BarChart3 size={20} className="mx-auto text-yellow-500 mb-1" />
          <p className="text-2xl font-bold text-gray-800">{avgScore}</p>
          <p className="text-xs text-gray-500">דירוג פנימי</p>
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
        {surveys.map(s => {
          const canPublish = !!s.completedAt && !!s.freeTextComment?.trim() && (s.publishConsent === "ANONYMOUS" || s.publishConsent === "FULL");
          const isPublished = !!s.publishedAt;
          return (
            <div key={s.id} className={`bg-white border rounded-xl p-4 ${s.completedAt ? "border-r-4 border-r-green-400" : "border-r-4 border-r-yellow-400"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-medium text-gray-800">{s.client?.name || "לקוח"}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.completedAt ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {s.completedAt ? "הושלם" : "ממתין"}
                    </span>
                    {consentBadge(s)}
                    {isPublished && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#faf5e8] text-[#8b6508] border border-[#B8860B]/40">
                        <Share2 size={12} /> מוצג בכרטיס הביקור
                      </span>
                    )}
                  </div>
                  {s.project && <p className="text-xs text-gray-500 mb-2">פרויקט: {s.project.name}</p>}

                  {s.completedAt ? (
                    <div className="space-y-2">
                      {/* Internal-only star ratings (retained for backward-compat; hidden if null) */}
                      {(s.overallScore || s.communicationScore || s.qualityScore || s.timelinessScore) && (
                        <div className="space-y-1 p-2 bg-gray-50 rounded-lg">
                          <p className="text-[11px] text-gray-500 mb-1">דירוג פנימי (לעיניי בלבד)</p>
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
                        </div>
                      )}

                      {/* The review text — the only thing eligible for public sharing */}
                      {s.freeTextComment && (
                        <div className="bg-[#faf5e8] border border-[#B8860B]/20 rounded-lg p-3">
                          <p className="text-[11px] text-[#8b6508] mb-1 flex items-center gap-1">
                            <MessageSquare size={12} /> ביקורת הלקוח/ה
                          </p>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{s.freeTextComment}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      נשלח: {s.sentAt ? new Date(s.sentAt).toLocaleDateString("he-IL") : "—"}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyLink(s.token)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="העתק לינק לסקר"
                  >
                    {copiedId === s.token ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={() => deleteSurvey(s.id, !!s.completedAt)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="מחיקת הסקר"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Share action row */}
              {canPublish && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500">
                    {isPublished
                      ? "הביקורת מופיעה בכרטיס הביקור שלך."
                      : s.publishConsent === "FULL"
                        ? "הלקוח/ה אישר/ה פרסום עם שם מלא ופלאפון."
                        : "הלקוח/ה אישר/ה פרסום אנונימי."}
                  </p>
                  <button
                    onClick={() => togglePublish(s.id, !isPublished)}
                    className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 ${isPublished ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-[#1a1a1a] text-white hover:bg-black"}`}
                  >
                    <Share2 size={12} />
                    {isPublished ? "הסר מהכרטיס" : "שתף ביקורת"}
                  </button>
                </div>
              )}
            </div>
          );
        })}

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
