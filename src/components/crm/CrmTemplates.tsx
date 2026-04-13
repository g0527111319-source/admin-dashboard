"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Edit3, Trash2, Copy, FileText, ChevronLeft, Tag } from "lucide-react";
import { g } from "@/lib/gender";

type MessageTemplate = {
  id: string;
  designerId: string;
  name: string;
  content: string;
  category: string | null;
  variables: string[];
  createdAt: string;
  updatedAt: string;
};

const TEMPLATE_CATEGORIES = [
  { value: "welcome", label: "ברוכים הבאים" },
  { value: "update", label: "עדכון שלב" },
  { value: "payment", label: "תשלום" },
  { value: "reminder", label: "תזכורת" },
  { value: "completion", label: "סיום פרויקט" },
  { value: "general", label: "כללי" },
];

const AVAILABLE_VARIABLES = [
  { key: "{{שם_לקוח}}", label: "שם הלקוח" },
  { key: "{{שם_פרויקט}}", label: "שם הפרויקט" },
  { key: "{{שלב_נוכחי}}", label: "שלב נוכחי" },
  { key: "{{תאריך}}", label: "תאריך" },
  { key: "{{סכום}}", label: "סכום" },
  { key: "{{שם_מעצבת}}", label: "שם המעצבת" },
];

export default function CrmTemplates({ gender }: { gender?: string } = {}) {
  const gdr = gender || "female";
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [filterCategory, setFilterCategory] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    category: "general",
    variables: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/templates");
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch {
      console.error("Failed to fetch templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.content.trim()) return;
    setSaving(true);
    setError("");

    // Auto-detect variables
    const detectedVars = AVAILABLE_VARIABLES
      .filter((v) => formData.content.includes(v.key))
      .map((v) => v.key);

    try {
      const url = editingTemplate
        ? `/api/designer/crm/templates/${editingTemplate.id}`
        : "/api/designer/crm/templates";
      const method = editingTemplate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          content: formData.content.trim(),
          category: formData.category || null,
          variables: detectedVars,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "שגיאה");
        return;
      }

      setShowForm(false);
      setEditingTemplate(null);
      setFormData({ name: "", content: "", category: "general", variables: [] });
      fetchTemplates();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("למחוק את התבנית?")) return;
    try {
      await fetch(`/api/designer/crm/templates/${templateId}`, { method: "DELETE" });
      fetchTemplates();
    } catch {
      console.error("Delete failed");
    }
  };

  const startEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category || "general",
      variables: template.variables || [],
    });
    setShowForm(true);
  };

  const copyContent = (template: MessageTemplate) => {
    navigator.clipboard.writeText(template.content);
    setCopiedId(template.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const insertVariable = (variable: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content + variable,
    }));
  };

  const filteredTemplates = filterCategory
    ? templates.filter((t) => t.category === filterCategory)
    : templates;

  const categoryLabel = (cat: string | null) =>
    TEMPLATE_CATEGORIES.find((c) => c.value === cat)?.label || cat || "כללי";

  // Form view
  if (showForm) {
    return (
      <div className="space-y-6 animate-in max-w-2xl mx-auto">
        <button
          onClick={() => { setShowForm(false); setEditingTemplate(null); }}
          className="flex items-center gap-1 text-gold text-sm hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          חזרה
        </button>
        <h2 className="text-xl font-heading text-text-primary">
          {editingTemplate ? "עריכת תבנית" : "תבנית חדשה"}
        </h2>
        <form onSubmit={handleSubmit} className="card-static space-y-4">
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">שם התבנית *</label>
            <input
              type="text"
              className="input-field"
              placeholder="לדוגמה: הודעת פתיחה, עדכון שלב..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">קטגוריה</label>
            <select
              className="input-field"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              {TEMPLATE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-1">תוכן ההודעה *</label>
            <textarea
              className="input-field h-40 resize-none"
              placeholder={g(gdr, "כתוב את תוכן ההודעה... ניתן להשתמש במשתנים דינמיים", "כתבי את תוכן ההודעה... ניתן להשתמש במשתנים דינמיים")}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-text-secondary text-sm font-medium block mb-2">משתנים דינמיים</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARIABLES.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => insertVariable(v.key)}
                  className="text-xs px-2 py-1 bg-gold/10 text-gold rounded-full hover:bg-gold/20 transition-colors"
                >
                  {v.label} ({v.key})
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={saving} className="btn-gold w-full">
            {saving ? "שומר..." : editingTemplate ? "עדכון תבנית" : "יצירת תבנית"}
          </button>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading text-text-primary">תבניות הודעה</h2>
        <button
          onClick={() => {
            setFormData({ name: "", content: "", category: "general", variables: [] });
            setEditingTemplate(null);
            setShowForm(true);
          }}
          className="btn-gold text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          תבנית חדשה
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory("")}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            !filterCategory ? "bg-gold text-white" : "bg-bg-surface text-text-muted hover:bg-gold/10"
          }`}
        >
          הכל ({templates.length})
        </button>
        {TEMPLATE_CATEGORIES.map((cat) => {
          const count = templates.filter((t) => t.category === cat.value).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.value}
              onClick={() => setFilterCategory(cat.value)}
              className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                filterCategory === cat.value ? "bg-gold text-white" : "bg-bg-surface text-text-muted hover:bg-gold/10"
              }`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">טוען...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="card-static text-center py-12">
          <FileText className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="text-text-muted">
            {templates.length === 0 ? g(gdr, "אין תבניות הודעה עדיין. צור תבנית ראשונה!", "אין תבניות הודעה עדיין. צרי תבנית ראשונה!") : "אין תבניות בקטגוריה זו"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="card-static">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-text-primary font-medium">{template.name}</h3>
                  <span className="inline-flex items-center gap-1 text-xs text-text-muted mt-1">
                    <Tag className="w-3 h-3" />
                    {categoryLabel(template.category)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyContent(template)}
                    className="p-1.5 text-text-muted hover:text-gold transition-colors"
                    title="העתק תוכן"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => startEdit(template)}
                    className="p-1.5 text-text-muted hover:text-gold transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 text-text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="bg-bg-surface rounded-btn p-3 text-text-secondary text-sm whitespace-pre-wrap leading-relaxed">
                {template.content}
              </div>
              {copiedId === template.id && (
                <p className="text-emerald-600 text-xs mt-2">הועתק!</p>
              )}
              {template.variables.length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  {template.variables.map((v) => (
                    <span key={v} className="text-xs px-2 py-0.5 bg-gold/10 text-gold rounded-full">
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
