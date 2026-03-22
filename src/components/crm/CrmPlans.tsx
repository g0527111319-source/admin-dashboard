"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, Eye, EyeOff, X, Upload, FileText,
  Zap, Wrench, Sofa, HardHat, Snowflake, Ruler,
  TreePine, Scaling, File, Download, ChevronDown,
  Maximize2, ToggleLeft, ToggleRight,
} from "lucide-react";

type Plan = {
  id: string;
  projectId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  title: string | null;
  description: string | null;
  category: string | null;
  isVisibleToClient: boolean;
  createdAt: string;
  project?: { id: string; name: string; client: { id: string; name: string } | null };
};

type Project = { id: string; name: string; client: { name: string } };

const PLAN_CATEGORIES = [
  { key: "electrical", label: "תכנית חשמל", icon: Zap, color: "text-yellow-600 bg-yellow-50" },
  { key: "plumbing", label: "תכנית אינסטלציה", icon: Wrench, color: "text-blue-600 bg-blue-50" },
  { key: "furniture", label: "תכנית ריהוט", icon: Sofa, color: "text-amber-700 bg-amber-50" },
  { key: "drywall", label: "גבס ותקרה", icon: HardHat, color: "text-gray-600 bg-gray-50" },
  { key: "hvac", label: "תכנית מיזוג", icon: Snowflake, color: "text-cyan-600 bg-cyan-50" },
  { key: "sections", label: "חתכים", icon: Ruler, color: "text-indigo-600 bg-indigo-50" },
  { key: "carpentry", label: "פרטי נגרות", icon: TreePine, color: "text-emerald-700 bg-emerald-50" },
  { key: "measurements", label: "תכנית מדידות", icon: Scaling, color: "text-purple-600 bg-purple-50" },
  { key: "general", label: "כללי", icon: File, color: "text-text-muted bg-bg-surface" },
];

const getCategoryInfo = (key: string) =>
  PLAN_CATEGORIES.find((c) => c.key === key) || PLAN_CATEGORIES[PLAN_CATEGORIES.length - 1];

const isPdf = (url: string) => url.toLowerCase().endsWith(".pdf");

