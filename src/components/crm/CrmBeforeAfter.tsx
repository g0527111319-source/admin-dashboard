"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Image, Eye, EyeOff, Globe, Trash2, Edit3, ChevronLeft, ChevronRight, Upload, ZoomIn } from "lucide-react";
import FileUpload, { type UploadedFile } from "@/components/ui/FileUpload";

type BeforeAfterSet = {
  id: string;
  projectId: string;
  title: string;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  beforeCaption: string | null;
  afterCaption: string | null;
  isVisibleInPortal: boolean;
  isPublic: boolean;
  createdAt: string;
};

type Project = { id: string; name: string; clientId: string; client: { name: string } };

// Lightbox component
function Lightbox({
  sets,
  initialIndex,
  initialSide,
  onClose,
}: {
  sets: BeforeAfterSet[];
  initialIndex: number;
  initialSide: "before" | "after";
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [side, setSide] = useState<"before" | "after">(initialSide);

  const currentSet = sets[currentIndex];
  const imageUrl = side === "before" ? currentSet?.beforeImageUrl : currentSet?.afterImageUrl;
  const caption = side === "before" ? currentSet?.beforeCaption : currentSet?.afterCaption;

  const goNext = useCallback(() => {
    if (side === "before" && currentSet?.afterImageUrl) {
      setSide("after");
    } else if (currentIndex < sets.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSide("before");
    }
  }, [side, currentIndex, sets.length, currentSet]);

  const goPrev = useCallback(() => {
    if (side === "after" && currentSet?.beforeImageUrl) {
      setSide("before");
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSide("after");
    }
  }, [side, currentIndex, currentSet]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goPrev(); // RTL
      if (e.key === "ArrowLeft") goNext(); // RTL
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  if (!currentSet) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Title and label */}
      <div className="absolute top-4 right-4 z-10 text-right">
        <h3 className="text-white font-heading text-lg">{currentSet.title}</h3>
        <span className={`inline-block px-3 py-1 rounded-full text-sm mt-1 ${
          side === "before" ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"
        }`}>
          {side === "before" ? "לפני" : "אחרי"}
        </span>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>

      {/* Image */}
      <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={caption || currentSet.title}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <div className="w-96 h-64 bg-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-500">
            <Image className="w-16 h-16 mb-2" />
            <span>אין תמונה</span>
          </div>
        )}
      </div>

      {/* Caption */}
      {caption && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-2 rounded-full">
          {caption}
        </div>
      )}

      {/* Counter */}
      <div className="absolute bottom-6 right-6 text-white/50 text-xs">
        {currentIndex + 1} / {sets.length} &middot; החליקו במובייל לניווט
      </div>

      {/* Before/After toggle */}
      <div className="absolute bottom-6 left-6 flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); setSide("before"); }}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
            side === "before" ? "bg-red-500/30 text-red-300 border border-red-500/50" : "bg-white/10 text-white/60"
          }`}
        >
          לפני
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setSide("after"); }}
          className={`px-3 py-1.5 rounded-full text-xs transition-colors ${
            side === "after" ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50" : "bg-white/10 text-white/60"
          }`}
        >
          אחרי
        </button>
      </div>
    </div>
  );
}

export default function CrmBeforeAfter({ clientId, projectId }: { clientId?: string; projectId?: string } = {}) {
  const [sets, setSets] = useState<BeforeAfterSet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ index: number; side: "before" | "after" } | null>(null);

  const [form, setForm] = useState({
    title: "",
    beforeImageUrl: "",
    afterImageUrl: "",
    beforeCaption: "",
    afterCaption: "",
    isVisibleInPortal: true,
    isPublic: false,
  });

  useEffect(() => {
    fetch("/api/designer/crm/projects").then(r => r.ok ? r.json() : []).then(d => {
      const projs = Array.isArray(d) ? d : d.projects || [];
      setProjects(projs);
      if (projs.length > 0) setSelectedProject(projs[0].id);
    });
  }, []);

  useEffect(() => {
    if (selectedProject) fetchSets();
  }, [selectedProject]);

  const fetchSets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/designer/crm/projects/${selectedProject}/before-after`);
      if (res.ok) setSets(await res.json());
    } catch { /* */ } finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ title: "", beforeImageUrl: "", afterImageUrl: "", beforeCaption: "", afterCaption: "", isVisibleInPortal: true, isPublic: false });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.title || !selectedProject) return;
    const url = editingId
      ? `/api/designer/crm/projects/${selectedProject}/before-after/${editingId}`
      : `/api/designer/crm/projects/${selectedProject}/before-after`;
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { resetForm(); fetchSets(); }
  };

  const handleEdit = (set: BeforeAfterSet) => {
    setForm({
      title: set.title,
      beforeImageUrl: set.beforeImageUrl || "",
      afterImageUrl: set.afterImageUrl || "",
      beforeCaption: set.beforeCaption || "",
      afterCaption: set.afterCaption || "",
      isVisibleInPortal: set.isVisibleInPortal,
      isPublic: set.isPublic,
    });
    setEditingId(set.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את הסט הזה?")) return;
    await fetch(`/api/designer/crm/projects/${selectedProject}/before-after/${id}`, { method: "DELETE" });
    fetchSets();
  };

  const toggleVisibility = async (set: BeforeAfterSet, field: "isVisibleInPortal" | "isPublic") => {
    await fetch(`/api/designer/crm/projects/${selectedProject}/before-after/${set.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: !set[field] }),
    });
    fetchSets();
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox
          sets={sets}
          initialIndex={lightbox.index}
          initialSide={lightbox.side}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading text-text-primary">לפני ואחרי</h2>
          <p className="text-sm text-text-muted mt-1">גלריית השוואה -- הציגי את העבודה שלך</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-gold flex items-center gap-2">
          <Plus className="w-4 h-4" /> הוסיפי סט
        </button>
      </div>

      {/* Project selector */}
      <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="border border-border-subtle rounded-lg px-3 py-2 text-sm">
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      {/* Form */}
      {showForm && (
        <div className="card-static space-y-4 border-2 border-gold/30">
          <div className="flex justify-between items-center">
            <h3 className="font-heading font-semibold">{editingId ? "עריכת" : "הוספת"} סט לפני/אחרי</h3>
            <button onClick={resetForm}><X className="w-5 h-5 text-text-muted" /></button>
          </div>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="שם החדר (לדוגמה: סלון)" className="w-full border border-border-subtle rounded-lg px-3 py-2" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                תמונת לפני
              </label>
              <FileUpload
                compact
                dark
                category="image"
                folder="before-after"
                currentUrl={form.beforeImageUrl}
                label="העלאת תמונת לפני"
                onUpload={(file: UploadedFile) => setForm({ ...form, beforeImageUrl: file.url })}
                onError={(err: string) => alert(err)}
              />
              <input value={form.beforeCaption} onChange={e => setForm({ ...form, beforeCaption: e.target.value })} placeholder="כיתוב (אופציונלי)" className="w-full border border-border-subtle rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                תמונת אחרי
              </label>
              <FileUpload
                compact
                dark
                category="image"
                folder="before-after"
                currentUrl={form.afterImageUrl}
                label="העלאת תמונת אחרי"
                onUpload={(file: UploadedFile) => setForm({ ...form, afterImageUrl: file.url })}
                onError={(err: string) => alert(err)}
              />
              <input value={form.afterCaption} onChange={e => setForm({ ...form, afterCaption: e.target.value })} placeholder="כיתוב (אופציונלי)" className="w-full border border-border-subtle rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isVisibleInPortal} onChange={e => setForm({ ...form, isVisibleInPortal: e.target.checked })} />
              הצגה בפורטל הלקוח
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPublic} onChange={e => setForm({ ...form, isPublic: e.target.checked })} />
              הצגה בכרטיס הביקור (פומבי)
            </label>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-text-muted">ביטול</button>
            <button onClick={handleSubmit} disabled={!form.title} className="btn-gold">{editingId ? "עדכני" : "הוסיפי"}</button>
          </div>
        </div>
      )}

      {/* Sets grid */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">טוען...</div>
      ) : sets.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>אין תמונות לפני/אחרי בפרויקט הזה</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sets.map((set, setIndex) => (
            <div key={set.id} className="card-static">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{set.title}</h3>
                <div className="flex gap-1">
                  <button onClick={() => toggleVisibility(set, "isVisibleInPortal")} title={set.isVisibleInPortal ? "מוצג בפורטל" : "מוסתר מפורטל"} className={`p-1.5 rounded ${set.isVisibleInPortal ? "text-green-600" : "text-gray-300"}`}>
                    {set.isVisibleInPortal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => toggleVisibility(set, "isPublic")} title={set.isPublic ? "פומבי" : "פרטי"} className={`p-1.5 rounded ${set.isPublic ? "text-gold" : "text-gray-300"}`}>
                    <Globe className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleEdit(set)} className="p-1.5 text-text-muted hover:text-text-primary"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(set.id)} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Before image */}
                <div className="relative group">
                  <div
                    className="bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer overflow-hidden"
                    onClick={() => set.beforeImageUrl && setLightbox({ index: setIndex, side: "before" })}
                  >
                    {set.beforeImageUrl ? (
                      <img src={set.beforeImageUrl} alt="לפני" className="w-full h-auto block rounded-lg transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="py-10 flex flex-col items-center"><Image className="w-8 h-8 mb-1" /><span className="text-xs">לפני</span></div>
                    )}
                  </div>
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/80 text-white">
                    לפני
                  </span>
                  {set.beforeImageUrl && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center pointer-events-none">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                    </div>
                  )}
                </div>
                {/* After image */}
                <div className="relative group">
                  <div
                    className="bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer overflow-hidden"
                    onClick={() => set.afterImageUrl && setLightbox({ index: setIndex, side: "after" })}
                  >
                    {set.afterImageUrl ? (
                      <img src={set.afterImageUrl} alt="אחרי" className="w-full h-auto block rounded-lg transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="py-10 flex flex-col items-center"><Image className="w-8 h-8 mb-1" /><span className="text-xs">אחרי</span></div>
                    )}
                  </div>
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/80 text-white">
                    אחרי
                  </span>
                  {set.afterImageUrl && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center pointer-events-none">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>

              {(set.beforeCaption || set.afterCaption) && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <p className="text-xs text-text-muted text-center">{set.beforeCaption}</p>
                  <p className="text-xs text-text-muted text-center">{set.afterCaption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
