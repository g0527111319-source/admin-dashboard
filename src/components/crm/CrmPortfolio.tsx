"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, X, Trash2, Edit3, Star, GripVertical,
  Eye, EyeOff, Filter, SortDesc, ImagePlus, Save,
  ChevronLeft, AlertCircle, FolderKanban, Link2,
  Upload, Loader2, Share2, Copy, ExternalLink, CreditCard,
  MessageCircle,
} from "lucide-react";
import FileUpload, { type UploadedFile } from "@/components/ui/FileUpload";
import { g } from "@/lib/gender";

// ===== PORTFOLIO LIMITS =====
const MAX_IMAGES_PER_PROJECT = 7;
const MAX_TOTAL_SIZE_PER_PROJECT = 20 * 1024 * 1024; // 20MB
const MAX_PROJECTS_PER_DESIGNER = 20;

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
  // Google Drive - use proxy
  if (url.includes("drive.google.com")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  // Instagram - use proxy
  if (url.includes("instagram.com") || url.includes("cdninstagram.com")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  // Google Photos share links - use proxy
  if (url.includes("photos.app.goo.gl") || url.includes("photos.google.com")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  // Google Photos direct lh3 links - already work
  if (url.includes("lh3.googleusercontent.com")) {
    return url;
  }
  // Dropbox links - convert to direct download
  if (url.includes("dropbox.com")) {
    return url.replace("dl=0", "dl=1").replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }
  // OneDrive links - can't easily convert, return as-is
  if (url.includes("1drv.ms") || url.includes("onedrive.live.com")) {
    return url;
  }
  // Direct image URLs - use as-is
  return url;
}

function extractUrls(text: string): string[] {
  return text
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter((line) => line && isValidUrl(line));
}

// ===== COMPONENT =====
interface CrmPortfolioProps {
  onSwitchToCard?: () => void;
  gender?: string;
}

export default function CrmPortfolio({ onSwitchToCard, gender }: CrmPortfolioProps = {}) {
  const gdr = gender || "female";
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<CrmSupplier[]>([]);
  const [designerId, setDesignerId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
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
        if (data.length > 0 && data[0].designerId) {
          setDesignerId(data[0].designerId);
        }
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
    if (projects.length >= MAX_PROJECTS_PER_DESIGNER) {
      alert(`הגעת למקסימום ${MAX_PROJECTS_PER_DESIGNER} פרויקטים. ${g(gdr, "מחק פרויקט קיים כדי להוסיף חדש.", "מחקי פרויקט קיים כדי להוסיף חדש.")}`);
      return;
    }
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
    if (!convertedUrl || (!isValidUrl(convertedUrl) && !convertedUrl.startsWith("/api/"))) {
      setImagePreviewError(true);
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

        // Auto-set as cover if project has no cover image
        if (!selectedProject.coverImageUrl) {
          try {
            await fetch(`/api/designer/projects/${selectedProject.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ coverImageUrl: convertedUrl }),
            });
            setSelectedProject({ ...selectedProject, coverImageUrl: convertedUrl });
          } catch (coverErr) {
            console.error("Auto-set cover error", coverErr);
          }
        }

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

    // Store the original URL (don't convert yet - convert only when displaying/saving)
    setNewImageUrl(trimmed);
    setImagePreviewError(false);
    setImagePreviewValid(false);
    if (trimmed && (isValidUrl(trimmed) || trimmed.includes("drive.google.com") || trimmed.includes("instagram.com") || trimmed.includes("photos.google.com") || trimmed.includes("photos.app.goo.gl"))) {
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
      setUploadError(g(gdr, "גודל הקובץ מוגבל ל-2MB. נסה לכווץ את התמונה.", "גודל הקובץ מוגבל ל-2MB. נסי לכווץ את התמונה."));
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

        // Auto-set as cover if project has no cover image
        if (!selectedProject.coverImageUrl) {
          try {
            await fetch(`/api/designer/projects/${selectedProject.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ coverImageUrl: image.imageUrl }),
            });
            setSelectedProject({ ...selectedProject, coverImageUrl: image.imageUrl });
          } catch (coverErr) {
            console.error("Auto-set cover error", coverErr);
          }
        }

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
            className="flex items-center gap-2 text-sm text-gold hover:text-[color:var(--gold-dim)] transition-colors font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            חזרה לרשימה
          </button>
          <h2 className="font-heading text-xl text-text-primary">
            תמונות — {selectedProject.title}
          </h2>
        </div>

        {/* Add Image */}
        <div className="card-static">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-gold" />
            הוסף תמונה
          </h3>

          {/* Limits info */}
          <div className="mb-3 text-xs text-text-muted flex items-center gap-4 flex-wrap">
            <span>
              תמונות: {projectImages.length} / {MAX_IMAGES_PER_PROJECT}
              {projectImages.length >= MAX_IMAGES_PER_PROJECT && (
                <span className="text-red-600 mr-1">(הגעת למקסימום)</span>
              )}
            </span>
          </div>

          {projectImages.length >= MAX_IMAGES_PER_PROJECT ? (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              הגעת למקסימום {MAX_IMAGES_PER_PROJECT} תמונות לפרויקט. {g(gdr, "מחק תמונה קיימת כדי להוסיף חדשה.", "מחקי תמונה קיימת כדי להוסיף חדשה.")}
            </div>
          ) : (
            <FileUpload
              category="image"
              folder="portfolio"
              label="העלאת תמונות לפרויקט (ניתן לבחור כמה)"
              multiple
              skipEditor
              maxSize={MAX_TOTAL_SIZE_PER_PROJECT}
              onUpload={async (file: UploadedFile) => {
                if (!selectedProject) return;
                try {
                  const res = await fetch(`/api/designer/projects/${selectedProject.id}/images`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      imageUrl: file.url,
                      sortOrder: projectImages.length,
                    }),
                  });
                  if (res.ok) {
                    const image = await res.json();
                    setProjectImages((prev) => [...prev, image]);
                    if (!selectedProject.coverImageUrl) {
                      try {
                        await fetch(`/api/designer/projects/${selectedProject.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ coverImageUrl: file.url }),
                        });
                        setSelectedProject({ ...selectedProject, coverImageUrl: file.url });
                      } catch (coverErr) {
                        console.error("Auto-set cover error", coverErr);
                      }
                    }
                    await fetchProjects();
                  }
                } catch (e) {
                  console.error("Add image error", e);
                }
              }}
              onError={(err: string) => alert(err)}
            />
          )}
        </div>

        {/* No cover image notice */}
        {!selectedProject.coverImageUrl && projectImages.length > 0 && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 border"
            style={{
              background: "var(--gold-50)",
              borderColor: "var(--border-gold)",
              color: "var(--gold-dim)",
            }}
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            לא נבחרה תמונה ראשית — התמונה הראשונה תוצג כשער
          </div>
        )}

        {/* Image Grid */}
        {projectImages.length === 0 ? (
          <div className="bg-bg-surface rounded-2xl border-2 border-dashed border-border-subtle p-12 text-center">
            <ImagePlus className="w-10 h-10 text-text-faint mx-auto mb-3" />
            <p className="text-text-muted text-sm">אין תמונות עדיין</p>
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
                    bg-white rounded-xl border overflow-hidden group relative transition-all shadow-sm
                    ${dragOverIndex === index ? "border-gold scale-[1.02] shadow-md" : "border-border-subtle"}
                    ${dragIndex === index ? "opacity-50" : ""}
                    hover:shadow-md
                  `}
                >
                  {/* Image */}
                  <div className="relative">
                    {brokenImages.has(image.id) ? (
                      <div className="w-full py-8 flex flex-col items-center justify-center bg-red-50 border-2 border-red-200 rounded-t-xl gap-2">
                        <span className="text-2xl">&#10060;</span>
                        <span className="text-red-700 text-xs font-medium">הלינק לא תקין</span>
                        <button
                          onClick={() => handleDeleteImage(image.id)}
                          className="mt-1 px-3 py-1 bg-red-100 border border-red-300 text-red-800 text-xs rounded-lg hover:bg-red-200 transition-colors"
                        >
                          מחק
                        </button>
                      </div>
                    ) : (
                    <img
                      src={image.imageUrl}
                      alt={image.caption || ""}
                      className="w-full h-auto block"
                      loading="lazy"
                      onError={() => {
                        setBrokenImages((prev) => new Set(prev).add(image.id));
                      }}
                    />
                    )}

                    {/* Overlay controls */}
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/70 group-hover:backdrop-blur-sm transition-all flex items-start justify-between p-2 opacity-0 group-hover:opacity-100">
                      {/* Drag handle */}
                      <div className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg bg-white shadow-sm text-text-secondary">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      <div className="flex gap-1">
                        {/* Set as cover */}
                        <button
                          onClick={() => handleSetCover(image.imageUrl)}
                          className={`p-1.5 rounded-lg transition-colors shadow-sm ${
                            isCover
                              ? "bg-gold text-white"
                              : "bg-white text-text-secondary hover:text-gold"
                          }`}
                          title="הגדר כתמונת כיסוי"
                        >
                          <Star className={`w-4 h-4 ${isCover ? "fill-current" : ""}`} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteImage(image.id)}
                          className="p-1.5 rounded-lg bg-white shadow-sm text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="מחק תמונה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Cover badge */}
                    {isCover && (
                      <div className="absolute bottom-2 right-2 badge-gold text-[10px]">
                        <Star className="w-3 h-3 fill-current inline-block ms-0.5" /> כיסוי
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
                      className="w-full bg-transparent border-b border-border-subtle text-text-primary text-xs pb-1 focus:border-gold focus:outline-none placeholder:text-text-faint transition-colors"
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
            className="flex items-center gap-2 text-sm text-gold hover:text-[color:var(--gold-dim)] transition-colors font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            חזרה לרשימה
          </button>
          <h2 className="font-heading text-xl text-text-primary">
            {editingProject ? "עריכת פרויקט" : "פרויקט חדש"}
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="card-static space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">שם הפרויקט *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="למשל: שיפוץ דירה ברחוב הרצל"
              className="input-field w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">תיאור</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={g(gdr, "תאר את הפרויקט...", "תארי את הפרויקט...")}
              rows={4}
              className="input-field w-full resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">קטגוריה</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="select-field w-full"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Style Tags */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">סגנונות</label>
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
                        ? "bg-[color:var(--gold-50)] border-[color:var(--border-gold)] text-[color:var(--gold-dim)]"
                        : "bg-bg-surface border-border-subtle text-text-muted hover:border-border-hover hover:text-text-secondary"
                      }
                    `}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">תמונת כיסוי</label>
            <FileUpload
              category="image"
              folder="portfolio"
              currentUrl={form.coverImageUrl}
              label="העלאת תמונת כיסוי"
              onUpload={(file: UploadedFile) => {
                setCoverImageWarning(false);
                setForm({ ...form, coverImageUrl: file.url });
              }}
              onError={(err: string) => alert(err)}
            />
          </div>

          {/* Status Toggle */}
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">סטטוס</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, status: "public" })}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all
                  ${form.status === "public"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-bg-surface border-border-subtle text-text-muted hover:border-border-hover"
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
                    ? "bg-orange-50 border-orange-300 text-orange-700"
                    : "bg-bg-surface border-border-subtle text-text-muted hover:border-border-hover"
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
              <label className="block text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-gold" />
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
                          ? "bg-[color:var(--gold-50)] border-[color:var(--border-gold)] text-[color:var(--gold-dim)]"
                          : "bg-bg-surface border-border-subtle text-text-muted hover:border-border-hover hover:text-text-secondary"
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
            className="btn-outline"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-gold disabled:opacity-50"
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
          <p className="text-[11px] tracking-[0.3em] uppercase text-[color:var(--gold-dim)] font-semibold mb-1">
            תיק העבודות שלך
          </p>
          <h2 className="font-heading text-2xl text-text-primary flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-gold" />
            תיק עבודות
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {projects.length} / {MAX_PROJECTS_PER_DESIGNER} פרויקטים
            {projects.length >= MAX_PROJECTS_PER_DESIGNER && (
              <span className="text-red-600 mr-1"> (מקסימום)</span>
            )}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="btn-gold"
        >
          <Plus className="w-4 h-4" />
          הוסף פרויקט
        </button>
      </div>

      {/* Cross-link to business card */}
      {onSwitchToCard && (
        <button
          onClick={onSwitchToCard}
          className="flex items-center gap-2 text-sm text-gold hover:text-[color:var(--gold-dim)] transition-colors font-semibold"
        >
          <CreditCard className="w-4 h-4" />
          צפה בכרטיס הביקור שלי
        </button>
      )}

      {/* Public Portfolio Link */}
      {designerId && projects.some((p) => p.status === "public") && (
        <div
          className="rounded-2xl border p-5"
          style={{
            background: "var(--gold-50)",
            borderColor: "var(--border-gold)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <ExternalLink className="w-4 h-4 text-[color:var(--gold-dim)]" />
            <h3 className="text-sm font-semibold text-[color:var(--gold-dim)]">לינק ציבורי לתיק העבודות</h3>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-border-subtle">
            <span className="text-xs text-text-secondary truncate flex-1" dir="ltr">
              {typeof window !== "undefined"
                ? `${window.location.origin}/projects?designer=${designerId}`
                : `/projects?designer=${designerId}`}
            </span>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={() => {
                const url = `${window.location.origin}/projects?designer=${designerId}`;
                navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[color:var(--border-gold)] text-[color:var(--gold-dim)] text-xs font-semibold rounded-full hover:bg-[color:var(--gold-50)] transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {linkCopied ? "הועתק!" : "העתק לינק"}
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/projects?designer=${designerId}`;
                const text = encodeURIComponent(`צפו בתיק העבודות שלי: ${url}`);
                window.open(`https://wa.me/?text=${text}`, "_blank");
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-semibold rounded-full hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              שתף בוואצפ
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="select-field text-xs !py-2"
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
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-border-subtle rounded-xl text-text-secondary text-xs hover:border-border-hover transition-colors"
        >
          <SortDesc className={`w-3.5 h-3.5 transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`} />
          {sortDir === "desc" ? "חדש לישן" : "ישן לחדש"}
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-bg-surface rounded-xl border border-border-subtle h-64 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-bg-surface rounded-2xl border-2 border-dashed border-border-subtle p-16 text-center">
          <FolderKanban className="w-12 h-12 text-text-faint mx-auto mb-4" />
          <p className="text-text-muted text-sm mb-4">
            {projects.length === 0 ? "אין פרויקטים עדיין" : "אין תוצאות לסינון הנוכחי"}
          </p>
          {projects.length === 0 && (
            <button
              onClick={openCreate}
              className="btn-gold"
            >
              <Plus className="w-4 h-4" />
              {g(gdr, "צור את הפרויקט הראשון", "צרי את הפרויקט הראשון")}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-border-subtle overflow-hidden group shadow-xs hover:shadow-md hover:border-border-hover hover:-translate-y-0.5 transition-all"
            >
              {/* Cover Image */}
              <div
                className="relative bg-bg-surface overflow-hidden cursor-pointer"
                onClick={() => openImages(project)}
              >
                {project.coverImageUrl ? (
                  <img
                    src={project.coverImageUrl}
                    alt={project.title}
                    className="w-full h-auto block group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full py-16 flex items-center justify-center">
                    <ImagePlus className="w-10 h-10 text-text-faint" />
                  </div>
                )}

                {/* Overlay badges */}
                <div className="absolute top-3 right-3 flex gap-2">
                  {/* Category */}
                  <span className="badge-gold">
                    {getCategoryLabel(project.category)}
                  </span>
                  {/* Status */}
                  {project.status === "public" ? (
                    <span className="badge-green">
                      <Eye className="w-3 h-3 inline-block ms-0.5" /> ציבורי
                    </span>
                  ) : (
                    <span className="badge-gray">
                      <EyeOff className="w-3 h-3 inline-block ms-0.5" /> פרטי
                    </span>
                  )}
                </div>

                {/* Image count */}
                {project.images && project.images.length > 0 && (
                  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-text-primary text-[10px] font-semibold px-2 py-1 rounded-full border border-border-subtle shadow-sm">
                    {project.images.length} תמונות
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-heading text-lg text-text-primary mb-2 line-clamp-1">{project.title}</h3>

                {/* Style tags */}
                {project.styleTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {project.styleTags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[color:var(--gold-50)] border border-[color:var(--border-gold)] text-[color:var(--gold-dim)] text-[10px] rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {project.styleTags.length > 4 && (
                      <span className="px-2 py-0.5 text-text-muted text-[10px]">
                        +{project.styleTags.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                  <span className="text-[10px] text-text-muted">
                    {new Date(project.createdAt).toLocaleDateString("he-IL")}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openImages(project)}
                      className="p-2 rounded-lg text-text-muted hover:text-gold hover:bg-[color:var(--gold-50)] transition-colors"
                      title="תמונות"
                    >
                      <ImagePlus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEdit(project)}
                      className="p-2 rounded-lg text-text-muted hover:text-gold hover:bg-[color:var(--gold-50)] transition-colors"
                      title="ערוך"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-2 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
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
