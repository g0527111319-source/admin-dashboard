"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, X, Trash2, Edit3, Star, GripVertical,
  Eye, EyeOff, Filter, SortDesc, ImagePlus, Save,
  ChevronLeft, AlertCircle, FolderKanban, Link2,
  Upload, Loader2,
} from "lucide-react";

// ===== TYPES =====
type ProjectImage = {
  id: string;
  projectId: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
};

type Project = {
  id: string;
  designerId: string;
  title: string;
  description: string | null;
  category: string;
  styleTags: string[];
  coverImageUrl: string | null;
  status: string;
  suppliers: string[];
  createdAt: string;
  updatedAt: string;
  images: ProjectImage[];
};

type CrmSupplier = {
  id: string;
  name: string;
  category: string;
};

// ===== CONSTANTS =====
const CATEGORIES = [
  { value: "apartment", label: "דירה" },
  { value: "house", label: "בית פרטי" },
  { value: "office", label: "משרד" },
  { value: "commercial", label: "מסחרי" },
  { value: "other", label: "אחר" },
];

const STYLE_TAGS = [
  "מינימליסטי", "כפרי", "מודרני", "קלאסי", "תעשייתי",
  "סקנדינבי", "בוהו", "ים תיכוני", "יפני", "אקלקטי",
];

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "apartment",
  styleTags: [] as string[],
  coverImageUrl: "",
  status: "private",
  suppliers: [] as string[],
};

// ===== HELPERS =====
function getCategoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isGooglePhotosShareLink(url: string): boolean {
  return url.includes("photos.app.goo.gl") || url.includes("photos.google.com/share");
}

function convertImageUrl(url: string): string {
  // Google Photos shared album/photo links - can't be converted directly
  // (handled separately with a warning message)

  // Google Drive links
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveFileMatch[1]}`;
  }
  // https://drive.google.com/open?id=FILE_ID
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) {
    return `https://drive.google.com/uc?export=view&id=${driveOpenMatch[1]}`;
  }

  // Google Photos direct lh3 links - already work
  if (url.includes("lh3.googleusercontent.com")) {
    return url;
  }

  // Dropbox links - convert to direct download
  // https://www.dropbox.com/s/xxx/file.jpg?dl=0
  if (url.includes("dropbox.com")) {
    return url.replace("dl=0", "dl=1").replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }

  // OneDrive links - can't easily convert, return as-is
  if (url.includes("1drv.ms") || url.includes("onedrive.live.com")) {
    return url;
  }

  return url;
}

function extractUrls(text: string): string[] {
  return text
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter((line) => line && isValidUrl(line));
}

