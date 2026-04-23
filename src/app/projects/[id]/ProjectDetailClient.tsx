"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  ImageIcon,
  Sparkles,
  Share2,
  Heart,
  Ruler,
  Users,
  DollarSign,
  Maximize2,
  MessageCircle,
  LayoutTemplate,
  Hammer,
  KeyRound,
  Send,
} from "lucide-react";
import BeforeAfterSlider, {
  type BeforeAfterPair,
} from "@/components/gallery/BeforeAfterSlider";

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
  crmSettings?: {
    logoUrl: string | null;
    companyName: string | null;
    processDurations?: {
      initialCall?: string;
      initialSketch?: string;
      executionSupport?: string;
      handoff?: string;
    } | null;
  } | null;
};

export type PublicProject = {
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

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0);
  return parts[0].charAt(0) + parts[parts.length - 1].charAt(0);
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
        className="absolute top-4 left-4 z-10 p-2.5 rounded-full bg-white/95 hover:bg-white text-text transition-colors shadow-lg"
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
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/95 hover:bg-white text-text transition-colors shadow-lg"
          aria-label="הקודם"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
      {index < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/95 hover:bg-white text-text transition-colors shadow-lg"
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

// ===== MAIN CLIENT =====
export default function ProjectDetailClient({
  initialProject,
}: {
  initialProject: PublicProject;
}) {
  const [project] = useState<PublicProject>(initialProject);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const handleShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    const shareData = {
      title: project?.title || "פרויקט",
      text: project?.title || "",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* user cancelled */
    }
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      }
    } catch {
      /* ignore */
    }
  }, [project]);

  // Pair "לפני"/"אחרי" captions by order of appearance.
  const beforeAfterPairs: BeforeAfterPair[] = useMemo(() => {
    const befores: ProjectImage[] = [];
    const afters: ProjectImage[] = [];
    for (const img of project.images) {
      const cap = (img.caption || "").trim();
      if (/^לפני(\s|:)/.test(cap) || cap === "לפני") befores.push(img);
      else if (/^אחרי(\s|:)/.test(cap) || cap === "אחרי") afters.push(img);
    }
    const count = Math.min(befores.length, afters.length);
    const out: BeforeAfterPair[] = [];
    for (let i = 0; i < count; i++) {
      out.push({
        beforeUrl: befores[i].imageUrl,
        afterUrl: afters[i].imageUrl,
        beforeCaption: befores[i].caption,
        afterCaption: afters[i].caption,
      });
    }
    return out;
  }, [project.images]);

  const descParagraphs = (project.description || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const leadParagraph = descParagraphs[0] || "";
  const restParagraphs = descParagraphs.slice(1);

  const categoryLabel = CATEGORIES[project.category] || project.category;
  const projectYear = new Date(project.createdAt).getFullYear();
  const isFeatured =
    project.status === "published" || project.status === "featured";
  const firstName = project.designer.fullName.trim().split(/\s+/)[0] || project.designer.fullName;

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Lightbox */}
      {lightboxIndex !== null && project.images.length > 0 && (
        <Lightbox
          images={project.images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {shareToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] bg-black/90 text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg">
          הקישור הועתק
        </div>
      )}

      {/* ========= SIMPLE TOP ========= */}
      <div className="max-w-[1240px] mx-auto px-6 pt-6 flex items-center justify-between">
        <Link
          href={`/projects?designer=${project.designer.id}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] text-text-secondary hover:bg-bg-surface hover:text-text rounded-lg transition-colors"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          חזרה לתיק העבודות
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] text-text-secondary hover:bg-bg-surface hover:text-text rounded-lg transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            שתף
          </button>
          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            aria-label="הוסף למועדפים"
            aria-pressed={liked}
            className="inline-flex items-center justify-center px-3 py-2 text-text-secondary hover:bg-bg-surface hover:text-text rounded-lg transition-colors"
          >
            <Heart
              className={`w-3.5 h-3.5 ${liked ? "fill-gold text-gold" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-6">
        {/* ========= PROJECT HEADER ========= */}
        <div className="pt-6 pb-6">
          {/* Breadcrumbs */}
          <nav className="text-[12.5px] text-text-muted mb-4 flex items-center gap-2 flex-wrap">
            <Link
              href={`/projects?designer=${project.designer.id}`}
              className="hover:text-gold-dim transition-colors"
            >
              {project.designer.fullName}
            </Link>
            <ChevronLeft className="w-3.5 h-3.5" />
            <Link
              href={`/projects?designer=${project.designer.id}`}
              className="hover:text-gold-dim transition-colors"
            >
              תיק עבודות
            </Link>
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>{project.title}</span>
          </nav>

          {isFeatured && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-gold-dim font-semibold tracking-[0.8px] uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              פרויקט נבחר
            </span>
          )}

          <h1
            className="font-heading font-medium m-0 mb-3.5 max-w-[820px] leading-[1.1]"
            style={{
              fontSize: "clamp(34px, 4.8vw, 52px)",
              letterSpacing: "-1px",
            }}
          >
            {project.title}
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-[22px] gap-y-2 text-[14px] text-text-secondary py-3">
            {project.designer.city && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gold" />
                {project.designer.city}
              </span>
            )}
            {categoryLabel && (
              <span className="inline-flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-gold" />
                {categoryLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gold" />
              {projectYear}
            </span>
            {project.designer.specialization && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-gold" />
                {project.designer.specialization}
              </span>
            )}
            {project.suppliers && project.suppliers.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-gold" />
                {project.suppliers.length} ספקים
              </span>
            )}
          </div>
        </div>

        {/* ========= HERO IMAGE ========= */}
        <div
          className="relative mt-3.5 rounded-[20px] overflow-hidden shadow-lg"
          style={{ aspectRatio: "16/9" }}
        >
          {project.coverImageUrl ? (
            <img
              src={proxyImageUrl(project.coverImageUrl)}
              alt={project.title}
              className="w-full h-full object-cover block"
              loading="lazy"
            />
          ) : project.images[0] ? (
            <img
              src={proxyImageUrl(project.images[0].imageUrl)}
              alt={project.title}
              className="w-full h-full object-cover block"
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: "linear-gradient(135deg, #E8C97A, #8B6914)" }}
            />
          )}
          {project.images.length > 1 && (
            <div className="absolute top-5 right-5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[12px] font-medium text-text">
              <ImageIcon className="w-3.5 h-3.5" />
              {project.images.length} תמונות
            </div>
          )}
        </div>

        {/* ========= DESIGNER PILL (floating) ========= */}
        <div
          className="relative z-10 mx-auto bg-white rounded-2xl shadow-lg border border-border-subtle flex items-center gap-3.5 max-w-[460px]"
          style={{ marginTop: "-40px", padding: "14px 18px" }}
        >
          {project.designer.crmSettings?.logoUrl ? (
            <img
              src={project.designer.crmSettings.logoUrl}
              alt={`לוגו ${project.designer.fullName}`}
              className="w-12 h-12 rounded-full object-cover flex-none"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full grid place-items-center text-white font-heading font-bold text-base flex-none"
              style={{ background: "linear-gradient(135deg, #E8C97A, #8B6914)" }}
            >
              {getInitials(project.designer.fullName)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-heading font-semibold text-[14.5px] truncate">
              {project.designer.fullName}
            </div>
            <div className="text-[12px] text-text-muted flex items-center gap-2 mt-0.5 truncate">
              {project.designer.city && <span>{project.designer.city}</span>}
              {project.designer.specialization && (
                <span className="hidden sm:inline">
                  {project.designer.city ? "· " : ""}
                  {project.designer.specialization}
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/projects?designer=${project.designer.id}`}
            className="btn-outline"
            style={{ padding: "8px 16px", fontSize: "12px" }}
          >
            לפרופיל המלא
          </Link>
        </div>

        {/* ========= BODY GRID: story + specs ========= */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-[50px] pt-[50px] pb-10 items-start">
          {/* LEFT: story */}
          <div className="text-text-secondary text-base leading-[1.85]">
            {leadParagraph ? (
              <p
                className="text-[19px] leading-[1.65] text-text font-normal mb-6 pr-4"
                style={{ borderRight: "3px solid var(--gold)" }}
              >
                {leadParagraph}
              </p>
            ) : (
              <p
                className="text-[19px] leading-[1.65] text-text font-normal mb-6 pr-4"
                style={{ borderRight: "3px solid var(--gold)" }}
              >
                {project.title}
              </p>
            )}

            <h3 className="font-heading font-medium text-2xl mt-8 mb-3 tracking-[-0.3px] text-text">
              על הפרויקט
            </h3>
            {restParagraphs.length > 0 ? (
              restParagraphs.map((para, i) => (
                <p key={i} className="mb-[18px]">
                  {para}
                </p>
              ))
            ) : (
              <p className="mb-[18px]">
                {project.description
                  ? ""
                  : "פרטים נוספים על הפרויקט יתווספו בקרוב."}
              </p>
            )}

            {project.styleTags.length > 0 && (
              <>
                <h3 className="font-heading font-medium text-2xl mt-8 mb-3 tracking-[-0.3px] text-text">
                  הגישה העיצובית
                </h3>
                <p className="mb-[18px]">
                  הפרויקט משלב{" "}
                  {project.styleTags.map((tag, i) => (
                    <span key={tag}>
                      <strong className="text-text font-semibold">{tag}</strong>
                      {i < project.styleTags.length - 1 ? ", " : ""}
                    </span>
                  ))}
                  {" "}ליצירת חלל הרמוני ומזמין.
                </p>
              </>
            )}
          </div>

          {/* RIGHT: spec aside */}
          <aside className="lg:sticky lg:top-6 space-y-4">
            <div className="bg-white border border-border-subtle rounded-[14px] p-5 shadow-xs">
              <h4 className="font-heading font-semibold text-[12px] text-gold-dim tracking-[0.8px] uppercase mb-3.5 mt-0">
                פרטי הפרויקט
              </h4>
              <div className="flex justify-between items-start py-2.5 border-b border-border-subtle text-[13.5px]">
                <span className="text-text-muted text-[12.5px]">סוג</span>
                <span className="font-medium text-left">{categoryLabel}</span>
              </div>
              {project.designer.city && (
                <div className="flex justify-between items-start py-2.5 border-b border-border-subtle text-[13.5px]">
                  <span className="text-text-muted text-[12.5px]">מיקום</span>
                  <span className="font-medium text-left">{project.designer.city}</span>
                </div>
              )}
              <div className="flex justify-between items-start py-2.5 border-b border-border-subtle text-[13.5px]">
                <span className="text-text-muted text-[12.5px]">שנה</span>
                <span className="font-medium text-left">{projectYear}</span>
              </div>
              {project.designer.specialization && (
                <div className="flex justify-between items-start py-2.5 border-b border-border-subtle text-[13.5px]">
                  <span className="text-text-muted text-[12.5px]">סגנון</span>
                  <span className="font-medium text-left">
                    {project.designer.specialization}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-start py-2.5 text-[13.5px]">
                <span className="text-text-muted text-[12.5px]">תמונות</span>
                <span className="font-medium text-left">{project.images.length}</span>
              </div>

              {project.styleTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3.5 pt-3.5 border-t border-border-subtle">
                  {project.styleTags.map((tag, i) => (
                    <span
                      key={tag}
                      className={i === 0 ? "badge badge-gold" : "badge badge-gray"}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {project.suppliers && project.suppliers.length > 0 && (
              <div
                className="border rounded-[14px] p-5 shadow-xs"
                style={{
                  background: "linear-gradient(135deg, #FBF7ED, #F5ECD3)",
                  borderColor: "var(--border-gold)",
                }}
              >
                <h4
                  className="font-heading font-semibold text-[12px] tracking-[0.8px] uppercase mb-3.5 mt-0"
                  style={{ color: "#5A4608" }}
                >
                  ספקים בפרויקט
                </h4>
                {project.suppliers.map((sup, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-start py-2.5 text-[13.5px]"
                    style={{
                      borderBottom:
                        i < project.suppliers.length - 1
                          ? "1px solid rgba(139,101,8,.15)"
                          : "none",
                    }}
                  >
                    <span className="text-text-muted text-[12.5px]">ספק</span>
                    <span className="font-medium text-left">{sup}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>

        {/* ========= BEFORE / AFTER ========= */}
        {beforeAfterPairs.length > 0 && (
          <section className="my-8">
            <div className="flex items-baseline justify-between flex-wrap gap-2.5 mb-4">
              <h3 className="font-heading font-medium text-[28px] tracking-[-0.4px] m-0 text-text">
                לפני / אחרי
              </h3>
              <span className="text-[13px] text-text-muted">
                {beforeAfterPairs.length} {beforeAfterPairs.length === 1 ? "השוואה" : "השוואות"} · גררו את הידית
              </span>
            </div>
            <BeforeAfterSlider pairs={beforeAfterPairs} />
          </section>
        )}

        {/* ========= GALLERY MASONRY ========= */}
        {project.images.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between flex-wrap gap-2.5 mt-7 mb-4">
              <h3 className="font-heading font-medium text-[28px] tracking-[-0.4px] m-0 text-text">
                הגלריה המלאה
              </h3>
              <span className="text-[13px] text-text-muted">
                {project.images.length} תמונות · לחצו להגדלה
              </span>
            </div>

            <div
              className="gap-3.5"
              style={{ columns: 3, columnGap: "14px" }}
            >
              <style>{`
                @media (max-width: 900px) { .masonry-gallery { columns: 2 !important; } }
                @media (max-width: 550px) { .masonry-gallery { columns: 1 !important; } }
              `}</style>
              <div className="masonry-gallery" style={{ columns: "inherit", columnGap: "inherit" }}>
                {project.images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setLightboxIndex(index)}
                    className="relative w-full group rounded-xl overflow-hidden border border-border-subtle hover:shadow-md hover:-translate-y-0.5 transition-all bg-bg-surface cursor-zoom-in shadow-xs"
                    style={{
                      breakInside: "avoid",
                      marginBottom: "14px",
                      display: "block",
                    }}
                  >
                    <img
                      src={proxyImageUrl(image.imageUrl)}
                      alt={image.caption || ""}
                      className="w-full h-auto block"
                      loading="lazy"
                    />
                    <div className="absolute top-2.5 left-2.5 w-[30px] h-[30px] rounded-lg bg-white/90 backdrop-blur grid place-items-center text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                    {image.caption && (
                      <div className="absolute bottom-0 right-0 left-0 bg-gradient-to-t from-black/75 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[11px] text-white line-clamp-1">{image.caption}</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========= PROCESS STRIP ========= */}
        <div
          className="my-12 p-7 rounded-2xl border grid grid-cols-2 md:grid-cols-4 gap-5 text-center"
          style={{
            background: "linear-gradient(135deg, #FBF7ED, #F5ECD3)",
            borderColor: "var(--border-gold)",
          }}
        >
          <div>
            <div className="w-12 h-12 mx-auto mb-2.5 rounded-xl bg-white grid place-items-center text-gold-dim">
              <MessageCircle className="w-[22px] h-[22px]" />
            </div>
            <div className="font-heading font-semibold text-[13px] mb-0.5">שיחה ראשונית</div>
            <div className="text-[11.5px] text-text-muted">{project.designer.crmSettings?.processDurations?.initialCall || "30 דקות · חינם"}</div>
          </div>
          <div>
            <div className="w-12 h-12 mx-auto mb-2.5 rounded-xl bg-white grid place-items-center text-gold-dim">
              <LayoutTemplate className="w-[22px] h-[22px]" />
            </div>
            <div className="font-heading font-semibold text-[13px] mb-0.5">סקיצה ראשונית</div>
            <div className="text-[11.5px] text-text-muted">{project.designer.crmSettings?.processDurations?.initialSketch || "שבועיים"}</div>
          </div>
          <div>
            <div className="w-12 h-12 mx-auto mb-2.5 rounded-xl bg-white grid place-items-center text-gold-dim">
              <Hammer className="w-[22px] h-[22px]" />
            </div>
            <div className="font-heading font-semibold text-[13px] mb-0.5">ליווי ביצוע</div>
            <div className="text-[11.5px] text-text-muted">{project.designer.crmSettings?.processDurations?.executionSupport || "3-9 חודשים"}</div>
          </div>
          <div>
            <div className="w-12 h-12 mx-auto mb-2.5 rounded-xl bg-white grid place-items-center text-gold-dim">
              <KeyRound className="w-[22px] h-[22px]" />
            </div>
            <div className="font-heading font-semibold text-[13px] mb-0.5">מפתחות</div>
            <div className="text-[11.5px] text-text-muted">{project.designer.crmSettings?.processDurations?.handoff || "עם חיוך"}</div>
          </div>
        </div>
      </div>

      {/* ========= NEXT PROJECTS ========= */}
      <section className="bg-bg-card border-t border-border-subtle mt-15 py-12">
        <div className="max-w-[1240px] mx-auto px-6">
          <div className="text-center mb-5">
            <div className="text-[11.5px] text-gold-dim font-semibold tracking-[1px] uppercase">
              המשך לחפור
            </div>
            <h3 className="font-heading font-medium text-[28px] m-0 mt-1">
              פרויקטים נוספים של {firstName}
            </h3>
          </div>
          <div className="grid grid-cols-1 gap-5">
            <Link
              href={`/projects?designer=${project.designer.id}`}
              className="relative rounded-[14px] overflow-hidden border border-border-subtle shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all block"
              style={{ aspectRatio: "3/1" }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(135deg, #FBF7ED, #8B6914)",
                }}
              />
              <div
                className="absolute inset-0 flex flex-col justify-center px-9 text-white"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,.55), rgba(0,0,0,.1))",
                }}
              >
                <div className="text-[11.5px] opacity-85 tracking-[1px] uppercase mb-1">
                  פרויקטים
                </div>
                <h4 className="font-heading font-medium text-2xl m-0 tracking-[-0.3px]">
                  צפי בתיק העבודות המלא
                </h4>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ========= FLOATING CTA ========= */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-white border border-border-subtle rounded-full shadow-lg"
        style={{
          padding: "8px 10px 8px 18px",
          maxWidth: "calc(100vw - 40px)",
        }}
      >
        <span className="text-[13px] text-text-secondary hidden sm:inline">
          אהבת את הפרויקט?{" "}
          <strong className="text-text font-heading font-semibold">
            שלחי הודעה ל{firstName}
          </strong>
        </span>
        <Link
          href={`/projects?designer=${project.designer.id}`}
          className="btn-gold"
          style={{ padding: "9px 20px", fontSize: "12.5px" }}
        >
          <Send className="w-3.5 h-3.5" />
          שלחי פנייה
        </Link>
      </div>

      {/* ========= FOOTER ========= */}
      <footer className="py-7 border-t border-border-subtle text-text-muted text-[12.5px] text-center bg-bg-card">
        <Link href="/" className="text-gold-dim hover:text-gold transition-colors">
          ← חזרה לאינדקס
        </Link>
        {" · "}
        זירת האדריכלות · {" "}
        <Link
          href={`/projects?designer=${project.designer.id}`}
          className="hover:text-gold-dim transition-colors"
        >
          לתיק העבודות של {firstName}
        </Link>
      </footer>
    </div>
  );
}
