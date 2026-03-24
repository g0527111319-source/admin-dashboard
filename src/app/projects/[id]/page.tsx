"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { ArrowLeft, X, ChevronLeft, ChevronRight, MapPin, Building2, User } from "lucide-react";

type ProjectImage = {
  id: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
};

type Designer = {
  id: string;
  fullName: string;
  city: string | null;
  area: string | null;
  specialization: string | null;
  instagram: string | null;
  website: string | null;
};

type PublicProject = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  styleTags: string[];
  coverImageUrl: string | null;
  status: string;
  suppliers: string[];
  createdAt: string;
  designer: Designer;
  images: ProjectImage[];
};

const CATEGORIES: Record<string, string> = {
  apartment: "דירה",
  house: "בית פרטי",
  office: "משרד",
  commercial: "מסחרי",
  other: "אחר",
};

// ===== LIGHTBOX =====
function Lightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: ProjectImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const current = images[index];

  const goNext = useCallback(() => {
    if (index < images.length - 1) setIndex(index + 1);
  }, [index, images.length]);

  const goPrev = useCallback(() => {
    if (index > 0) setIndex(index - 1);
  }, [index]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goPrev(); // RTL
      if (e.key === "ArrowLeft") goNext(); // RTL
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goNext, goPrev]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div
        className="relative max-w-5xl max-h-[85vh] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.imageUrl}
          alt={current.caption || ""}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
          loading="lazy"
        />

        {current.caption && (
          <p className="absolute bottom-4 right-4 left-4 text-center text-sm text-white/80 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
            {current.caption}
          </p>
        )}
      </div>

      {/* Nav arrows */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
      {index < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/50 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function ProjectPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [project, setProject] = useState<PublicProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!projectId) return;
    async function load() {
      try {
        const res = await fetch(`/api/public/projects/${projectId}`);
        if (res.ok) {
          setProject(await res.json());
        }
      } catch (e) {
        console.error("Failed to load project", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-white/40">הפרויקט לא נמצא</p>
        <Link
          href="/projects"
          className="text-sm text-[#C9A84C] hover:text-[#e0c068] flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          חזרה לגלריה
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Lightbox */}
      {lightboxIndex !== null && project.images.length > 0 && (
        <Lightbox
          images={project.images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" variant="dark" />
          </Link>
          <Link
            href="/projects"
            className="flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#e0c068] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            חזרה לגלריה
          </Link>
        </div>
      </header>

      {/* Hero - Cover Image */}
      <section className="relative">
        <div className="relative h-[50vh] sm:h-[60vh] bg-[#1a1a2e]">
          {project.coverImageUrl ? (
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : project.images[0] ? (
            <img
              src={project.images[0].imageUrl}
              alt={project.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#0a0a0a]">
              <span className="text-white/10 text-8xl font-heading">{project.title.charAt(0)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />

          {/* Title overlay */}
          <div className="absolute bottom-0 right-0 left-0 p-6 sm:p-10">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-[#C9A84C]/90 text-black text-xs font-bold rounded-full">
                  {CATEGORIES[project.category] || project.category}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-bold">
                {project.title}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* Designer Info Bar */}
      <section className="border-b border-white/5 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center gap-4">
            {/* Avatar/Initials */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A84C]/30 to-[#C9A84C]/10 flex items-center justify-center border-2 border-[#C9A84C]/40">
              <span className="text-lg font-heading font-bold text-[#C9A84C]">
                {project.designer.fullName.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#C9A84C]" />
                {project.designer.fullName}
              </p>
              <div className="flex items-center gap-3 mt-1">
                {project.designer.city && (
                  <span className="text-xs text-white/40 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {project.designer.city}
                  </span>
                )}
                {project.designer.specialization && (
                  <span className="text-xs text-white/40 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {project.designer.specialization}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
            {/* Main Content */}
            <div className="space-y-8">
              {/* Description */}
              {project.description && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-3">אודות הפרויקט</h2>
                  <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">
                    {project.description}
                  </p>
                </div>
              )}

              {/* Image Gallery */}
              {project.images.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-white mb-4">גלריית תמונות</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {project.images.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setLightboxIndex(index)}
                        className="relative group rounded-xl overflow-hidden aspect-square border border-white/5 hover:border-[#C9A84C]/30 transition-all"
                        style={{ borderRadius: "12px" }}
                      >
                        <img
                          src={image.imageUrl}
                          alt={image.caption || ""}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                        {image.caption && (
                          <div className="absolute bottom-0 right-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[10px] text-white/80 line-clamp-1">{image.caption}</p>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Style Tags */}
              {project.styleTags.length > 0 && (
                <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-5" style={{ borderRadius: "12px" }}>
                  <h3 className="text-sm font-bold text-white mb-3">סגנונות</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.styleTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suppliers */}
              {project.suppliers && project.suppliers.length > 0 && (
                <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-5" style={{ borderRadius: "12px" }}>
                  <h3 className="text-sm font-bold text-white mb-3">ספקים בפרויקט</h3>
                  <p className="text-xs text-white/40">
                    {project.suppliers.length} ספקים משתתפים
                  </p>
                </div>
              )}

              {/* Project Info */}
              <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-5" style={{ borderRadius: "12px" }}>
                <h3 className="text-sm font-bold text-white mb-3">פרטי הפרויקט</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">קטגוריה</span>
                    <span className="text-white/80">{CATEGORIES[project.category] || project.category}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">תאריך</span>
                    <span className="text-white/80">{new Date(project.createdAt).toLocaleDateString("he-IL")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">תמונות</span>
                    <span className="text-white/80">{project.images.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050505] py-8 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size="sm" variant="dark" />
            <p className="text-sm text-white/55">זירת האדריכלות</p>
          </div>
          <p className="text-white/35 text-sm">&copy; {new Date().getFullYear()} כל הזכויות שמורות</p>
        </div>
      </footer>
    </div>
  );
}