// ===== COMPONENT =====
export default function CrmPortfolio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<CrmSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "form" | "images">("list");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // Image management state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [imagePreviewValid, setImagePreviewValid] = useState(false);
  const [projectImages, setProjectImages] = useState<ProjectImage[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [googlePhotosWarning, setGooglePhotosWarning] = useState(false);
  const [multiAddCount, setMultiAddCount] = useState<number | null>(null);
  const [coverImageWarning, setCoverImageWarning] = useState(false);

  // Image upload state
  const [imageAddMode, setImageAddMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  // ===== FETCH =====
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/designer/crm/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (e) {
      console.error("Failed to load suppliers", e);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchSuppliers();
  }, [fetchProjects, fetchSuppliers]);

  // ===== FORM ACTIONS =====
  const openCreate = () => {
    setEditingProject(null);
    setForm(EMPTY_FORM);
    setError("");
    setView("form");
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      title: project.title,
      description: project.description || "",
      category: project.category,
      styleTags: [...project.styleTags],
      coverImageUrl: project.coverImageUrl || "",
      status: project.status,
      suppliers: [...project.suppliers],
    });
    setError("");
    setView("form");
  };

  const openImages = (project: Project) => {
    setSelectedProject(project);
    setProjectImages(project.images || []);
    setNewImageUrl("");
    setImagePreviewError(false);
    setImagePreviewValid(false);
    setGooglePhotosWarning(false);
    setMultiAddCount(null);
    setImageAddMode("url");
    setUploadError("");
    setUploading(false);
    setBrokenImages(new Set());
    setView("images");
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("שם הפרויקט חובה");
      return;
    }
    if (form.coverImageUrl && !isValidUrl(form.coverImageUrl)) {
      setError("כתובת תמונת הכיסוי לא תקינה");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const url = editingProject
        ? `/api/designer/projects/${editingProject.id}`
        : "/api/designer/projects";
      const method = editingProject ? "PATCH" : "POST";

      const convertedCoverUrl = form.coverImageUrl
        ? convertImageUrl(form.coverImageUrl)
        : null;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description || null,
          category: form.category,
          styleTags: form.styleTags,
          coverImageUrl: convertedCoverUrl,
          status: form.status,
          suppliers: form.suppliers,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה בשמירה");
      }

      await fetchProjects();
      setView("list");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בשמירה");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("למחוק את הפרויקט?")) return;
    try {
      await fetch(`/api/designer/projects/${id}`, { method: "DELETE" });
      await fetchProjects();
    } catch (e) {
      console.error("Delete error", e);
    }
  };

  // ===== IMAGE ACTIONS =====
  const handleAddImage = async () => {
    if (!selectedProject) return;
    const convertedUrl = convertImageUrl(newImageUrl.trim());
    if (!convertedUrl || !isValidUrl(convertedUrl)) {
      setImagePreviewError(true);
      return;
    }
    if (isGooglePhotosShareLink(newImageUrl.trim())) {
      setGooglePhotosWarning(true);
      return;
    }

    try {
      const res = await fetch(`/api/designer/projects/${selectedProject.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: convertedUrl,
          sortOrder: projectImages.length,
        }),
      });

      if (res.ok) {
        const image = await res.json();
        setProjectImages((prev) => [...prev, image]);
        setNewImageUrl("");
        setImagePreviewError(false);
        setImagePreviewValid(false);
        // Refresh project data
        await fetchProjects();
      }
    } catch (e) {
      console.error("Add image error", e);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!selectedProject) return;
    try {
      await fetch(`/api/designer/projects/${selectedProject.id}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: imageId }),
      });
      setProjectImages((prev) => prev.filter((img) => img.id !== imageId));
      await fetchProjects();
    } catch (e) {
      console.error("Delete image error", e);
    }
  };

  const handleSetCover = async (imageUrl: string) => {
    if (!selectedProject) return;
    try {
      await fetch(`/api/designer/projects/${selectedProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImageUrl: imageUrl }),
      });
      setSelectedProject({ ...selectedProject, coverImageUrl: imageUrl });
      await fetchProjects();
    } catch (e) {
      console.error("Set cover error", e);
    }
  };

  const handleCaptionUpdate = async (imageId: string, caption: string) => {
    // We need a caption update - use the PATCH reorder endpoint with caption
    // Actually the API only supports sortOrder reorder, so we'll store captions locally
    // and update via a small PATCH. For now: update local state.
    setProjectImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, caption } : img))
    );
  };

  // ===== DRAG AND DROP =====
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex || !selectedProject) return;

    const reordered = [...projectImages];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    const withOrder = reordered.map((img, i) => ({ ...img, sortOrder: i }));
    setProjectImages(withOrder);
    setDragIndex(null);
    setDragOverIndex(null);

    // Persist order
    try {
      await fetch(`/api/designer/projects/${selectedProject.id}/images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: withOrder.map((img) => ({ id: img.id, sortOrder: img.sortOrder })),
        }),
      });
    } catch (e) {
      console.error("Reorder error", e);
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // URL preview handler
  const handleImageUrlChange = (url: string) => {
    setGooglePhotosWarning(false);
    setMultiAddCount(null);

    const trimmed = url.trim();

    // Check for multiple URLs (pasted with newlines)
    const urls = extractUrls(trimmed);
    if (urls.length > 1) {
      handleMultipleUrls(urls);
      return;
    }

    // Check for Google Photos share links
    if (trimmed && isGooglePhotosShareLink(trimmed)) {
      setGooglePhotosWarning(true);
      setNewImageUrl(trimmed);
      setImagePreviewError(false);
      setImagePreviewValid(false);
      return;
    }

    // Auto-convert URL
    const converted = trimmed ? convertImageUrl(trimmed) : "";
    setNewImageUrl(converted);
    setImagePreviewError(false);
    setImagePreviewValid(false);
    if (converted && isValidUrl(converted)) {
      setImagePreviewValid(true);
    }
  };

  // Handle file upload - convert to base64 data URL
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    // Reset file input so the same file can be re-selected
    e.target.value = "";

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setUploadError("הקובץ חייב להיות תמונה (jpg, png, webp)");
      return;
    }

    // Validate file size (2MB max)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError("גודל הקובץ מוגבל ל-2MB. נסי לכווץ את התמונה.");
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      // Convert to base64 data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("שגיאה בקריאת הקובץ"));
        reader.readAsDataURL(file);
      });

      // Save to server
      const res = await fetch(`/api/designer/projects/${selectedProject.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: dataUrl,
          sortOrder: projectImages.length,
        }),
      });

      if (res.ok) {
        const image = await res.json();
        setProjectImages((prev) => [...prev, image]);
        await fetchProjects();
        setUploadError("");
      } else {
        throw new Error("שגיאה בשמירת התמונה");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "שגיאה בהעלאת התמונה");
    } finally {
      setUploading(false);
    }
  };

  // Handle pasting multiple URLs at once
  const handleMultipleUrls = async (urls: string[]) => {
    if (!selectedProject) return;

    // Check for Google Photos links in the batch
    const validUrls: string[] = [];
    for (const rawUrl of urls) {
      if (isGooglePhotosShareLink(rawUrl)) {
        continue; // Skip Google Photos share links
      }
      const converted = convertImageUrl(rawUrl);
      if (isValidUrl(converted)) {
        validUrls.push(converted);
      }
    }

    if (validUrls.length === 0) return;

    let addedCount = 0;
    for (let i = 0; i < validUrls.length; i++) {
      try {
        const res = await fetch(`/api/designer/projects/${selectedProject.id}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: validUrls[i],
            sortOrder: projectImages.length + i,
          }),
        });
        if (res.ok) {
          const image = await res.json();
          setProjectImages((prev) => [...prev, image]);
          addedCount++;
        }
      } catch (e) {
        console.error("Add image error", e);
      }
    }

    if (addedCount > 0) {
      setMultiAddCount(addedCount);
      setNewImageUrl("");
      setImagePreviewError(false);
      setImagePreviewValid(false);
      await fetchProjects();
    }
  };

  // ===== TOGGLE STYLE TAG =====
  const toggleStyleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      styleTags: prev.styleTags.includes(tag)
        ? prev.styleTags.filter((t) => t !== tag)
        : [...prev.styleTags, tag],
    }));
  };

  // ===== TOGGLE SUPPLIER =====
  const toggleSupplier = (supplierId: string) => {
    setForm((prev) => ({
      ...prev,
      suppliers: prev.suppliers.includes(supplierId)
        ? prev.suppliers.filter((s) => s !== supplierId)
        : [...prev.suppliers, supplierId],
    }));
  };

  // ===== FILTER & SORT =====
  const filtered = projects
    .filter((p) => categoryFilter === "all" || p.category === categoryFilter)
    .sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortDir === "desc" ? db - da : da - db;
    });

  // ===== RENDER =====

  // ---------- IMAGE MANAGEMENT VIEW ----------
  if (view === "images" && selectedProject) {
    return (
      <div className="space-y-6 animate-in" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#e0c068] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            חזרה לרשימה
          </button>
          <h2 className="text-lg font-bold text-white">
            תמונות — {selectedProject.title}
          </h2>
        </div>

        {/* Add Image */}
        <div className="bg-[#1a1a2e] rounded-xl border border-[#C9A84C]/20 p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-[#C9A84C]" />
            הוסף תמונה
          </h3>

          {/* Tab toggle: URL / Upload */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => { setImageAddMode("url"); setUploadError(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                imageAddMode === "url"
                  ? "bg-[#C9A84C]/15 border-[#C9A84C] text-[#C9A84C]"
                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
              }`}
            >
              <Link2 className="w-4 h-4" />
              הדבק לינק
            </button>
            <button
              type="button"
              onClick={() => { setImageAddMode("upload"); setImagePreviewError(false); setGooglePhotosWarning(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                imageAddMode === "upload"
                  ? "bg-[#C9A84C]/15 border-[#C9A84C] text-[#C9A84C]"
                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
              }`}
            >
              <Upload className="w-4 h-4" />
              העלה מהמחשב
            </button>
          </div>

          {/* URL mode */}
          {imageAddMode === "url" && (
            <>
              <div className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <input
                    type="url"
                    placeholder="הכנסי כתובת URL של תמונה..."
                    value={newImageUrl}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:border-[#C9A84C]/50 focus:outline-none transition-colors"
                    dir="ltr"
                  />
                  {imagePreviewError && (
                    <p className="text-red-400 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      הלינק לא תקין
                    </p>
                  )}
                  {googlePhotosWarning && (
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 text-orange-400 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        לינק שיתוף של Google Photos לא נתמך ישירות. לחצי ימני על
                        התמונה &rarr; &apos;העתק כתובת תמונה&apos; לקבלת לינק ישיר, או
                        העלי ל-Google Drive ושתפי משם.
                      </span>
                    </div>
                  )}
                  {multiAddCount !== null && multiAddCount > 0 && (
                    <p className="text-emerald-400 text-xs flex items-center gap-1">
                      נוספו {multiAddCount} תמונות
                    </p>
                  )}
                </div>
                <button
                  onClick={handleAddImage}
                  className="px-5 py-3 bg-[#C9A84C] text-black text-sm font-semibold rounded-xl hover:bg-[#e0c068] transition-colors flex-shrink-0"
                >
                  הוסף תמונה
                </button>
              </div>

              {/* URL Preview */}
              {newImageUrl.trim() && imagePreviewValid && !googlePhotosWarning && (
                <div className="mt-3 rounded-xl overflow-hidden border border-white/10 max-w-xs">
                  <img
                    src={convertImageUrl(newImageUrl.trim())}
                    alt="תצוגה מקדימה"
                    className="w-full h-40 object-cover"
                    loading="lazy"
                    onError={() => {
                      setImagePreviewError(true);
                      setImagePreviewValid(false);
                    }}
                    onLoad={() => {
                      setImagePreviewError(false);
                    }}
                  />
                </div>
              )}
            </>
          )}

          {/* Upload guide mode */}
          {imageAddMode === "upload" && (
            <div className="space-y-4">
              <div className="bg-[#0a0a0a] rounded-xl border border-[#C9A84C]/20 p-5">
                <h4 className="text-sm font-bold text-[#C9A84C] mb-3">📸 איך להעלות תמונות?</h4>
                <div className="space-y-3 text-sm text-white/70">
                  <div className="flex gap-3 items-start">
                    <span className="bg-[#C9A84C]/20 text-[#C9A84C] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                    <div>
                      <p className="font-medium text-white/90">postimages.org (הכי קל — ללא הגבלת גודל)</p>
                      <p className="text-xs text-white/50 mt-0.5">היכנסי ל-postimages.org → העלי תמונה → העתיקי "Direct Link" → הדביקי כאן</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="bg-[#C9A84C]/20 text-[#C9A84C] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                    <div>
                      <p className="font-medium text-white/90">Google Drive</p>
                      <p className="text-xs text-white/50 mt-0.5">העלי ל-Drive → שתפי → העתיקי לינק → הדביקי כאן (המערכת ממירה אוטומטית)</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="bg-[#C9A84C]/20 text-[#C9A84C] rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                    <div>
                      <p className="font-medium text-white/90">Google Photos</p>
                      <p className="text-xs text-white/50 mt-0.5">פתחי תמונה → לחצי ימני → "העתק כתובת תמונה" → הדביקי כאן</p>
                    </div>
                  </div>
                </div>
                <a href="https://postimages.org/he" target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-black text-sm font-semibold rounded-xl hover:bg-[#e0c068] transition-colors">
                  <Upload className="w-4 h-4" />
                  פתח את postimages.org
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Image Grid */}
        {projectImages.length === 0 ? (
          <div className="bg-[#1a1a2e] rounded-xl border border-white/5 p-12 text-center">
            <ImagePlus className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">אין תמונות עדיין</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {projectImages.map((image, index) => {
              const isCover = selectedProject.coverImageUrl === image.imageUrl;
              return (
                <div
                  key={image.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    bg-[#1a1a2e] rounded-xl border overflow-hidden group relative transition-all
                    ${dragOverIndex === index ? "border-[#C9A84C] scale-[1.02]" : "border-white/10"}
                    ${dragIndex === index ? "opacity-50" : ""}
                  `}
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3]">
                    {brokenImages.has(image.id) ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] border-2 border-red-500/40 rounded-t-xl gap-2">
                        <span className="text-2xl">&#10060;</span>
                        <span className="text-red-400 text-xs font-medium">הלינק לא תקין</span>
                        <button
                          onClick={() => handleDeleteImage(image.id)}
                          className="mt-1 px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-400 text-xs rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          מחק
                        </button>
                      </div>
                    ) : (
                    <img
                      src={image.imageUrl}
                      alt={image.caption || ""}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={() => {
                        setBrokenImages((prev) => new Set(prev).add(image.id));
                      }}
                    />
                    )}

                    {/* Overlay controls */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-start justify-between p-2 opacity-0 group-hover:opacity-100">
                      {/* Drag handle */}
                      <div className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg bg-black/60 text-white/80">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="flex gap-1">
                        {/* Set as cover */}
                        <button
                          onClick={() => handleSetCover(image.imageUrl)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isCover
                              ? "bg-[#C9A84C] text-black"
                              : "bg-black/60 text-white/80 hover:text-[#C9A84C]"
                          }`}
                          title="הגדר כתמונת כיסוי"
                        >
                          <Star className={`w-4 h-4 ${isCover ? "fill-current" : ""}`} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteImage(image.id)}
                          className="p-1.5 rounded-lg bg-black/60 text-white/80 hover:text-red-400 transition-colors"
                          title="מחק תמונה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Cover badge */}
                    {isCover && (
                      <div className="absolute bottom-2 right-2 bg-[#C9A84C] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                        כיסוי
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <div className="p-3">
                    <input
                      type="text"
                      placeholder="כיתוב..."
                      value={image.caption || ""}
                      onChange={(e) => handleCaptionUpdate(image.id, e.target.value)}
                      className="w-full bg-transparent border-b border-white/10 text-white/80 text-xs pb-1 focus:border-[#C9A84C]/50 focus:outline-none placeholder:text-white/25 transition-colors"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------- FORM VIEW ----------
  if (view === "form") {
    return (
      <div className="space-y-6 animate-in" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setView("list")}
            className="flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#e0c068] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            חזרה לרשימה
          </button>
          <h2 className="text-lg font-bold text-white">
            {editingProject ? "עריכת פרויקט" : "פרויקט חדש"}
          </h2>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-[#1a1a2e] rounded-xl border border-[#C9A84C]/20 p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">שם הפרויקט *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="למשל: שיפוץ דירה ברחוב הרצל"
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:border-[#C9A84C]/50 focus:outline-none transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">תיאור</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="תארי את הפרויקט..."
              rows={4}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:border-[#C9A84C]/50 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">קטגוריה</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-[#C9A84C]/50 focus:outline-none transition-colors appearance-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Style Tags */}
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">סגנונות</label>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((tag) => {
                const selected = form.styleTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleStyleTag(tag)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                      ${selected
                        ? "bg-[#C9A84C]/20 border-[#C9A84C] text-[#C9A84C]"
                        : "bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white/70"
                      }
                    `}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cover Image URL */}
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">תמונת כיסוי (URL)</label>
            <input
              type="url"
              value={form.coverImageUrl}
              onChange={(e) => {
                const raw = e.target.value;
                setCoverImageWarning(false);
                if (raw.trim() && isGooglePhotosShareLink(raw.trim())) {
                  setCoverImageWarning(true);
                  setForm({ ...form, coverImageUrl: raw });
                } else {
                  const converted = raw.trim() ? convertImageUrl(raw.trim()) : raw;
                  setForm({ ...form, coverImageUrl: converted });
                }
              }}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:border-[#C9A84C]/50 focus:outline-none transition-colors"
              dir="ltr"
            />
            {coverImageWarning && (
              <div className="mt-2 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 text-orange-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  לינק שיתוף של Google Photos לא נתמך ישירות. לחצי ימני על התמונה
                  → &apos;העתק כתובת תמונה&apos; לקבלת לינק ישיר, או העלי ל-Google
                  Drive ושתפי משם.
                </span>
              </div>
            )}
            {form.coverImageUrl && !coverImageWarning && isValidUrl(form.coverImageUrl) && (
              <div className="mt-3 rounded-xl overflow-hidden border border-white/10 max-w-xs">
                <img
                  src={form.coverImageUrl}
                  alt="תצוגה מקדימה"
                  className="w-full h-40 object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </div>

          {/* Status Toggle */}
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">סטטוס</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, status: "public" })}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all
                  ${form.status === "public"
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                    : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                  }
                `}
              >
                <Eye className="w-4 h-4" />
                ציבורי
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, status: "private" })}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all
                  ${form.status === "private"
                    ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                    : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                  }
                `}
              >
                <EyeOff className="w-4 h-4" />
                פרטי
              </button>
            </div>
          </div>

          {/* Supplier Linking */}
          {suppliers.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-[#C9A84C]" />
                ספקים מקושרים
              </label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {suppliers.map((sup) => {
                  const linked = form.suppliers.includes(sup.id);
                  return (
                    <button
                      key={sup.id}
                      type="button"
                      onClick={() => toggleSupplier(sup.id)}
                      className={`
                        px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                        ${linked
                          ? "bg-[#C9A84C]/20 border-[#C9A84C] text-[#C9A84C]"
                          : "bg-white/5 border-white/10 text-white/50 hover:border-white/30 hover:text-white/70"
                        }
                      `}
                    >
                      {sup.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setView("list")}
            className="px-5 py-3 rounded-xl text-sm text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-[#C9A84C] text-black text-sm font-bold rounded-xl hover:bg-[#e0c068] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "שומר..." : editingProject ? "עדכן פרויקט" : "צור פרויקט"}
          </button>
        </div>
      </div>
    );
  }

  // ---------- LIST VIEW ----------
  return (
    <div className="space-y-6 animate-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-[#C9A84C]" />
            תיק עבודות
          </h2>
          <p className="text-sm text-white/40 mt-1">{projects.length} פרויקטים</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-black text-sm font-bold rounded-xl hover:bg-[#e0c068] transition-colors"
        >
          <Plus className="w-4 h-4" />
          הוסף פרויקט
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-white/40" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#1a1a2e] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#C9A84C]/50 focus:outline-none transition-colors appearance-none"
          >
            <option value="all">כל הקטגוריות</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <button
          onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a2e] border border-white/10 rounded-xl text-white/60 text-xs hover:border-white/20 transition-colors"
        >
          <SortDesc className={`w-3.5 h-3.5 transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`} />
          {sortDir === "desc" ? "חדש לישן" : "ישן לחדש"}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#1a1a2e] rounded-xl border border-white/5 h-64 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#1a1a2e] rounded-xl border border-white/5 p-16 text-center">
          <FolderKanban className="w-12 h-12 text-white/15 mx-auto mb-4" />
          <p className="text-white/40 text-sm mb-4">
            {projects.length === 0 ? "אין פרויקטים עדיין" : "אין תוצאות לסינון הנוכחי"}
          </p>
          {projects.length === 0 && (
            <button
              onClick={openCreate}
              className="px-5 py-2.5 bg-[#C9A84C] text-black text-sm font-bold rounded-xl hover:bg-[#e0c068] transition-colors"
            >
              צרי את הפרויקט הראשון
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="bg-[#1a1a2e] rounded-xl border border-white/10 overflow-hidden group hover:border-[#C9A84C]/30 transition-all"
              style={{ borderRadius: "12px" }}
            >
              {/* Cover Image */}
              <div
                className="relative h-48 bg-gradient-to-br from-[#1a1a2e] to-[#0a0a0a] overflow-hidden cursor-pointer"
                onClick={() => openImages(project)}
              >
                {project.coverImageUrl ? (
                  <img
                    src={project.coverImageUrl}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImagePlus className="w-10 h-10 text-white/10" />
                  </div>
                )}

                {/* Overlay badges */}
                <div className="absolute top-3 right-3 flex gap-2">
                  {/* Category */}
                  <span className="px-2.5 py-1 bg-[#C9A84C]/90 text-black text-[10px] font-bold rounded-full">
                    {getCategoryLabel(project.category)}
                  </span>
                  {/* Status */}
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                    project.status === "public"
                      ? "bg-emerald-500/90 text-white"
                      : "bg-white/20 text-white/80 backdrop-blur-sm"
                  }`}>
                    {project.status === "public" ? "ציבורי" : "פרטי"}
                  </span>
                </div>

                {/* Image count */}
                {project.images && project.images.length > 0 && (
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full">
                    {project.images.length} תמונות
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-sm font-bold text-white mb-2 line-clamp-1">{project.title}</h3>

                {/* Style tags */}
                {project.styleTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {project.styleTags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] text-[10px] rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {project.styleTags.length > 4 && (
                      <span className="px-2 py-0.5 text-white/30 text-[10px]">
                        +{project.styleTags.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] text-white/30">
                    {new Date(project.createdAt).toLocaleDateString("he-IL")}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openImages(project)}
                      className="p-2 rounded-lg text-white/40 hover:text-[#C9A84C] hover:bg-white/5 transition-colors"
                      title="תמונות"
                    >
                      <ImagePlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEdit(project)}
                      className="p-2 rounded-lg text-white/40 hover:text-[#C9A84C] hover:bg-white/5 transition-colors"
                      title="ערוך"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
