"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2, Circle, Clock, FileText, Image as ImageIcon,
  MessageCircle, Send, Loader2, AlertCircle,
  Download, Calendar, MapPin, FolderOpen, Ruler, Maximize2,
  Bell, Mail, Building2, Save,
} from "lucide-react";

type Phase = {
  id: string;
  name: string;
  sortOrder: number;
  isCurrent: boolean;
  isCompleted: boolean;
  startedAt: string | null;
  completedAt: string | null;
};

type Document = {
  id: string;
  fileName: string;
  fileUrl: string | null;
  fileSize: number | null;
  title: string | null;
  description: string | null;
  category: string | null;
  createdAt: string;
};

type Photo = {
  id: string;
  imageUrl: string;
  caption: string | null;
  phaseName: string | null;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  projectType: string;
  status: string;
  address: string | null;
  startDate: string | null;
  endDate: string | null;
  phases: Phase[];
  documents: Document[];
  photos: Photo[];
};

type Message = {
  id: string;
  senderType: string;
  content: string;
  isRead: boolean;
  createdAt: string;
};

export default function ClientPortalDashboard() {
  const params = useParams();
  const token = params.token as string;

  const [clientName, setClientName] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "photos" | "messages" | "plans">("overview");
  const [viewingPlan, setViewingPlan] = useState<Document | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Notification preferences
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Intake form
  const [intakeData, setIntakeData] = useState({
    propertyAddress: "",
    city: "",
    renovationDetails: "",
    renovationPurpose: "",
    estimatedBudget: "",
  });
  const [intakeProjectId, setIntakeProjectId] = useState("");
  const [intakeSaving, setIntakeSaving] = useState(false);
  const [intakeSaved, setIntakeSaved] = useState(false);

  // Fetch project data
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/client-portal/${token}/project`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("הקישור אינו תקין");
          return;
        }
        setError("שגיאה בטעינת נתונים");
        return;
      }
      const data = await res.json();
      setClientName(data.client?.name || "");
      setProjects(data.projects || []);
      if (data.projects?.length > 0 && !selectedProject) {
        setSelectedProject(data.projects[0]);
      }
    } catch {
      setError("שגיאת חיבור");
    } finally {
      setLoading(false);
    }
  }, [token, selectedProject]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/client-portal/${token}/messages?projectId=${selectedProject.id}`);
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch {
      console.error("Failed to fetch messages");
    }
  }, [token, selectedProject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "messages" && selectedProject) {
      fetchMessages();
    }
  }, [activeTab, selectedProject, fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedProject) return;
    setSendingMessage(true);

    try {
      const res = await fetch(`/api/client-portal/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProject.id,
          content: newMessage.trim(),
        }),
      });
      if (res.ok) {
        setNewMessage("");
        fetchMessages();
      }
    } catch {
      console.error("Send message failed");
    } finally {
      setSendingMessage(false);
    }
  };

  // Fetch notification preferences
  const fetchNotificationSettings = useCallback(async () => {
    try {
      const res = await fetch(`/api/client-portal/${token}/settings`);
      if (res.ok) {
        const data = await res.json();
        const notif = data.notifications || {};
        setNotifyEmail(notif.email !== undefined ? notif.email : true);
        setNotifyWhatsApp(notif.whatsapp !== undefined ? notif.whatsapp : false);
      }
    } catch {
      console.error("Failed to fetch notification settings");
    }
  }, [token]);

  // Fetch intake data
  const fetchIntakeData = useCallback(async () => {
    try {
      const res = await fetch(`/api/client-portal/${token}/intake`);
      if (res.ok) {
        const data = await res.json();
        if (data.intake) {
          setIntakeData({
            propertyAddress: data.intake.propertyAddress || "",
            city: data.intake.city || "",
            renovationDetails: data.intake.renovationDetails || "",
            renovationPurpose: data.intake.renovationPurpose || "",
            estimatedBudget: data.intake.estimatedBudget ? String(data.intake.estimatedBudget) : "",
          });
        }
        if (data.projectId) {
          setIntakeProjectId(data.projectId);
        }
      }
    } catch {
      console.error("Failed to fetch intake data");
    }
  }, [token]);

  useEffect(() => {
    fetchNotificationSettings();
    fetchIntakeData();
  }, [fetchNotificationSettings, fetchIntakeData]);

  const handleSaveNotifications = async () => {
    setNotifSaving(true);
    setNotifSaved(false);
    try {
      const res = await fetch(`/api/client-portal/${token}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notifications: { email: notifyEmail, whatsapp: notifyWhatsApp },
        }),
      });
      if (res.ok) {
        setNotifSaved(true);
        setTimeout(() => setNotifSaved(false), 3000);
      }
    } catch {
      console.error("Save notifications failed");
    } finally {
      setNotifSaving(false);
    }
  };

  const handleSaveIntake = async () => {
    setIntakeSaving(true);
    setIntakeSaved(false);
    try {
      const res = await fetch(`/api/client-portal/${token}/intake`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...intakeData,
          projectId: intakeProjectId,
        }),
      });
      if (res.ok) {
        setIntakeSaved(true);
        setTimeout(() => setIntakeSaved(false), 3000);
      }
    } catch {
      console.error("Save intake failed");
    } finally {
      setIntakeSaving(false);
    }
  };

  const projectTypeLabel: Record<string, string> = {
    RENOVATION: "שיפוץ",
    CONSTRUCTION: "בנייה",
    HOME_STYLING: "עיצוב",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-heading text-text-primary mb-2">שגיאה</h1>
          <p className="text-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  const completedPhases = selectedProject?.phases.filter((p) => p.isCompleted).length || 0;
  const totalPhases = selectedProject?.phases.length || 0;
  const progressPercent = totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-heading text-text-primary mb-1">
          שלום {clientName} 👋
        </h1>
        <p className="text-text-muted text-sm">פורטל הפרויקט שלך</p>
      </div>

      {/* Project Selector (if multiple) */}
      {projects.length > 1 && (
        <div className="mb-6">
          <label className="text-text-secondary text-sm font-medium block mb-1">פרויקט</label>
          <select
            className="input-field"
            value={selectedProject?.id || ""}
            onChange={(e) => {
              const proj = projects.find((p) => p.id === e.target.value);
              if (proj) setSelectedProject(proj);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {!selectedProject ? (
        <div className="card-static text-center py-12">
          <FolderOpen className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-text-muted">אין פרויקטים פעילים כרגע</p>
        </div>
      ) : (
        <>
          {/* Project Info Card */}
          <div className="bg-white border border-border-subtle rounded-card p-6 shadow-sm mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-heading text-text-primary">{selectedProject.name}</h2>
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-text-muted">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gold/10 text-gold rounded-full text-xs">
                    {projectTypeLabel[selectedProject.projectType] || selectedProject.projectType}
                  </span>
                  {selectedProject.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {selectedProject.address}
                    </span>
                  )}
                  {selectedProject.startDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(selectedProject.startDate).toLocaleDateString("he-IL")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            {totalPhases > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-text-secondary text-sm">התקדמות הפרויקט</span>
                  <span className="text-gold font-bold text-sm">{progressPercent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-gradient-to-l from-gold to-amber-400 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-text-muted text-xs mt-1">
                  {completedPhases} מתוך {totalPhases} שלבים הושלמו
                </p>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
            {[
              { key: "overview" as const, label: "סקירה", icon: CheckCircle2 },
              { key: "plans" as const, label: `תכניות (${selectedProject.documents.filter(d => d.category).length})`, icon: Ruler },
              { key: "documents" as const, label: `מסמכים (${selectedProject.documents.filter(d => !d.category).length})`, icon: FileText },
              { key: "photos" as const, label: `תמונות (${selectedProject.photos.length})`, icon: ImageIcon },
              { key: "messages" as const, label: "הודעות", icon: MessageCircle },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "bg-gold text-white"
                    : "bg-bg-surface text-text-muted hover:bg-gold/10"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}

          {/* Overview — Phases */}
          {activeTab === "overview" && (
            <div className="space-y-3">
              {selectedProject.phases.length === 0 ? (
                <div className="card-static text-center py-8">
                  <p className="text-text-muted">טרם הוגדרו שלבים לפרויקט</p>
                </div>
              ) : (
                selectedProject.phases.map((phase, idx) => (
                  <div
                    key={phase.id}
                    className={`flex items-center gap-4 p-4 rounded-card border transition-colors ${
                      phase.isCurrent
                        ? "bg-gold/5 border-gold/30"
                        : phase.isCompleted
                        ? "bg-emerald-50/50 border-emerald-200/50"
                        : "bg-white border-border-subtle"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {phase.isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : phase.isCurrent ? (
                        <Clock className="w-6 h-6 text-gold" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${phase.isCurrent ? "text-gold" : phase.isCompleted ? "text-emerald-700" : "text-text-secondary"}`}>
                        {phase.name}
                      </p>
                      {phase.completedAt && (
                        <p className="text-text-muted text-xs">
                          הושלם {new Date(phase.completedAt).toLocaleDateString("he-IL")}
                        </p>
                      )}
                      {phase.isCurrent && (
                        <span className="inline-block text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full mt-1">
                          שלב נוכחי
                        </span>
                      )}
                    </div>
                    <span className="text-text-muted text-xs flex-shrink-0">{idx + 1}/{totalPhases}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Plans */}
          {activeTab === "plans" && (() => {
            const plans = selectedProject.documents.filter(d => d.category);
            const CATEGORY_LABELS: Record<string, string> = {
              electrical: "תכנית חשמל", plumbing: "תכנית אינסטלציה", furniture: "תכנית ריהוט",
              drywall: "גבס ותקרה", hvac: "תכנית מיזוג", sections: "חתכים",
              carpentry: "פרטי נגרות", measurements: "תכנית מדידות", general: "כללי",
            };
            const grouped: Record<string, Document[]> = {};
            for (const p of plans) {
              const cat = p.category || "general";
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(p);
            }
            const isPdf = (url: string) => url.toLowerCase().endsWith(".pdf");

            return (
              <div className="space-y-6">
                {plans.length === 0 ? (
                  <div className="bg-white border border-border-subtle rounded-card p-8 text-center">
                    <Ruler className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-text-muted">אין תכניות להצגה</p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([cat, catPlans]) => (
                    <div key={cat}>
                      <h3 className="text-sm font-semibold text-text-primary mb-3">
                        {CATEGORY_LABELS[cat] || cat}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="group bg-white border border-border-subtle rounded-xl overflow-hidden hover:border-gold/30 transition-all"
                          >
                            <button
                              onClick={() => setViewingPlan(plan)}
                              className="w-full aspect-[4/3] bg-gray-50 flex items-center justify-center overflow-hidden relative"
                            >
                              {plan.fileUrl && isPdf(plan.fileUrl) ? (
                                <div className="flex flex-col items-center gap-2 text-gray-400">
                                  <FileText className="w-12 h-12 opacity-40" />
                                  <span className="text-xs">PDF</span>
                                </div>
                              ) : plan.fileUrl ? (
                                <img src={plan.fileUrl} alt={plan.title || plan.fileName} className="w-full h-full object-cover" />
                              ) : null}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                              </div>
                            </button>
                            <div className="p-3">
                              <p className="text-sm font-medium text-text-primary truncate">{plan.title || plan.fileName}</p>
                              {plan.description && <p className="text-xs text-text-muted truncate mt-0.5">{plan.description}</p>}
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-text-faint">
                                  {new Date(plan.createdAt).toLocaleDateString("he-IL")}
                                </span>
                                {plan.fileUrl && (
                                  <a href={plan.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-gold hover:text-amber-600">
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                {/* Plan viewer modal */}
                {viewingPlan && viewingPlan.fileUrl && (
                  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewingPlan(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
                        <p className="font-medium text-text-primary">{viewingPlan.title || viewingPlan.fileName}</p>
                        <div className="flex items-center gap-2">
                          <a href={viewingPlan.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gold hover:text-amber-600">
                            <Download className="w-4 h-4" />
                          </a>
                          <button onClick={() => setViewingPlan(null)} className="p-2 text-text-muted hover:text-text-primary">✕</button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
                        {isPdf(viewingPlan.fileUrl) ? (
                          <iframe src={viewingPlan.fileUrl} className="w-full h-full min-h-[60vh] rounded-lg border" title={viewingPlan.title || viewingPlan.fileName} />
                        ) : (
                          <img src={viewingPlan.fileUrl} alt={viewingPlan.title || viewingPlan.fileName} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Documents */}
          {activeTab === "documents" && (() => {
            const regularDocs = selectedProject.documents.filter(d => !d.category);
            return (
            <div className="space-y-3">
              {regularDocs.length === 0 ? (
                <div className="card-static text-center py-8">
                  <FileText className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                  <p className="text-text-muted">אין מסמכים להצגה</p>
                </div>
              ) : (
                regularDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border border-border-subtle rounded-card p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-text-primary font-medium text-sm truncate">
                        {doc.title || doc.fileName}
                      </p>
                      {doc.description && (
                        <p className="text-text-muted text-xs truncate">{doc.description}</p>
                      )}
                      <p className="text-text-muted text-xs mt-0.5">
                        {new Date(doc.createdAt).toLocaleDateString("he-IL")}
                        {doc.fileSize && ` · ${(doc.fileSize / 1024).toFixed(0)} KB`}
                      </p>
                    </div>
                    {doc.fileUrl && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gold hover:bg-gold/10 rounded-btn transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
            );
          })()}

          {/* Photos */}
          {activeTab === "photos" && (
            <div>
              {selectedProject.photos.length === 0 ? (
                <div className="card-static text-center py-8">
                  <ImageIcon className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                  <p className="text-text-muted">אין תמונות להצגה</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedProject.photos.map((photo) => (
                    <div key={photo.id} className="group relative rounded-card overflow-hidden border border-border-subtle">
                      <img
                        src={photo.imageUrl}
                        alt={photo.caption || "תמונת התקדמות"}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {photo.caption && (
                          <p className="text-white text-xs">{photo.caption}</p>
                        )}
                        {photo.phaseName && (
                          <p className="text-white/70 text-xs">{photo.phaseName}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          {activeTab === "messages" && (
            <div className="bg-white border border-border-subtle rounded-card overflow-hidden">
              {/* Messages List */}
              <div className="h-96 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
                    <p className="text-text-muted text-sm">אין הודעות עדיין</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === "client" ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          msg.senderType === "client"
                            ? "bg-gold/10 text-text-primary rounded-br-sm"
                            : "bg-bg-surface text-text-primary rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-[10px] text-text-muted mt-1">
                          {new Date(msg.createdAt).toLocaleString("he-IL", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Send Message */}
              <form
                onSubmit={handleSendMessage}
                className="border-t border-border-subtle p-3 flex gap-2"
              >
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="כתבי הודעה..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                  className="btn-gold flex items-center gap-1 px-4"
                >
                  {sendingMessage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Project Details Intake Form */}
          <div className="bg-white border border-border-subtle rounded-card p-6 shadow-sm mt-8" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading text-text-primary flex items-center gap-2">
                <Building2 className="w-5 h-5 text-gold" />
                פרטי הפרויקט
              </h3>
              {intakeSaved && (
                <span className="text-emerald-600 text-sm">נשמר בהצלחה</span>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1">כתובת הנכס</label>
                  <input
                    type="text"
                    className="input-field"
                    value={intakeData.propertyAddress}
                    onChange={(e) => setIntakeData({ ...intakeData, propertyAddress: e.target.value })}
                    placeholder="רחוב ומספר"
                  />
                </div>
                <div>
                  <label className="text-text-secondary text-sm font-medium block mb-1">עיר</label>
                  <input
                    type="text"
                    className="input-field"
                    value={intakeData.city}
                    onChange={(e) => setIntakeData({ ...intakeData, city: e.target.value })}
                    placeholder="תל אביב"
                  />
                </div>
              </div>
              <div>
                <label className="text-text-secondary text-sm font-medium block mb-1">פרטי השיפוץ</label>
                <textarea
                  className="input-field h-24 resize-none"
                  value={intakeData.renovationDetails}
                  onChange={(e) => setIntakeData({ ...intakeData, renovationDetails: e.target.value })}
                  placeholder="תארו את העבודה הנדרשת..."
                />
              </div>
              <div>
                <label className="text-text-secondary text-sm font-medium block mb-1">מטרת השיפוץ</label>
                <select
                  className="input-field"
                  value={intakeData.renovationPurpose}
                  onChange={(e) => setIntakeData({ ...intakeData, renovationPurpose: e.target.value })}
                >
                  <option value="">בחרו מטרה...</option>
                  <option value="דירת מגורים">דירת מגורים</option>
                  <option value="משרד">משרד</option>
                  <option value="חנות/עסק">חנות/עסק</option>
                  <option value="דירת Airbnb">דירת Airbnb</option>
                  <option value="אחר">אחר</option>
                </select>
              </div>
              <div>
                <label className="text-text-secondary text-sm font-medium block mb-1">תקציב משוער</label>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">&#x20AA;</span>
                  <input
                    type="number"
                    className="input-field pr-8"
                    value={intakeData.estimatedBudget}
                    onChange={(e) => setIntakeData({ ...intakeData, estimatedBudget: e.target.value })}
                    placeholder="0"
                    dir="ltr"
                  />
                </div>
              </div>
              <button
                onClick={handleSaveIntake}
                disabled={intakeSaving}
                className="btn-gold w-full flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {intakeSaving ? "שומר..." : "שמור פרטי פרויקט"}
              </button>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="bg-white border border-border-subtle rounded-card p-6 shadow-sm mt-6" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading text-text-primary flex items-center gap-2">
                <Bell className="w-5 h-5 text-gold" />
                העדפות התראות
              </h3>
              {notifSaved && (
                <span className="text-emerald-600 text-sm">נשמר בהצלחה</span>
              )}
            </div>
            <div className="space-y-3">
              {/* Email toggle */}
              <div className="flex items-center justify-between p-4 bg-bg-surface rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Mail size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary text-sm">קבלת עדכונים באימייל</h4>
                    <p className="text-xs text-text-muted mt-0.5">עדכוני פרויקט ותזכורות למייל</p>
                  </div>
                </div>
                <div
                  onClick={() => setNotifyEmail(!notifyEmail)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${notifyEmail ? "bg-gold" : "bg-gray-300"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${notifyEmail ? "right-0.5" : "right-[22px]"}`} />
                </div>
              </div>

              {/* WhatsApp toggle */}
              <div className="flex items-center justify-between p-4 bg-bg-surface rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <MessageCircle size={18} className="text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary text-sm">קבלת עדכונים בוואצפ</h4>
                    <p className="text-xs text-text-muted mt-0.5">התראות מיידיות בוואטסאפ</p>
                  </div>
                </div>
                <div
                  onClick={() => setNotifyWhatsApp(!notifyWhatsApp)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${notifyWhatsApp ? "bg-emerald-500" : "bg-gray-300"}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow ${notifyWhatsApp ? "right-0.5" : "right-[22px]"}`} />
                </div>
              </div>

              <button
                onClick={handleSaveNotifications}
                disabled={notifSaving}
                className="btn-gold w-full flex items-center justify-center gap-2 mt-3"
              >
                <Save className="w-4 h-4" />
                {notifSaving ? "שומר..." : "שמור העדפות"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
