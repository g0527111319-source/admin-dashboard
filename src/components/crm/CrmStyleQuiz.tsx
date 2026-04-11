"use client";

import { useState, useEffect } from "react";
import {
  Plus, X, Trash2, Edit3, Image, Type, Star, MessageSquare,
  GripVertical, Eye, Send, CheckCircle2, ChevronDown, ChevronUp
} from "lucide-react";

type QuizOption = {
  label: string;
  imageUrl?: string;
};

type QuizTemplate = {
  id: string;
  question: string;
  questionType: "image_choice" | "text_choice" | "rating" | "free_text";
  options: QuizOption[];
  sortOrder: number;
  isActive: boolean;
};

type QuizResponse = {
  id: string;
  questionId: string;
  clientId: string;
  answer: unknown;
  createdAt: string;
  question?: QuizTemplate;
};

type ClientWithResponses = {
  id: string;
  name: string;
  responses: QuizResponse[];
};

export default function CrmStyleQuiz({ designerId, clientId }: { designerId: string; clientId?: string }) {
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"templates" | "responses">("templates");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientResponses, setClientResponses] = useState<QuizResponse[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  // Form fields
  const [question, setQuestion] = useState("");
  const [questionType, setQuestionType] = useState<QuizTemplate["questionType"]>("image_choice");
  const [options, setOptions] = useState<QuizOption[]>([{ label: "" }, { label: "" }]);

  useEffect(() => {
    fetchTemplates();
    fetchClients();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/designer/crm/style-quiz/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClients() {
    try {
      const res = await fetch("/api/designer/crm/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchClientResponses(clientId: string) {
    try {
      const res = await fetch(`/api/designer/crm/style-quiz/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setClientResponses(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function resetForm() {
    setQuestion("");
    setQuestionType("image_choice");
    setOptions([{ label: "" }, { label: "" }]);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(t: QuizTemplate) {
    setQuestion(t.question);
    setQuestionType(t.questionType);
    setOptions(t.options.length > 0 ? t.options : [{ label: "" }, { label: "" }]);
    setEditingId(t.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!question.trim()) return;

    const filteredOptions = options.filter(o => o.label.trim());
    const body = {
      question: question.trim(),
      questionType,
      options: filteredOptions,
      sortOrder: editingId ? undefined : templates.length,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/designer/crm/style-quiz/templates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const updated = await res.json();
          setTemplates(prev => prev.map(t => t.id === editingId ? updated : t));
        }
      } else {
        const res = await fetch("/api/designer/crm/style-quiz/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          setTemplates(prev => [...prev, created]);
        }
      }
      resetForm();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("למחוק שאלה זו?")) return;
    try {
      const res = await fetch(`/api/designer/crm/style-quiz/templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates(prev => prev.filter(t => t.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function toggleActive(t: QuizTemplate) {
    try {
      const res = await fetch(`/api/designer/crm/style-quiz/templates/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTemplates(prev => prev.map(x => x.id === t.id ? updated : x));
      }
    } catch (e) {
      console.error(e);
    }
  }

  function addOption() {
    setOptions(prev => [...prev, { label: "" }]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, i) => i !== idx));
  }

  function updateOption(idx: number, field: keyof QuizOption, value: string) {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, [field]: value } : o));
  }

  const typeLabels: Record<QuizTemplate["questionType"], string> = {
    image_choice: "בחירה עם תמונות",
    text_choice: "בחירה מרובה",
    rating: "דירוג (1-5)",
    free_text: "טקסט חופשי",
  };

  const typeIcons: Record<QuizTemplate["questionType"], typeof Image> = {
    image_choice: Image,
    text_choice: Type,
    rating: Star,
    free_text: MessageSquare,
  };

  function renderAnswer(response: QuizResponse) {
    const answer = response.answer as Record<string, unknown>;
    if (!answer) return <span className="text-gray-400">אין תשובה</span>;

    if (typeof answer === "string") return <span>{answer}</span>;
    if (typeof answer === "number") {
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} size={16} className={n <= (answer as number) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} />
          ))}
        </div>
      );
    }
    if (Array.isArray(answer)) {
      return <div className="flex flex-wrap gap-1">{answer.map((a, i) => (
        <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{String(a)}</span>
      ))}</div>;
    }
    if (typeof answer === "object" && answer !== null) {
      const selected = (answer as { selected?: string }).selected;
      if (selected) return <span className="font-medium">{selected}</span>;
      return <span>{JSON.stringify(answer)}</span>;
    }
    return <span>{String(answer)}</span>;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">שאלון העדפות עיצוב</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setView("templates")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${view === "templates" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            שאלות
          </button>
          <button
            onClick={() => setView("responses")}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${view === "responses" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            תשובות לקוחות
          </button>
        </div>
      </div>

      {view === "templates" ? (
        <>
          {/* Add question button */}
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              הוסף שאלה חדשה
            </button>
          )}

          {/* Form */}
          {showForm && (
            <div className="bg-white border rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">
                  {editingId ? "עריכת שאלה" : "שאלה חדשה"}
                </h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">השאלה</label>
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder='למשל: "איזה סגנון עיצוב מדבר אליך?"'
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600 mb-1 block">סוג שאלה</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(typeLabels) as QuizTemplate["questionType"][]).map(type => {
                    const Icon = typeIcons[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setQuestionType(type)}
                        className={`border rounded-lg p-2 text-xs flex flex-col items-center gap-1 transition-colors ${questionType === type ? "bg-blue-50 border-blue-500 text-blue-700" : "hover:bg-gray-50"}`}
                      >
                        <Icon size={16} />
                        {typeLabels[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(questionType === "image_choice" || questionType === "text_choice") && (
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">אפשרויות</label>
                  <div className="space-y-2">
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <GripVertical size={14} className="text-gray-300 shrink-0" />
                        <input
                          value={opt.label}
                          onChange={e => updateOption(idx, "label", e.target.value)}
                          placeholder={`אפשרות ${idx + 1}`}
                          className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        {questionType === "image_choice" && (
                          <input
                            value={opt.imageUrl || ""}
                            onChange={e => updateOption(idx, "imageUrl", e.target.value)}
                            placeholder="URL תמונה (אופציונלי)"
                            className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        )}
                        <button
                          onClick={() => removeOption(idx)}
                          className="text-gray-400 hover:text-red-500 shrink-0"
                          disabled={options.length <= 2}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addOption}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      הוסף אפשרות
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                  ביטול
                </button>
                <button
                  onClick={handleSave}
                  disabled={!question.trim()}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {editingId ? "עדכן" : "הוסף"}
                </button>
              </div>
            </div>
          )}

          {/* Template list */}
          <div className="space-y-3">
            {templates.sort((a, b) => a.sortOrder - b.sortOrder).map(t => {
              const Icon = typeIcons[t.questionType];
              return (
                <div
                  key={t.id}
                  className={`bg-white border rounded-xl p-4 transition-colors ${!t.isActive ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="bg-blue-50 p-2 rounded-lg shrink-0">
                        <Icon size={18} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800">{t.question}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{typeLabels[t.questionType]}</p>
                        {t.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {t.options.map((opt, i) => (
                              <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                                {opt.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleActive(t)}
                        className={`p-1.5 rounded-lg transition-colors ${t.isActive ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                        title={t.isActive ? "פעיל — לחץ לכיבוי" : "כבוי — לחץ להפעלה"}
                      >
                        <Eye size={16} />
                      </button>
                      <button onClick={() => startEdit(t)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit3 size={16} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {templates.length === 0 && !showForm && (
              <div className="text-center py-12 text-gray-400">
                <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
                <p>עוד לא הגדרת שאלות לשאלון</p>
                <p className="text-sm mt-1">הוסף שאלות כדי להבין את ההעדפות העיצוביות של הלקוחות שלך</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Responses view */
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">בחר לקוח</label>
            <select
              value={selectedClientId || ""}
              onChange={e => {
                const cid = e.target.value;
                setSelectedClientId(cid || null);
                if (cid) fetchClientResponses(cid);
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">— בחר לקוח —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {selectedClientId && clientResponses.length > 0 ? (
            <div className="space-y-3">
              {clientResponses.map(r => {
                const tmpl = templates.find(t => t.id === r.questionId);
                return (
                  <div key={r.id} className="bg-white border rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      {tmpl?.question || "שאלה לא ידועה"}
                    </p>
                    <div className="text-sm text-gray-600">
                      {renderAnswer(r)}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(r.createdAt).toLocaleDateString("he-IL")}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : selectedClientId ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle2 size={40} className="mx-auto mb-3 opacity-30" />
              <p>הלקוח עוד לא מילא את השאלון</p>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Eye size={40} className="mx-auto mb-3 opacity-30" />
              <p>בחר לקוח כדי לראות את תשובות השאלון</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