export default function CrmPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingPlan, setViewingPlan] = useState<Plan | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "general",
    isVisibleToClient: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const DEMO_PROJECTS: Project[] = [
    { id: "demo-proj-1", name: "שיפוץ דירת 4 חדרים — הרצל 42", client: { name: "רונית ואבי כהן" } },
    { id: "demo-proj-2", name: "עיצוב דירה חדשה — רוטשילד 15", client: { name: "יוסי ומיכל לוי" } },
    { id: "demo-proj-3", name: "שיפוץ מטבח — נחלת בנימין 8", client: { name: "דנה אברהם" } },
  ];

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/projects");
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setProjects(data);
          if (!selectedProjectId) setSelectedProjectId(data[0].id);
          return;
        }
      }
      setProjects(DEMO_PROJECTS);
      if (!selectedProjectId) setSelectedProjectId(DEMO_PROJECTS[0].id);
    } catch {
      setProjects(DEMO_PROJECTS);
      if (!selectedProjectId) setSelectedProjectId(DEMO_PROJECTS[0].id);
    }
  }, [selectedProjectId]);

  const fetchPlans = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/designer/crm/plans?projectId=${selectedProjectId}`);
      if (res.ok) setPlans(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleUpload = async () => {
    if (!selectedFile || !selectedProjectId) return;
    setUploading(true);

    try {
      // 1. Upload the file
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("folder", "plans");

      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        alert(err.error || "שגיאה בהעלאה");
        return;
      }
      const { url } = await uploadRes.json();

      // 2. Create the plan record
      const res = await fetch("/api/designer/crm/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          fileUrl: url,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          title: uploadForm.title || selectedFile.name,
          description: uploadForm.description,
          category: uploadForm.category,
          isVisibleToClient: uploadForm.isVisibleToClient,
        }),
      });

      if (res.ok) {
        setShowUpload(false);
        setSelectedFile(null);
        setUploadForm({ title: "", description: "", category: "general", isVisibleToClient: true });
        fetchPlans();
      }
    } catch (e) {
      console.error("Upload error:", e);
    } finally {
      setUploading(false);
    }
  };

  const toggleVisibility = async (plan: Plan) => {
    try {
      await fetch(`/api/designer/crm/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisibleToClient: !plan.isVisibleToClient }),
      });
      setPlans((prev) =>
        prev.map((p) =>
          p.id === plan.id ? { ...p, isVisibleToClient: !p.isVisibleToClient } : p
        )
      );
    } catch {
      /* ignore */
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm("למחוק את התכנית?")) return;
    try {
      await fetch(`/api/designer/crm/plans/${planId}`, { method: "DELETE" });
      setPlans((prev) => prev.filter((p) => p.id !== planId));
      if (viewingPlan?.id === planId) setViewingPlan(null);
    } catch {
      /* ignore */
    }
  };

  // Group plans by category
  const groupedPlans: Record<string, Plan[]> = {};
  for (const plan of plans) {
    const cat = plan.category || "general";
    if (!groupedPlans[cat]) groupedPlans[cat] = [];
    groupedPlans[cat].push(plan);
  }

  const categoriesWithPlans = PLAN_CATEGORIES.filter((c) => groupedPlans[c.key]?.length);

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
            <Ruler className="w-5 h-5 text-gold" />
            תכניות
          </h2>
          <p className="text-sm text-text-muted mt-0.5">
            תכניות חשמל, אינסטלציה, ריהוט ועוד — העלי וסדרי לפי קטגוריה
          </p>
        </div>
        {selectedProjectId && (
          <button
            onClick={() => setShowUpload(true)}
            className="btn-gold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> העלאת תכנית
          </button>
        )}
      </div>

      {/* Project selector */}
      <select
        className="select-field"
        value={selectedProjectId}
        onChange={(e) => setSelectedProjectId(e.target.value)}
      >
        <option value="">בחרי פרויקט...</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {p.client?.name}
          </option>
        ))}
      </select>

      {/* Upload form */}
      {showUpload && selectedProjectId && (
        <div className="card-static space-y-4 animate-in">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-text-primary">העלאת תכנית חדשה</h3>
            <button
              onClick={() => {
                setShowUpload(false);
                setSelectedFile(null);
              }}
              className="text-text-muted hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              קובץ (תמונה או PDF)
            </label>
            {!selectedFile ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border-subtle rounded-xl cursor-pointer hover:border-gold/50 hover:bg-gold/5 transition-all">
                <Upload className="w-8 h-8 text-text-muted mb-2" />
                <span className="text-sm text-text-muted">לחצי לבחירת קובץ</span>
                <span className="text-xs text-text-faint mt-1">
                  JPG, PNG, PDF — עד 15MB
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".png,.webp,.svg,.jpg,.jpeg,.pdf,image/png,image/webp,image/svg+xml,image/jpeg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setSelectedFile(f);
                      if (!uploadForm.title) {
                        setUploadForm((prev) => ({
                          ...prev,
                          title: f.name.replace(/\.[^/.]+$/, ""),
                        }));
                      }
                    }
                  }}
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-emerald-800 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-emerald-600">
                    {(selectedFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-emerald-600 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              כותרת
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="למשל: תכנית חשמל — ריביזיה 2"
              value={uploadForm.title}
              onChange={(e) =>
                setUploadForm((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              קטגוריה
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {PLAN_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = uploadForm.category === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() =>
                      setUploadForm((prev) => ({ ...prev, category: cat.key }))
                    }
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? "border-gold bg-gold/10 ring-1 ring-gold/30"
                        : "border-border-subtle hover:border-gold/30"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isSelected ? "text-gold" : "text-text-muted"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        isSelected
                          ? "text-gold font-medium"
                          : "text-text-muted"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              תיאור (אופציונלי)
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="הערות, ריביזיה, תאריך..."
              value={uploadForm.description}
              onChange={(e) =>
                setUploadForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          {/* Visible to client toggle */}
          <div className="flex items-center justify-between p-3 bg-bg-surface rounded-xl">
            <div>
              <p className="text-sm font-medium text-text-primary">הצג ללקוח</p>
              <p className="text-xs text-text-muted">
                הלקוח יוכל לראות את התכנית באיזור האישי שלו
              </p>
            </div>
            <button
              onClick={() =>
                setUploadForm((prev) => ({
                  ...prev,
                  isVisibleToClient: !prev.isVisibleToClient,
                }))
              }
              className="flex-shrink-0"
            >
              {uploadForm.isVisibleToClient ? (
                <ToggleRight className="w-8 h-8 text-gold" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-text-muted" />
              )}
            </button>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="btn-gold w-full disabled:opacity-40"
          >
            {uploading ? "מעלה..." : "העלה תכנית"}
          </button>
        </div>
      )}

      {/* Plans grid by category */}
      {!selectedProjectId ? (
        <div className="card-static text-center py-12 text-text-muted">
          בחרי פרויקט כדי לראות תכניות
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="card-static text-center py-16">
          <Ruler className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
          <p className="font-medium text-text-secondary mb-1">אין תכניות עדיין</p>
          <p className="text-sm text-text-muted mb-4">
            העלי תכניות חשמל, אינסטלציה, ריהוט ועוד
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="btn-gold"
          >
            <Plus className="w-4 h-4 inline ml-1" />
            העלאת תכנית ראשונה
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {categoriesWithPlans.map((cat) => {
            const catPlans = groupedPlans[cat.key];
            const Icon = cat.icon;
            return (
              <div key={cat.key}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${cat.color}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    {cat.label}
                  </h3>
                  <span className="text-xs text-text-muted">
                    ({catPlans.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      onView={() => setViewingPlan(plan)}
                      onToggleVisibility={() => toggleVisibility(plan)}
                      onDelete={() => deletePlan(plan.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View modal */}
      {viewingPlan && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                {(() => {
                  const cat = getCategoryInfo(viewingPlan.category || "general");
                  const Icon = cat.icon;
                  return (
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="font-medium text-text-primary">
                    {viewingPlan.title || viewingPlan.fileName}
                  </h3>
                  {viewingPlan.description && (
                    <p className="text-xs text-text-muted">
                      {viewingPlan.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingPlan.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-text-muted hover:text-gold rounded-lg transition-colors"
                  title="הורדה"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setViewingPlan(null)}
                  className="p-2 text-text-muted hover:text-text-primary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
              {isPdf(viewingPlan.fileUrl) ? (
                <iframe
                  src={viewingPlan.fileUrl}
                  className="w-full h-full min-h-[60vh] rounded-lg border"
                  title={viewingPlan.title || viewingPlan.fileName}
                />
              ) : (
                <img
                  src={viewingPlan.fileUrl}
                  alt={viewingPlan.title || viewingPlan.fileName}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  onView,
  onToggleVisibility,
  onDelete,
}: {
  plan: Plan;
  onView: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const pdf = isPdf(plan.fileUrl);

  return (
    <div className="group bg-white border border-border-subtle rounded-xl overflow-hidden hover:border-gold/30 hover:shadow-sm transition-all">
      {/* Preview */}
      <button
        onClick={onView}
        className="w-full aspect-[4/3] bg-bg-surface flex items-center justify-center overflow-hidden relative"
      >
        {pdf ? (
          <div className="flex flex-col items-center gap-2 text-text-muted">
            <FileText className="w-12 h-12 opacity-40" />
            <span className="text-xs">PDF</span>
          </div>
        ) : (
          <img
            src={plan.fileUrl}
            alt={plan.title || plan.fileName}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
        </div>
      </button>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-text-primary truncate">
          {plan.title || plan.fileName}
        </p>
        {plan.description && (
          <p className="text-xs text-text-muted truncate mt-0.5">
            {plan.description}
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-text-faint">
            {new Date(plan.createdAt).toLocaleDateString("he-IL")}
            {plan.fileSize && ` · ${(plan.fileSize / 1024).toFixed(0)} KB`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleVisibility}
              className={`p-1 rounded transition-colors ${
                plan.isVisibleToClient
                  ? "text-emerald-500 hover:text-emerald-700"
                  : "text-text-faint hover:text-text-muted"
              }`}
              title={
                plan.isVisibleToClient ? "גלוי ללקוח" : "מוסתר מהלקוח"
              }
            >
              {plan.isVisibleToClient ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={onDelete}
              className="p-1 text-text-faint hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
