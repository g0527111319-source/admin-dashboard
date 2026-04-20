"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { ArrowLeft, X, ChevronLeft, ChevronRight, MapPin, Building2, User, Calendar, ImageIcon, Sparkles } from "lucide-react";

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
  crmSettings?: { logoUrl: string | null; companyName: string | null } | null;
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

function proxyImageUrl(url: string): string {
  if (
    url.includes("drive.google.com") ||
    url.includes("instagram.com") ||
    url.includes("cdninstagram.com") ||
    url.includes("photos.app.goo.gl") ||
    url.includes("photos.google.com")
  ) {
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

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
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 p-2.5 rounded-full bg-white/95 hover:bg-white text-text-primary transition-colors shadow-lg"
        aria-label="סגור"
      >
        <X className="w-5 h-5" />
      </button>

      <div
        className="relative max-w-5xl max-h-[85vh] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={proxyImageUrl(current.imageUrl)}
          alt={current.caption || ""}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          loading="lazy"
        />

        {current.caption && (
          <p className="absolute bottom-4 right-4 left-4 text-center text-sm text-white bg-black/65 backdrop-blur-md rounded-lg px-4 py-2 border border-white/10">
            {current.caption}
          </p>
        )}
      </div>

      {/* Nav arrows */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/95 hover:bg-white text-text-primary transition-colors shadow-lg"
          aria-label="הקודם"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
      {index < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/95 hover:bg-white text-text-primary transition-colors shadow-lg"
          aria-label="הבא"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white bg-black/65 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-white/10 font-semibold">
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
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-bg text-text-primary flex flex-col items-center justify-center gap-4">
        <p className="text-text-muted">הפרויקט לא נמצא</p>
        <Link
          href="/projects"
          className="text-sm text-[color:var(--gold-dim)] hover:text-gold flex items-center gap-2 transition-colors font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          חזרה לגלריה
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      {/* Lightbox */}
      {lightboxIndex !== null && project.images.length > 0 && (
        <Lightbox
          images={project.images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-bg/85 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <Link
            href="/projects"
            className="flex items-center gap-2 text-sm text-[color:var(--gold-dim)] hover:text-gold transition-colors font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            חזרה לגלריה
          </Link>
        </div>
      </header>

      {/* Project Header Strip */}
      <section className="px-4 sm:px-6 pt-10 pb-6 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[color:var(--gold-dim)] mb-3 font-semibold inline-flex items-center gap-2">
            <Sparkles className="w-3 h-3" /> פרויקט נבחר
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="badge-gold">
              {CATEGORIES[project.category] || project.category}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-semibold tracking-tight leading-[1.1] text-text-primary mb-3">
            {project.title}
          </h1>
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-text-secondary">
            {project.designer.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gold" />
                {project.designer.city}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gold" />
              {new Date(project.createdAt).toLocaleDateString("he-IL")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-gold" />
              {project.images.length} תמונות
            </span>
            {project.designer.specialization && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gold" />
                {project.designer.specialization}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Hero - Cover Image */}
      <section className="relative px-4 sm:px-6 pt-8">
        <div className="max-w-7xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-lg border border-border-subtle bg-bg-card">
            {project.coverImageUrl ? (
              <img
                src={proxyImageUrl(project.coverImageUrl)}
                alt={project.title}
                className="w-full h-auto block max-h-[80vh] object-contain mx-auto"
                loading="lazy"
              />
            ) : project.images[0] ? (
              <img
                src={proxyImageUrl(project.images[0].imageUrl)}
                alt={project.title}
                className="w-full h-auto block max-h-[80vh] object-contain mx-auto"
                loading="lazy"
              />
            ) : (
              <div className="w-full py-24 flex items-center justify-center bg-gradient-to-br from-[color:var(--gold-50)] to-bg-surface">
                <span className="text-[color:var(--gold-dim)]/30 text-8xl font-heading">{project.title.charAt(0)}</span>
              </div>
            )}
            {/* Image count tag */}
            {project.images.length > 0 && (
              <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm text-text-secondary text-xs font-semibold rounded-full border border-border-subtle shadow-sm">
                <ImageIcon className="w-3 h-3" />
                1 מתוך {project.images.length} תמונות
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Designer Pill — floating */}
      <section className="px-4 sm:px-6 -mt-8 relative z-10">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-md border border-border-subtle px-4 py-3">
          <Link
            href={`/projects?designer=${project.designer.id}`}
            className="flex items-center gap-3 group"
          >
            {/* Avatar/Logo */}
            {project.designer.crmSettings?.logoUrl ? (
              <img
                src={project.designer.crmSettings.logoUrl}
                alt={`לוגו ${project.designer.fullName}`}
                className="w-11 h-11 rounded-full object-cover border-2 border-[color:var(--border-gold)]"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[color:var(--gold-50)] to-white flex items-center justify-center border-2 border-[color:var(--border-gold)]">
                <span className="text-lg font-heading font-bold text-[color:var(--gold-dim)]">
                  {project.designer.fullName.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                {project.designer.fullName}
              </p>
              {project.designer.city && (
                <p className="text-xs text-text-muted mt-0.5 truncate">
                  {project.designer.city}
                  {project.designer.specialization && ` · ${project.designer.specialization}`}
                </p>
              )}
            </div>
            <span className="text-xs text-[color:var(--gold-dim)] group-hover:text-gold transition-colors font-semibold whitespace-nowrap">
              לפרופיל המלא ←
            </span>
          </Link>
        </div>
      </section>

      {/* Content */}
      <section className="py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10">
            {/* Main Content */}
            <div className="space-y-10">
              {/* Description */}
              {project.description && (
                <div>
                  <h2 className="text-xl font-heading font-semibold text-text-primary mb-4">אודות הפרויקט</h2>
                  <div
                    className="text-text-secondary text-[15px] leading-relaxed whitespace-pre-line border-r-[3px] pr-4"
                    style={{ borderColor: "var(--gold)" }}
                  >
                    {project.description}
                  </div>
                </div>
              )}

              {/* Image Gallery */}
              {project.images.length > 0 && (
                <div>
                  <h2 className="text-xl font-heading font-semibold text-text-primary mb-5">גלריית תמונות</h2>
                  <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                    {project.images.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setLightboxIndex(index)}
                        className="relative group rounded-xl overflow-hidden border border-border-subtle hover:border-[color:var(--border-gold)] transition-all block w-full break-inside-avoid bg-white shadow-xs hover:shadow-md cursor-zoom-in"
                        style={{ borderRadius: "12px" }}
                      >
                        <img
                          src={proxyImageUrl(image.imageUrl)}
                          alt={image.caption || ""}
                          className="w-full h-auto block group-hover:scale-[1.03] transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-white/10 transition-colors" />
                        {image.caption && (
                          <div className="absolute bottom-0 right-0 left-0 bg-gradient-to-t from-black/75 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-[11px] text-white line-clamp-1">{image.caption}</p>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
              {/* Style Tags */}
              {project.styleTags.length > 0 && (
                <div className="card-static">
                  <h3 className="text-[11px] tracking-[0.2em] uppercase text-[color:var(--gold-dim)] mb-3 font-semibold">
                    סגנונות
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.styleTags.map((tag) => (
                      <span
                        key={tag}
                        className="badge-gray"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suppliers */}
              {project.suppliers && project.suppliers.length > 0 && (
                <div className="card-static">
                  <h3 className="text-[11px] tracking-[0.2em] uppercase text-[color:var(--gold-dim)] mb-3 font-semibold">
                    ספקים בפרויקט
                  </h3>
                  <p className="text-sm text-text-secondary">
                    {project.suppliers.length} ספקים משתתפים
                  </p>
                </div>
              )}

              {/* Project Info */}
              <div className="card-static">
                <h3 className="text-[11px] tracking-[0.2em] uppercase text-[color:var(--gold-dim)] mb-4 font-semibold">
                  פרטי הפרויקט
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm items-center border-b border-border-subtle pb-2.5">
                    <span className="text-text-muted">קטגוריה</span>
                    <span className="text-text-primary font-medium">{CATEGORIES[project.category] || project.category}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center border-b border-border-subtle pb-2.5">
                    <span className="text-text-muted">תאריך</span>
                    <span className="text-text-primary font-medium">{new Date(project.createdAt).toLocaleDateString("he-IL")}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-text-muted">תמונות</span>
                    <span className="text-text-primary font-medium">{project.images.length}</span>
                  </div>
                </div>
              </div>

              {/* Designer spotlight */}
              <div
                className="rounded-2xl p-5 border"
                style={{
                  background:
                    "linear-gradient(145deg, #FFFBEF 0%, #F5ECD3 100%)",
                  borderColor: "var(--border-gold)",
                  boxShadow: "var(--shadow-gold)",
                }}
              >
                <h3 className="text-[11px] tracking-[0.2em] uppercase text-[color:var(--gold-dim)] mb-3 font-semibold">
                  המעצבת
                </h3>
                <p className="text-base font-heading font-semibold text-text-primary mb-1">
                  {project.designer.fullName}
                </p>
                {project.designer.specialization && (
                  <p className="text-xs text-text-secondary mb-3">
                    {project.designer.specialization}
                  </p>
                )}
                <Link
                  href={`/projects?designer=${project.designer.id}`}
                  className="btn-outline w-full justify-center"
                >
                  תיק העבודות המלא
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-bg-card py-8 px-4 border-t border-border-subtle">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <p className="text-sm text-text-secondary">זירת האדריכלות</p>
          </div>
          <p className="text-text-muted text-sm">&copy; {new Date().getFullYear()} כל הזכויות שמורות</p>
        </div>
      </footer>
    </div>
  );
}
