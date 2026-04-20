"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Plus, X, Trash2, Pencil, Star, GripVertical,
  Eye, EyeOff, Save, Search, LayoutGrid, List,
  ChevronLeft, AlertCircle, FolderOpen, Link2,
  Upload, Share2, Copy, ExternalLink, CreditCard,
  MessageCircle, Image as ImageIcon, Heart, TrendingUp,
  CheckCircle2, Clock, MapPin, Ruler, Calendar, Settings,
  ArrowRight, Sparkles, ImagePlus,
} from "lucide-react";
import FileUpload, { type UploadedFile } from "@/components/ui/FileUpload";
import ImageEditor from "@/components/ui/ImageEditor";
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

// Cover gradient variants (cover-a .. cover-f)
const COVER_GRADIENTS = [
  "linear-gradient(135deg,#E8C97A 0%,#C9A84C 100%)",
  "linear-gradient(135deg,#F5ECD3 0%,#D4A437 100%)",
  "linear-gradient(135deg,#D1D0CB 0%,#374151 100%)",
  "linear-gradient(135deg,#FBF7ED 0%,#8B6914 100%)",
  "linear-gradient(160deg,#EEEDEA 0%,#C9A84C 100%)",
  "linear-gradient(135deg,#F5F4F0 0%,#6B7280 100%)",
];

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
  if (url.includes("drive.google.com")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  if (url.includes("instagram.com") || url.includes("cdninstagram.com")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  if (url.includes("photos.app.goo.gl") || url.includes("photos.google.com")) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  if (url.includes("lh3.googleusercontent.com")) {
    return url;
  }
  if (url.includes("dropbox.com")) {
    return url.replace("dl=0", "dl=1").replace("www.dropbox.com", "dl.dropboxusercontent.com");
  }
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

  // New UI-only state for toolbar in list view
  const [searchText, setSearchText] = useState("");
  const [statusChip, setStatusChip] = useState<"all" | "public" | "private" | "working">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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

  // Image editor state (feature #9)
  const [editingImage, setEditingImage] = useState<ProjectImage | null>(null);
  const [editingImageFile, setEditingImageFile] = useState<File | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);

  // Toast state (feature #13)
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2000);
  }, []);

  // Per-card share feedback
  const [sharedCardId, setSharedCardId] = useState<string | null>(null);
  // Per-card publish toggle in-flight
  const [togglingId, setTogglingId] = useState<string | null>(null);

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

  const handleDuplicate = (project: Project) => {
    // Open create form prefilled from this project
    setEditingProject(null);
    setForm({
      title: `${project.title} (עותק)`,
      description: project.description || "",
      category: project.category,
      styleTags: [...project.styleTags],
      coverImageUrl: project.coverImageUrl || "",
      status: "private",
      suppliers: [...project.suppliers],
    });
    setError("");
    setView("form");
  };

  const handleShare = (project: Project) => {
    if (!designerId) return;
    const url = typeof window !== "undefined"
      ? `${window.location.origin}/projects?designer=${designerId}`
      : `/projects?designer=${designerId}`;
    try {
      navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (e) {
      console.error("Share link error", e);
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
    setProjectImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, caption } : img))
    );
  };

  // ===== IMAGE EDIT (crop/rotate/flip/zoom) — feature #9 =====
  const openImageEditor = useCallback(async (image: ProjectImage) => {
    try {
      // Fetch the image as a Blob so we can hand it to ImageEditor as a File
      const fetchUrl = image.imageUrl.startsWith("data:")
        ? image.imageUrl
        : image.imageUrl;
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error("שגיאה בטעינת התמונה לעריכה");
      const blob = await res.blob();
      const filename = `image-${image.id}.${(blob.type.split("/")[1] || "jpg").split("+")[0]}`;
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      setEditingImage(image);
      setEditingImageFile(file);
    } catch (e) {
      console.error("Open image editor error", e);
      showToast("לא ניתן לפתוח את התמונה לעריכה");
    }
  }, [showToast]);

  const handleEditorCancel = useCallback(() => {
    setEditingImage(null);
    setEditingImageFile(null);
    setEditorSaving(false);
  }, []);

  const handleEditorSave = useCallback(async (editedBlob: Blob, filename: string) => {
    if (!selectedProject || !editingImage) return;
    setEditorSaving(true);
    try {
      // 1) Upload the new image via existing /api/upload endpoint
      const formData = new FormData();
      const newFile = new File([editedBlob], filename, { type: editedBlob.type || "image/jpeg" });
      formData.append("file", newFile);
      formData.append("folder", "portfolio");
      formData.append("category", "image");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || "שגיאה בהעלאת התמונה המעודכנת");
      }
      const uploadData = await uploadRes.json();
      const newUrl: string = uploadData.url;

      const oldImage = editingImage;
      const wasCover = selectedProject.coverImageUrl === oldImage.imageUrl;

      // 2) Create a new image record at the same sortOrder slot
      const createRes = await fetch(`/api/designer/projects/${selectedProject.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: newUrl,
          sortOrder: oldImage.sortOrder,
        }),
      });
      if (!createRes.ok) throw new Error("שגיאה ביצירת התמונה המעודכנת");
      const newImage: ProjectImage = await createRes.json();

      // 3) Delete the old image
      await fetch(`/api/designer/projects/${selectedProject.id}/images`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: oldImage.id }),
      });

      // 4) Swap in local state (preserve order)
      setProjectImages((prev) => prev.map((img) => (img.id === oldImage.id ? { ...newImage, sortOrder: oldImage.sortOrder } : img)));

      // 5) If it was the cover, repoint cover to the new URL
      if (wasCover) {
        try {
          await fetch(`/api/designer/projects/${selectedProject.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ coverImageUrl: newUrl }),
          });
          setSelectedProject({ ...selectedProject, coverImageUrl: newUrl });
        } catch (coverErr) {
          console.error("Cover repoint error", coverErr);
        }
      }

      await fetchProjects();
      showToast("התמונה עודכנה בהצלחה");
      setEditingImage(null);
      setEditingImageFile(null);
    } catch (e) {
      console.error("Edit image error", e);
      showToast(e instanceof Error ? e.message : "שגיאה בעדכון התמונה");
    } finally {
      setEditorSaving(false);
    }
  }, [selectedProject, editingImage, fetchProjects, showToast]);

  // ===== PUBLISH TOGGLE — feature #14 =====
  const handleTogglePublish = useCallback(async (project: Project) => {
    if (togglingId) return;
    setTogglingId(project.id);
    try {
      const nextStatus = project.status === "public" ? "private" : "public";
      const res = await fetch(`/api/designer/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("שגיאה בעדכון סטטוס הפרויקט");
      await fetchProjects();
      showToast(nextStatus === "public" ? "הפרויקט פורסם" : "הפרויקט עבר לטיוטה");
    } catch (e) {
      console.error("Toggle publish error", e);
      showToast(e instanceof Error ? e.message : "שגיאה בעדכון סטטוס");
    } finally {
      setTogglingId(null);
    }
  }, [togglingId, fetchProjects, showToast]);

  // ===== SHARE PER-PROJECT LINK — feature #13 =====
  const handleShareProjectLink = useCallback((project: Project) => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/projects/${project.id}`;
    try {
      navigator.clipboard.writeText(url);
      setSharedCardId(project.id);
      setTimeout(() => setSharedCardId(null), 2000);
      showToast("הקישור הועתק");
    } catch (e) {
      console.error("Share link error", e);
      showToast("לא ניתן להעתיק את הקישור");
    }
  }, [showToast]);

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

  const handleImageUrlChange = (url: string) => {
    setGooglePhotosWarning(false);
    setMultiAddCount(null);

    const trimmed = url.trim();

    const urls = extractUrls(trimmed);
    if (urls.length > 1) {
      handleMultipleUrls(urls);
      return;
    }

    setNewImageUrl(trimmed);
    setImagePreviewError(false);
    setImagePreviewValid(false);
    if (trimmed && (isValidUrl(trimmed) || trimmed.includes("drive.google.com") || trimmed.includes("instagram.com") || trimmed.includes("photos.google.com") || trimmed.includes("photos.app.goo.gl"))) {
      setImagePreviewValid(true);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      setUploadError("הקובץ חייב להיות תמונה (jpg, png, webp)");
      return;
    }

    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(g(gdr, "גודל הקובץ מוגבל ל-2MB. נסה לכווץ את התמונה.", "גודל הקובץ מוגבל ל-2MB. נסי לכווץ את התמונה."));
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("שגיאה בקריאת הקובץ"));
        reader.readAsDataURL(file);
      });

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

  const handleMultipleUrls = async (urls: string[]) => {
    if (!selectedProject) return;

    const validUrls: string[] = [];
    for (const rawUrl of urls) {
      if (isGooglePhotosShareLink(rawUrl)) {
        continue;
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

  // ===== KPI VALUES =====
  const totalImages = useMemo(
    () => projects.reduce((acc, p) => acc + (p.images?.length || 0), 0),
    [projects]
  );
  const publicCount = useMemo(
    () => projects.filter((p) => p.status === "public").length,
    [projects]
  );
  const privateCount = useMemo(
    () => projects.filter((p) => p.status === "private").length,
    [projects]
  );

  // ===== FILTER & SORT =====
  const filtered = projects
    .filter((p) => categoryFilter === "all" || p.category === categoryFilter)
    .filter((p) => {
      if (statusChip === "all") return true;
      if (statusChip === "public") return p.status === "public";
      if (statusChip === "private") return p.status === "private";
      if (statusChip === "working") return p.status !== "public" && p.status !== "private";
      return true;
    })
    .filter((p) => {
      if (!searchText.trim()) return true;
      const q = searchText.trim().toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        p.styleTags.some((t) => t.toLowerCase().includes(q))
      );
    })
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
            className="flex items-center gap-2 text-sm text-gold hover:text-gold-dim transition-colors font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            חזרה לרשימה
          </button>
          <h2 className="font-heading text-xl text-text">
            תמונות — {selectedProject.title}
          </h2>
        </div>

        {/* Add Image — split into Main + Secondary (feature #11) */}
        <div className="card-static space-y-5">
          {/* Limits info */}
          <div className="text-xs text-text-muted flex items-center gap-4 flex-wrap">
            <span>
              תמונות: {projectImages.length} / {MAX_IMAGES_PER_PROJECT}
              {projectImages.length >= MAX_IMAGES_PER_PROJECT && (
                <span className="text-red-600 mr-1">(הגעת למקסימום)</span>
              )}
            </span>
          </div>

          {/* Main image (cover) section */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
              <Star className="w-4 h-4 text-gold fill-current" />
              העלאת תמונה ראשית
            </h3>
            <p className="text-xs text-text-muted mb-3">
              התמונה הזו תוצג כתמונת כיסוי של הפרויקט.
            </p>
            <FileUpload
              category="image"
              folder="portfolio"
              currentUrl={selectedProject.coverImageUrl || undefined}
              label="העלאת תמונה ראשית"
              skipEditor={false}
              maxSize={MAX_TOTAL_SIZE_PER_PROJECT}
              onUpload={async (file: UploadedFile) => {
                if (!selectedProject) return;
                try {
                  // 1) Save as a regular project image (if room), so it also appears in the gallery
                  if (projectImages.length < MAX_IMAGES_PER_PROJECT) {
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
                    }
                  }
                  // 2) Set as cover
                  await fetch(`/api/designer/projects/${selectedProject.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ coverImageUrl: file.url }),
                  });
                  setSelectedProject({ ...selectedProject, coverImageUrl: file.url });
                  await fetchProjects();
                  showToast("התמונה הראשית עודכנה");
                } catch (e) {
                  console.error("Set main image error", e);
                }
              }}
              onError={(err: string) => alert(err)}
            />
          </div>

          <div className="h-px bg-border" />

          {/* Secondary images section */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-2 flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-gold" />
              תמונות נוספות (משניות)
            </h3>
            <p className="text-xs text-text-muted mb-3">
              ניתן להעלות מספר תמונות יחד. כל התמונות ישמרו אוטומטית.
            </p>

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
        </div>

        {/* No cover image notice */}
        {!selectedProject.coverImageUrl && projectImages.length > 0 && (
          <div
            className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 border bg-gold-50 border-border text-gold-dim"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            לא נבחרה תמונה ראשית — התמונה הראשונה תוצג כשער
          </div>
        )}

        {/* Image Grid */}
        {projectImages.length === 0 ? (
          <div className="bg-bg-surface rounded-2xl border-2 border-dashed border-border p-12 text-center">
            <ImagePlus className="w-10 h-10 text-text-faint mx-auto mb-3" />
            <p className="text-text-muted text-sm">אין תמונות עדיין</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                    relative aspect-square bg-bg-surface rounded-[10px] border overflow-hidden group cursor-grab transition-all
                    ${dragOverIndex === index ? "border-gold scale-[1.02] shadow-md" : "border-border"}
                    ${dragIndex === index ? "opacity-50" : ""}
                    hover:shadow-md hover:border-gold
                  `}
                >
                  {brokenImages.has(image.id) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 gap-2 p-3">
                      <span className="text-2xl">&#10060;</span>
                      <span className="text-red-700 text-xs font-medium text-center">הלינק לא תקין</span>
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
                      className="w-full h-full object-cover block"
                      loading="lazy"
                      onError={() => {
                        setBrokenImages((prev) => new Set(prev).add(image.id));
                      }}
                    />
                  )}

                  {/* Cover flag */}
                  {isCover && (
                    <span
                      className="absolute top-2 right-2 bg-gold text-white text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide z-[2]"
                    >
                      ראשית
                    </span>
                  )}

                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/80 group-hover:backdrop-blur-sm transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageEditor(image);
                      }}
                      className="w-9 h-9 rounded-[9px] grid place-items-center bg-white shadow-xs text-text-secondary hover:text-gold-dim transition-colors"
                      title="ערוך תמונה (חיתוך / סיבוב)"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const caption = prompt("כיתוב לתמונה", image.caption || "");
                        if (caption !== null) handleCaptionUpdate(image.id, caption);
                      }}
                      className="w-9 h-9 rounded-[9px] grid place-items-center bg-white shadow-xs text-text-secondary hover:text-gold-dim transition-colors"
                      title="ערוך כיתוב"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSetCover(image.imageUrl)}
                      className={`w-9 h-9 rounded-[9px] grid place-items-center shadow-xs transition-colors ${
                        isCover ? "bg-gold text-white" : "bg-white text-text-secondary hover:text-gold-dim"
                      }`}
                      title="הגדר כתמונה ראשית"
                    >
                      <Star className={`w-4 h-4 ${isCover ? "fill-current" : ""}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="w-9 h-9 rounded-[9px] grid place-items-center bg-white shadow-xs text-text-secondary hover:text-red-700 transition-colors"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Persist / publish actions (features #10, #14) */}
        <div className="flex justify-between gap-3 flex-wrap items-center pt-4">
          <div className="flex gap-2 items-center">
            {selectedProject.status === "public" ? (
              <button
                type="button"
                onClick={() => handleTogglePublish(selectedProject)}
                disabled={togglingId === selectedProject.id}
                className="btn-outline disabled:opacity-50"
                title="הפוך לטיוטה"
              >
                <EyeOff className="w-4 h-4" />
                הפוך לטיוטה
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleTogglePublish(selectedProject)}
                disabled={togglingId === selectedProject.id}
                className="btn-gold disabled:opacity-50"
                title="פרסם"
              >
                <Eye className="w-4 h-4" />
                פרסם
              </button>
            )}
            <button
              type="button"
              onClick={() => handleShareProjectLink(selectedProject)}
              className="btn-outline"
              title="העתק קישור לפרויקט"
            >
              <Share2 className="w-4 h-4" />
              {sharedCardId === selectedProject.id ? "הועתק!" : "שתף לינק"}
            </button>
          </div>

          <button
            type="button"
            onClick={async () => {
              // Re-save project metadata + refresh to persist any pending changes (feature #10)
              try {
                const res = await fetch(`/api/designer/projects/${selectedProject.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    title: selectedProject.title,
                    description: selectedProject.description,
                    category: selectedProject.category,
                    styleTags: selectedProject.styleTags,
                    coverImageUrl: selectedProject.coverImageUrl,
                    status: selectedProject.status,
                    suppliers: selectedProject.suppliers,
                  }),
                });
                if (!res.ok) throw new Error("שגיאה בשמירה");
                await fetchProjects();
                showToast("הפרויקט נשמר");
              } catch (e) {
                console.error("Save project error", e);
                showToast(e instanceof Error ? e.message : "שגיאה בשמירה");
              }
            }}
            className="btn-gold"
            title="שמור פרויקט"
          >
            <Save className="w-4 h-4" />
            שמור פרויקט
          </button>
        </div>

        {/* Image Editor modal */}
        {editingImage && editingImageFile && (
          <ImageEditor
            file={editingImageFile}
            onSave={handleEditorSave}
            onCancel={handleEditorCancel}
          />
        )}

        {/* Toast */}
        {toastMsg && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-text text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium z-[10000]"
            dir="rtl"
          >
            {toastMsg}
          </div>
        )}
        {editorSaving && !editingImage && (
          <div className="fixed inset-0 bg-black/40 z-[9998] grid place-items-center">
            <div className="bg-white rounded-xl px-6 py-4 text-sm">שומר...</div>
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
            className="flex items-center gap-2 text-sm text-gold hover:text-gold-dim transition-colors font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            חזרה לרשימה
          </button>
          <h2 className="font-heading text-xl text-text">
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
            <label className="form-label">שם הפרויקט *</label>
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
            <label className="form-label">תיאור</label>
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
            <label className="form-label">קטגוריה</label>
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
            <label className="form-label">סגנונות</label>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAGS.map((tag) => {
                const selected = form.styleTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleStyleTag(tag)}
                    className={
                      selected
                        ? "badge badge-gold cursor-pointer"
                        : "badge badge-gray cursor-pointer"
                    }
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <label className="form-label">תמונת כיסוי</label>
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

          {/* Status */}
          <div>
            <label className="form-label">סטטוס</label>
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setForm({ ...form, status: "public" })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  form.status === "public"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                    : "bg-bg-surface border-border text-text-muted hover:text-text-secondary"
                }`}
              >
                <Eye className="w-4 h-4" />
                ציבורי
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, status: "private" })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  form.status === "private"
                    ? "bg-orange-50 border-orange-300 text-orange-700"
                    : "bg-bg-surface border-border text-text-muted hover:text-text-secondary"
                }`}
              >
                <EyeOff className="w-4 h-4" />
                פרטי
              </button>
            </div>
          </div>

          {/* Suppliers */}
          {suppliers.length > 0 && (
            <div>
              <label className="form-label flex items-center gap-2">
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
                      className={
                        linked
                          ? "badge badge-gold cursor-pointer"
                          : "badge badge-gray cursor-pointer"
                      }
                    >
                      {sup.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Save buttons */}
        <div className="flex justify-between gap-3 flex-wrap items-center">
          {/* Publish toggle (feature #14) — only for existing projects */}
          <div>
            {editingProject && (
              form.status === "public" ? (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: "private" })}
                  className="btn-outline"
                  title="הפוך לטיוטה"
                >
                  <EyeOff className="w-4 h-4" />
                  הפוך לטיוטה
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, status: "public" })}
                  className="btn-gold"
                  title="פרסם פרויקט"
                >
                  <Eye className="w-4 h-4" />
                  פרסם
                </button>
              )
            )}
          </div>

          <div className="flex gap-3">
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
              {saving ? "שומר..." : editingProject ? "שמור פרויקט" : "צור פרויקט"}
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-text text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium z-[10000]"
            dir="rtl"
          >
            {toastMsg}
          </div>
        )}
      </div>
    );
  }

  // ---------- LIST VIEW ----------
  const publicUrl = designerId && typeof window !== "undefined"
    ? `${window.location.origin}/projects?designer=${designerId}`
    : designerId
      ? `/projects?designer=${designerId}`
      : null;

  return (
    <div className="space-y-0 animate-in" dir="rtl">
      {/* ===== PAGE HEADER ===== */}
      <header className="pt-6 pb-4">
        {/* Crumbs */}
        <nav className="flex items-center gap-2 text-xs text-text-muted mb-3">
          <span className="hover:text-gold-dim transition-colors">האזור שלי</span>
          <ChevronLeft className="w-3 h-3" />
          <span>תיק עבודות</span>
        </nav>

        {/* Title row */}
        <div className="flex items-end justify-between gap-5 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-text mb-1.5">
              תיק העבודות שלי
            </h1>
            <p className="text-text-muted text-sm m-0">
              נהלי את הפרויקטים והתמונות שלך — גררי לסידור, העלי בהמוני.
            </p>
          </div>
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-bg-surface text-text-secondary text-[12.5px] border border-border transition-all hover:bg-white hover:border-gold hover:text-gold-dim"
            >
              <Eye className="w-3.5 h-3.5" />
              צפייה כלקוח
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* ===== KPI STRIP ===== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-7">
          <div className="bg-bg-card border border-border rounded-[14px] p-[18px_20px] relative">
            <div className="float-left w-[38px] h-[38px] rounded-[10px] bg-gold-50 text-gold-dim grid place-items-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="text-[11.5px] text-text-muted font-medium uppercase tracking-wider">פרויקטים</div>
            <div className="font-heading text-2xl font-bold mt-1 text-text">{projects.length}</div>
            <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 font-medium">
              <TrendingUp className="w-3 h-3" /> {MAX_PROJECTS_PER_DESIGNER - projects.length} פנויים
            </span>
          </div>
          <div className="bg-bg-card border border-border rounded-[14px] p-[18px_20px] relative">
            <div className="float-left w-[38px] h-[38px] rounded-[10px] bg-gold-50 text-gold-dim grid place-items-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="text-[11.5px] text-text-muted font-medium uppercase tracking-wider">תמונות</div>
            <div className="font-heading text-2xl font-bold mt-1 text-text">{totalImages}</div>
            <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1 font-medium">
              <TrendingUp className="w-3 h-3" /> סה"כ
            </span>
          </div>
          <div className="bg-bg-card border border-border rounded-[14px] p-[18px_20px] relative">
            <div className="float-left w-[38px] h-[38px] rounded-[10px] bg-gold-50 text-gold-dim grid place-items-center">
              <Eye className="w-4 h-4" />
            </div>
            <div className="text-[11.5px] text-text-muted font-medium uppercase tracking-wider">צפיות פרופיל</div>
            <div className="font-heading text-2xl font-bold mt-1 text-text">—</div>
            <span className="inline-flex items-center gap-0.5 text-[11px] text-text-muted bg-bg-surface px-1.5 py-0.5 rounded-full mt-1 font-medium">
              בקרוב
            </span>
          </div>
          <div className="bg-bg-card border border-border rounded-[14px] p-[18px_20px] relative">
            <div className="float-left w-[38px] h-[38px] rounded-[10px] bg-gold-50 text-gold-dim grid place-items-center">
              <Heart className="w-4 h-4" />
            </div>
            <div className="text-[11.5px] text-text-muted font-medium uppercase tracking-wider">לייקים</div>
            <div className="font-heading text-2xl font-bold mt-1 text-text">—</div>
            <span className="inline-flex items-center gap-0.5 text-[11px] text-text-muted bg-bg-surface px-1.5 py-0.5 rounded-full mt-1 font-medium">
              בקרוב
            </span>
          </div>
        </div>
      </header>

      {/* Cross-link to business card */}
      {onSwitchToCard && (
        <button
          onClick={onSwitchToCard}
          className="flex items-center gap-2 text-sm text-gold hover:text-gold-dim transition-colors font-semibold mt-4"
        >
          <CreditCard className="w-4 h-4" />
          צפה בכרטיס הביקור שלי
        </button>
      )}

      {/* ===== TOOLBAR ===== */}
      <div className="bg-bg-card border border-border rounded-[14px] px-[18px] py-[14px] my-5 flex items-center gap-3 flex-wrap shadow-xs">
        <div className="flex items-center gap-2.5 flex-1 min-w-[260px] flex-wrap">
          {/* Search */}
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="חיפוש בפרויקטים…"
              className="input-field w-full pr-10"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
          </div>

          {/* Chips */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setStatusChip("all")}
              className={`px-3.5 py-1.5 text-xs rounded-full font-medium transition-all border ${
                statusChip === "all"
                  ? "bg-gold-50 text-gold-dim border-border"
                  : "bg-bg-surface text-text-secondary border-transparent hover:bg-bg-surface-2"
              }`}
            >
              הכל · {projects.length}
            </button>
            <button
              onClick={() => setStatusChip("public")}
              className={`px-3.5 py-1.5 text-xs rounded-full font-medium transition-all border ${
                statusChip === "public"
                  ? "bg-gold-50 text-gold-dim border-border"
                  : "bg-bg-surface text-text-secondary border-transparent hover:bg-bg-surface-2"
              }`}
            >
              פורסם · {publicCount}
            </button>
            <button
              onClick={() => setStatusChip("private")}
              className={`px-3.5 py-1.5 text-xs rounded-full font-medium transition-all border ${
                statusChip === "private"
                  ? "bg-gold-50 text-gold-dim border-border"
                  : "bg-bg-surface text-text-secondary border-transparent hover:bg-bg-surface-2"
              }`}
            >
              טיוטה · {privateCount}
            </button>
            <button
              onClick={() => setStatusChip("working")}
              className={`px-3.5 py-1.5 text-xs rounded-full font-medium transition-all border ${
                statusChip === "working"
                  ? "bg-gold-50 text-gold-dim border-border"
                  : "bg-bg-surface text-text-secondary border-transparent hover:bg-bg-surface-2"
              }`}
            >
              בעבודה · {projects.length - publicCount - privateCount}
            </button>
          </div>
        </div>

        <div className="flex gap-2.5 items-center flex-wrap">
          {/* Sort select */}
          <select
            value={sortDir}
            onChange={(e) => setSortDir(e.target.value as "desc" | "asc")}
            className="select-field w-40"
          >
            <option value="desc">מיון: חדש ביותר</option>
            <option value="asc">מיון: ישן ביותר</option>
          </select>

          {/* View toggle */}
          <div className="flex bg-bg-surface rounded-lg p-[3px] gap-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                viewMode === "grid" ? "bg-white text-text shadow-xs" : "text-text-muted"
              }`}
              title="גריד"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1.5 rounded-md text-xs transition-all ${
                viewMode === "list" ? "bg-white text-text shadow-xs" : "text-text-muted"
              }`}
              title="רשימה"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <button onClick={openCreate} className="btn-gold">
            <Plus className="w-3.5 h-3.5" />
            פרויקט חדש
          </button>
        </div>
      </div>

      {/* Public Portfolio Link (keep existing functionality) */}
      {publicUrl && projects.some((p) => p.status === "public") && (
        <div
          className="rounded-2xl border p-5 mb-5 bg-gold-50 border-border"
        >
          <div className="flex items-center gap-2 mb-3">
            <ExternalLink className="w-4 h-4 text-gold-dim" />
            <h3 className="text-sm font-semibold text-gold-dim">לינק ציבורי לתיק העבודות</h3>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-border">
            <span className="text-xs text-text-secondary truncate flex-1" dir="ltr">
              {publicUrl}
            </span>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={() => {
                navigator.clipboard.writeText(publicUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-border text-gold-dim text-xs font-semibold rounded-full hover:bg-gold-50 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {linkCopied ? "הועתק!" : "העתק לינק"}
            </button>
            <button
              onClick={() => {
                const text = encodeURIComponent(`צפו בתיק העבודות שלי: ${publicUrl}`);
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

      {/* ===== PROJECTS GRID ===== */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-bg-surface rounded-[14px] border border-border h-72 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 px-6 bg-bg-card border-[1.5px] border-dashed border-border rounded-[14px]">
          <div className="w-16 h-16 bg-bg-surface rounded-2xl grid place-items-center text-text-faint mx-auto mb-4">
            <FolderOpen className="w-8 h-8" />
          </div>
          <h3 className="font-heading text-lg font-semibold mb-1.5">
            {projects.length === 0 ? "אין פרויקטים עדיין" : "אין תוצאות לסינון הנוכחי"}
          </h3>
          <p className="text-text-muted text-sm mb-4">
            {projects.length === 0
              ? "התחילי בפרויקט הראשון שלך"
              : "נסי לשנות את הסינון"}
          </p>
          {projects.length === 0 && (
            <button onClick={openCreate} className="btn-gold">
              <Plus className="w-4 h-4" />
              {g(gdr, "צור את הפרויקט הראשון", "צרי את הפרויקט הראשון")}
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              : "grid grid-cols-1 gap-4"
          }
        >
          {filtered.map((project, idx) => {
            const imageCount = project.images?.length || 0;
            const gradient = COVER_GRADIENTS[idx % COVER_GRADIENTS.length];
            const isPublic = project.status === "public";
            const isPrivate = project.status === "private";
            return (
              <div
                key={project.id}
                className="bg-bg-card border border-border rounded-[14px] overflow-hidden shadow-xs transition-all relative group hover:shadow-md hover:border-gold hover:-translate-y-0.5"
              >
                {/* Cover area */}
                <div
                  className="relative aspect-[4/3] overflow-hidden cursor-pointer"
                  style={
                    project.coverImageUrl
                      ? undefined
                      : { background: gradient }
                  }
                  onClick={() => openImages(project)}
                >
                  {project.coverImageUrl ? (
                    <img
                      src={project.coverImageUrl}
                      alt={project.title}
                      className="w-full h-full object-cover block"
                      loading="lazy"
                    />
                  ) : null}

                  {/* Drag handle */}
                  <div
                    className="absolute top-2.5 left-2.5 w-[30px] h-[30px] bg-white/90 backdrop-blur rounded-lg grid place-items-center text-text-muted cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
                    title="גרור"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  {/* Status badge */}
                  <div className="absolute top-2.5 right-2.5">
                    {isPublic ? (
                      <span className="badge badge-green">
                        <CheckCircle2 className="w-3 h-3" /> פורסם
                      </span>
                    ) : isPrivate ? (
                      <span className="badge badge-gray">
                        <Pencil className="w-3 h-3" /> טיוטה
                      </span>
                    ) : (
                      <span className="badge badge-gold">
                        <Clock className="w-3 h-3" /> בעבודה
                      </span>
                    )}
                  </div>

                  {/* Actions (hover reveal) */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex gap-1.5 justify-start opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(project); }}
                      className="w-[34px] h-[34px] rounded-[9px] bg-white/95 backdrop-blur grid place-items-center text-text-secondary shadow-xs hover:bg-white hover:text-gold-dim hover:scale-[1.06] transition-all"
                      title="ערוך"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDuplicate(project); }}
                      className="w-[34px] h-[34px] rounded-[9px] bg-white/95 backdrop-blur grid place-items-center text-text-secondary shadow-xs hover:bg-white hover:text-gold-dim hover:scale-[1.06] transition-all"
                      title="שכפל"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShareProjectLink(project); }}
                      className="w-[34px] h-[34px] rounded-[9px] bg-white/95 backdrop-blur grid place-items-center text-text-secondary shadow-xs hover:bg-white hover:text-gold-dim hover:scale-[1.06] transition-all"
                      title="שתף לינק"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                      className="w-[34px] h-[34px] rounded-[9px] bg-white/95 backdrop-blur grid place-items-center text-text-secondary shadow-xs hover:bg-white hover:text-red-700 hover:scale-[1.06] transition-all"
                      title="מחק"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="px-[18px] pt-4 pb-[18px]">
                  <h3 className="font-heading text-base font-semibold leading-tight tracking-tight mb-1.5">
                    {project.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" /> {imageCount} תמונות
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {getCategoryLabel(project.category)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(project.createdAt).toLocaleDateString("he-IL")}
                    </span>
                  </div>

                  {/* Style tags */}
                  {project.styleTags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mt-2.5">
                      {project.styleTags.slice(0, 4).map((tag, i) => (
                        <span
                          key={tag}
                          className={i === 0 ? "badge badge-gold" : "badge badge-gray"}
                        >
                          {tag}
                        </span>
                      ))}
                      {project.styleTags.length > 4 && (
                        <span className="text-[10px] text-text-muted">
                          +{project.styleTags.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Publish toggle + share link (features #13, #14) */}
                  <div className="flex items-center gap-2 mt-3.5 flex-wrap">
                    {isPublic ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTogglePublish(project); }}
                        disabled={togglingId === project.id}
                        className="btn-outline !py-1.5 !px-3 !text-xs disabled:opacity-50"
                        title="הפוך לטיוטה"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        {togglingId === project.id ? "…" : "הפוך לטיוטה"}
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTogglePublish(project); }}
                        disabled={togglingId === project.id}
                        className="btn-gold !py-1.5 !px-3 !text-xs disabled:opacity-50"
                        title="פרסם פרויקט"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {togglingId === project.id ? "…" : "פרסם"}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleShareProjectLink(project); }}
                      className="btn-outline !py-1.5 !px-3 !text-xs"
                      title="העתק קישור לפרויקט"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {sharedCardId === project.id ? "הועתק!" : "שתף לינק"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== TIPS PANEL ===== */}
      <div
        className="mt-8 p-5 rounded-[14px] border border-border flex gap-4.5 items-start"
        style={{ background: "linear-gradient(135deg,#FBF7ED 0%,#F5ECD3 100%)" }}
      >
        <div className="w-11 h-11 rounded-xl bg-white grid place-items-center text-gold-dim flex-none">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-heading text-[15px] font-semibold mb-1.5" style={{ color: "#5A4608" }}>
            טיפים לתיק עבודות שמושך לקוחות
          </h4>
          <ul className="mt-1.5 pr-5 text-text-secondary text-[13px] leading-[1.8] list-disc">
            <li>תמונה ראשית חדה ומוארת — היא מה שהלקוח רואה ראשון</li>
            <li>6–12 תמונות לפרויקט · יותר מדי מעייף, פחות מדי לא נותן מספיק</li>
            <li>תאורי פרויקט קצרים · סיפור הלקוח &gt; מפרט טכני</li>
            <li>הוסיפי תמונות "לפני ואחרי" — שמעלה פי 3 את שיעור הפניות</li>
          </ul>
        </div>
      </div>

      {/* Toast (global) */}
      {toastMsg && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-text text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium z-[10000]"
          dir="rtl"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
