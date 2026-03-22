"use client";

import { useState, useEffect } from "react";
import {
  Webhook, Plus, X, Trash2, Edit3, CheckCircle2, XCircle,
  Copy, Eye, EyeOff, Zap
} from "lucide-react";

type WebhookEndpoint = {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  isActive: boolean;
  lastTriggeredAt: string | null;
  failCount: number;
  createdAt: string;
};

const AVAILABLE_EVENTS = [
  { value: "client.created", label: "לקוח חדש נוצר" },
  { value: "project.created", label: "פרויקט חדש נוצר" },
  { value: "project.updated", label: "פרויקט עודכן" },
  { value: "project.completed", label: "פרויקט הושלם" },
  { value: "phase.completed", label: "שלב הושלם" },
  { value: "approval.responded", label: "לקוח הגיב לאישור" },
  { value: "message.received", label: "הודעה חדשה מלקוח" },
  { value: "quote.approved", label: "הצעת מחיר אושרה" },
  { value: "contract.signed", label: "חוזה נחתם" },
  { value: "survey.completed", label: "סקר שביעות רצון הושלם" },
];

export default function CrmWebhooks() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});

  // Form
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState("");

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function fetchWebhooks() {
    try {
      const res = await fetch("/api/designer/crm/webhooks");
      if (res.ok) setWebhooks(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormName(""); setFormUrl(""); setFormEvents([]); setFormSecret("");
    setEditingId(null); setShowForm(false);
  }

  function startEdit(wh: WebhookEndpoint) {
    setFormName(wh.name);
    setFormUrl(wh.url);
    setFormEvents(wh.events);
    setFormSecret(wh.secret || "");
    setEditingId(wh.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!formName.trim() || !formUrl.trim()) return;
    try {
      if (editingId) {
        const res = await fetch(`/api/designer/crm/webhooks/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), url: formUrl.trim(), events: formEvents, secret: formSecret.trim() || null }),
        });
        if (res.ok) {
          const updated = await res.json();
          setWebhooks(prev => prev.map(w => w.id === editingId ? updated : w));
        }
      } else {
        const res = await fetch("/api/designer/crm/webhooks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), url: formUrl.trim(), events: formEvents, secret: formSecret.trim() || null }),
        });
        if (res.ok) {
          const created = await res.json();
          setWebhooks(prev => [created, ...prev]);
        }
      }
      resetForm();
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleActive(wh: WebhookEndpoint) {
    try {
      const res = await fetch(`/api/designer/crm/webhooks/${wh.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !wh.isActive }),
      });
      if (res.ok) {
        const updated = await res.json();
        setWebhooks(prev => prev.map(w => w.id === wh.id ? updated : w));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm("למחוק webhook זה?")) return;
    try {
      const res = await fetch(`/api/designer/crm/webhooks/${id}`, { method: "DELETE" });
      if (res.ok) setWebhooks(prev => prev.filter(w => w.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  function toggleEvent(event: string) {
    setFormEvents(prev => prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]);
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          Webhooks (Zapier/Make)
        </h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700 flex items-center gap-1">
            <Plus size={14} /> הוסף webhook
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500">חבר את המערכת ל-Zapier, Make או כל שירות אחר — כל אירוע במערכת ישלח התראה אוטומטית.</p>

      {/* Form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 space-y-3 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">{editingId ? "עריכת webhook" : "webhook חדש"}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="שם (למשל: Zapier - לקוח חדש)" className="w-full border rounded-lg px-3 py-2 text-sm" />
          <input value={formUrl} onChange={e => setFormUrl(e.target.value)} placeholder="Webhook URL" className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" />
          <input value={formSecret} onChange={e => setFormSecret(e.target.value)} placeholder="Secret (אופציונלי)" className="w-full border rounded-lg px-3 py-2 text-sm" dir="ltr" />

          <div>
            <label className="text-sm text-gray-600 block mb-2">אירועים</label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_EVENTS.map(ev => (
                <button
                  key={ev.value}
                  onClick={() => toggleEvent(ev.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg border text-right transition-colors ${formEvents.includes(ev.value) ? "bg-purple-50 border-purple-400 text-purple-700" : "hover:bg-gray-50"}`}
                >
                  {ev.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">ביטול</button>
            <button onClick={handleSave} disabled={!formName.trim() || !formUrl.trim()} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
              {editingId ? "עדכן" : "צור"}
            </button>
          </div>
        </div>
      )}

      {/* Webhook list */}
      <div className="space-y-3">
        {webhooks.map(wh => (
          <div key={wh.id} className={`bg-white border rounded-xl p-4 transition-colors ${!wh.isActive ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-800">{wh.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${wh.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {wh.isActive ? "פעיל" : "כבוי"}
                  </span>
                  {wh.failCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                      {wh.failCount} כשלונות
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 font-mono truncate" dir="ltr">{wh.url}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {wh.events.map(ev => (
                    <span key={ev} className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded-full">{ev}</span>
                  ))}
                </div>
                {wh.lastTriggeredAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    אחרון: {new Date(wh.lastTriggeredAt).toLocaleDateString("he-IL")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <div onClick={() => toggleActive(wh)} className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${wh.isActive ? "bg-green-500" : "bg-gray-300"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform shadow ${wh.isActive ? "right-0.5" : "right-[18px]"}`} />
                </div>
                <button onClick={() => startEdit(wh)} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"><Edit3 size={14} /></button>
                <button onClick={() => deleteWebhook(wh.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}

        {webhooks.length === 0 && !showForm && (
          <div className="text-center py-12 text-gray-400">
            <Zap size={40} className="mx-auto mb-3 opacity-30" />
            <p>אין webhooks מוגדרים</p>
            <p className="text-sm mt-1">חבר את המערכת ל-Zapier, Make או כל שירות אחר</p>
          </div>
        )}
      </div>
    </div>
  );
}
