"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import Logo from "@/components/ui/Logo";
import {
  Filter,
  ArrowLeft,
  Loader2,
  Sparkles,
  MapPin,
  Users,
  MessageCircle,
  Share2,
  Calendar,
  Phone,
  Send,
  ArrowDown,
} from "lucide-react";
import Reveal, { RevealStagger } from "@/components/motion/Reveal";
import MasonryGallery, { type MasonryItem } from "@/components/gallery/MasonryGallery";
import Lightbox, { type LightboxImage } from "@/components/gallery/Lightbox";
import MagneticButton from "@/components/motion/MagneticButton";
import DepthSection from "@/components/motion/DepthSection";
import { DEPTH_IMAGES } from "@/lib/depth-images";

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
  crmSettings?: {
    logoUrl: string | null;
    companyName: string | null;
    tagline?: string | null;
  } | null;
};

type PublicRecommendation = {
  id: string;
  rating: number | null;
  text: string | null;
  clientName: string | null;
  createdAt: string;
};

type PublicProject = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  styleTags: string[];
  coverImageUrl: string | null;
  status: string;
  createdAt: string;
  designer: Designer;
  images: ProjectImage[];
};

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

function getCategoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

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

export default function ProjectsGalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}

function ProjectsContent() {
  const searchParams = useSearchParams();
  const designerParam = searchParams.get("designer");
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");
  const [designerName, setDesignerName] = useState<string | null>(null);
  const [designerLogo, setDesignerLogo] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Parallax on hero image/gradient — gentle
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, 80]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.35]);

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams();
        if (categoryFilter !== "all") params.set("category", categoryFilter);
        if (styleFilter !== "all") params.set("style", styleFilter);
        if (designerParam) params.set("designer", designerParam);
        const res = await fetch(`/api/public/projects?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          if (designerParam && data.length > 0 && data[0].designer?.fullName) {
            setDesignerName(data[0].designer.fullName);
            setDesignerLogo(data[0].designer?.crmSettings?.logoUrl || null);
          }
        }
      } catch (e) {
        console.error("Failed to load projects", e);
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    load();
  }, [categoryFilter, styleFilter, designerParam]);

  // Map projects → masonry tiles (for the grid) and → lightbox images (full list).
  const masonryItems: MasonryItem[] = useMemo(
    () =>
      projects.map((p) => {
        const src = p.coverImageUrl
          ? proxyImageUrl(p.coverImageUrl)
          : p.images[0]
          ? proxyImageUrl(p.images[0].imageUrl)
          : "";
        return {
          src,
          alt: p.title,
          caption: p.title,
          href: `/projects/${p.id}`,
          badge: getCategoryLabel(p.category),
          overlay: (
            <p className="text-white/85 text-xs mt-1">
              {p.designer.fullName}
              {p.designer.city && ` · ${p.designer.city}`}
            </p>
          ),
        };
      }),
    [projects]
  );

  const lightboxImages: LightboxImage[] = useMemo(
    () =>
      projects.map((p) => ({
        src: p.coverImageUrl
          ? proxyImageUrl(p.coverImageUrl)
          : p.images[0]
          ? proxyImageUrl(p.images[0].imageUrl)
          : "",
        alt: p.title,
        caption: `${p.title} · ${p.designer.fullName}`,
      })),
    [projects]
  );

  // =================================================================
  // DESIGNER PORTFOLIO MODE — full wireframe treatment
  // =================================================================
  if (designerParam) {
    const designer = projects[0]?.designer ?? null;
    const city = designer?.city || designer?.area || null;
    const displayName = designerName || designer?.fullName || "מעצבת פנים";

    return (
      <DesignerPortfolioView
        designerId={designerParam}
        displayName={displayName}
        designerLogo={designerLogo}
        city={city}
        specialization={designer?.specialization ?? null}
        tagline={designer?.crmSettings?.tagline ?? null}
        companyName={designer?.crmSettings?.companyName ?? null}
        projectsCount={projects.length}
        loading={loading}
        projects={projects}
        masonryItems={masonryItems}
        lightboxImages={lightboxImages}
        lightboxIndex={lightboxIndex}
        setLightboxIndex={setLightboxIndex}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
      />
    );
  }

  // =================================================================
  // GENERAL GALLERY MODE — original layout preserved
  // =================================================================
  return (
    <div className="min-h-screen bg-bg text-text-primary overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-bg/85 border-b border-border-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <MagneticButton
            as="a"
            href="/"
            className="group flex items-center gap-2 text-sm text-[color:var(--gold-dim)] hover:text-gold transition-colors font-semibold"
            strength={0.4}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            חזרה לדף הבית
          </MagneticButton>
        </div>
      </header>

      {/* Hero — gold gradient + reveal + architectural depth backdrop */}
      <DepthSection
        image={DEPTH_IMAGES.modernFacade}
        speed={0.45}
        opacity={0.06}
        overlayTone="light"
      >
      <section
        className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, #FBF7ED 0%, #FAFAF8 55%, #FAFAF8 100%)",
        }}
      >
        {/* Decorative layers */}
        <motion.div
          aria-hidden
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.16),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(139,105,20,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(139,105,20,0.04)_1px,transparent_1px)] bg-[size:48px_48px] opacity-40" />
        </motion.div>

        <div className="relative max-w-7xl mx-auto text-center">
          <Reveal variant="up">
            <p className="text-[11px] tracking-[0.3em] uppercase text-[color:var(--gold-dim)] mb-3 font-semibold inline-flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> גלריה אוצרתית
            </p>
          </Reveal>
          <Reveal variant="up" delay={0.1}>
            <h1 className="text-4xl sm:text-7xl font-heading font-semibold mb-5 tracking-tight leading-[1.05] text-text-primary">
              גלריית{" "}
              <span className="italic text-[color:var(--gold-dim)]">
                פרויקטים
              </span>
            </h1>
          </Reveal>
          <Reveal variant="up" delay={0.2}>
            <p className="text-text-muted text-base sm:text-lg max-w-2xl mx-auto">
              גלו עבודות עיצוב מרהיבות של מעצבות הפנים בקהילת זירת האדריכלות
            </p>
          </Reveal>
        </div>
      </section>
      </DepthSection>

      {/* Filters */}
      <Reveal variant="fade" amount={0.1}>
        <section className="px-4 sm:px-6 pb-10 pt-10 bg-bg-card border-y border-border-subtle">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Filter className="w-4 h-4 text-gold" />
              <span className="text-xs text-text-muted font-semibold tracking-widest uppercase">
                קטגוריה
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              <FilterPill
                active={categoryFilter === "all"}
                onClick={() => setCategoryFilter("all")}
              >
                הכל
              </FilterPill>
              {CATEGORIES.map((cat) => (
                <FilterPill
                  key={cat.value}
                  active={categoryFilter === cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                >
                  {cat.label}
                </FilterPill>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="text-xs text-text-muted font-semibold tracking-widest uppercase">
                סגנון
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterPill
                active={styleFilter === "all"}
                onClick={() => setStyleFilter("all")}
                small
              >
                הכל
              </FilterPill>
              {STYLE_TAGS.map((tag) => (
                <FilterPill
                  key={tag}
                  active={styleFilter === tag}
                  onClick={() => setStyleFilter(tag)}
                  small
                >
                  {tag}
                </FilterPill>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {/* Masonry Gallery — soft living-room backdrop peeks behind the whole grid */}
      <DepthSection
        image={DEPTH_IMAGES.softLiving}
        speed={0.3}
        opacity={0.05}
        overlayTone="light"
      >
      <section className="px-4 sm:px-6 pb-24 pt-12">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
              {[
                "h-72", "h-96", "h-64", "h-80", "h-72", "h-96",
                "h-64", "h-80", "h-72",
              ].map((h, i) => (
                <div
                  key={i}
                  className={`bg-bg-surface border border-border-subtle rounded-xl mb-5 animate-pulse ${h} break-inside-avoid`}
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Reveal variant="fade">
              <div className="text-center py-24 border-2 border-dashed border-border-subtle bg-bg-surface rounded-2xl">
                <p className="text-text-muted text-sm">אין פרויקטים להצגה</p>
              </div>
            </Reveal>
          ) : (
            <>
              <MasonryGallery
                items={masonryItems}
                onItemClick={(i) => setLightboxIndex(i)}
                columns={{ base: 1, sm: 2, lg: 3 }}
                layoutIdPrefix="portfolio"
              />
              <Lightbox
                images={lightboxImages}
                index={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
                onChange={(i) => setLightboxIndex(i)}
                layoutIdPrefix="portfolio"
              />

              {/* CTA strip */}
              <div
                className="mt-20 max-w-4xl mx-auto rounded-3xl border"
                style={{
                  background:
                    "linear-gradient(145deg, #FFFBEF 0%, #F5ECD3 100%)",
                  borderColor: "var(--border-gold)",
                  boxShadow: "var(--shadow-gold)",
                }}
              >
                <RevealStagger
                  className="text-center px-6 py-14"
                  stagger={0.12}
                >
                  <p className="text-[11px] tracking-[0.3em] uppercase text-[color:var(--gold-dim)] mb-3 font-semibold">
                    הצטרפו לקהילה
                  </p>
                  <h3 className="text-3xl sm:text-5xl font-heading font-semibold text-text-primary mb-4 tracking-tight">
                    הפרויקט שלכם יכול להיות כאן
                  </h3>
                  <p className="text-text-secondary text-base mb-8 max-w-lg mx-auto">
                    מעצבות וספקים בקהילת זירת האדריכלות חולקים פרויקטים, יוצרים קשרים,
                    ומובילים את עולם העיצוב בישראל.
                  </p>
                  <MagneticButton
                    as="a"
                    href="/"
                    className="btn-gold inline-flex items-center gap-2 !px-8 !py-3.5"
                  >
                    גלו את הקהילה
                  </MagneticButton>
                </RevealStagger>
              </div>
            </>
          )}
        </div>
      </section>
      </DepthSection>

      {/* Footer */}
      <footer className="bg-bg-card py-8 px-4 border-t border-border-subtle">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size="sm" />
            <p className="text-sm text-text-secondary">זירת האדריכלות</p>
          </div>
          <p className="text-text-muted text-sm">
            &copy; {new Date().getFullYear()} כל הזכויות שמורות
          </p>
        </div>
      </footer>
    </div>
  );
}

// =================================================================
// DesignerPortfolioView — full wireframe (hero + bio strip + filter
// bar + masonry + testimonials + CTA block with contact-mini form).
// =================================================================
function DesignerPortfolioView({
  designerId,
  displayName,
  designerLogo,
  city,
  specialization,
  tagline,
  companyName,
  projectsCount,
  loading,
  projects,
  masonryItems,
  lightboxImages,
  lightboxIndex,
  setLightboxIndex,
  categoryFilter,
  setCategoryFilter,
}: {
  designerId: string;
  displayName: string;
  designerLogo: string | null;
  city: string | null;
  specialization: string | null;
  tagline: string | null;
  companyName: string | null;
  projectsCount: number;
  loading: boolean;
  projects: PublicProject[];
  masonryItems: MasonryItem[];
  lightboxImages: LightboxImage[];
  lightboxIndex: number | null;
  setLightboxIndex: (i: number | null) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
}) {
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactToast, setContactToast] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [recommendations, setRecommendations] = useState<PublicRecommendation[]>([]);
  const [shareToast, setShareToast] = useState(false);

  // Fetch public recommendations for this designer
  useEffect(() => {
    let cancelled = false;
    async function loadRecs() {
      try {
        const res = await fetch(`/api/public/designer/${designerId}/recommendations`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data)) setRecommendations(data);
        }
      } catch (e) {
        console.error("Failed to load recommendations", e);
      }
    }
    loadRecs();
    return () => {
      cancelled = true;
    };
  }, [designerId]);

  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const nav = navigator as Navigator & {
      share?: (d: ShareData) => Promise<void>;
    };
    try {
      if (nav.share) {
        await nav.share({ title: displayName, url });
        return;
      }
    } catch {
      /* user cancelled */
    }
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 2500);
      }
    } catch {
      /* ignore */
    }
  }

  // Count of projects in each category (for chip labels)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    for (const p of projects) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [projects]);

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = contactName.trim();
    const phone = contactPhone.trim();
    const message = contactMessage.trim();

    if (!name || !phone) {
      setContactToast({ tone: "error", text: "יש למלא שם וטלפון" });
      setTimeout(() => setContactToast(null), 3500);
      return;
    }

    setContactSubmitting(true);
    try {
      const res = await fetch(`/api/public/designer/${designerId}/contact`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, message: message || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setContactToast({
          tone: "error",
          text: data.error || "שליחה נכשלה — נסי שוב",
        });
        setTimeout(() => setContactToast(null), 4000);
      } else {
        setContactSubmitted(true);
        setContactToast({ tone: "success", text: "תודה! הפנייה נשלחה" });
        setContactName("");
        setContactPhone("");
        setContactMessage("");
        setTimeout(() => setContactToast(null), 3500);
      }
    } catch {
      setContactToast({ tone: "error", text: "שליחה נכשלה — נסי שוב" });
      setTimeout(() => setContactToast(null), 4000);
    } finally {
      setContactSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text-primary overflow-x-hidden" dir="rtl">
      {/* ============ LIGHTWEIGHT TOP (back link only — no sticky nav) ============ */}
      <div className="max-w-[1400px] mx-auto px-6 pt-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-gold-dim transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          חזרה לאינדקס
        </Link>
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] text-text-secondary hover:bg-bg-surface hover:text-text-primary rounded-lg transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" /> שתף
        </button>
      </div>

      {shareToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] bg-black/90 text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg">
          הקישור הועתק
        </div>
      )}

      {contactToast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-[60] text-white text-[13px] px-4 py-2.5 rounded-lg shadow-lg ${
            contactToast.tone === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
          role="status"
        >
          {contactToast.text}
        </div>
      )}

      {/* ============ HERO ============ */}
      <section
        className="relative overflow-hidden"
        style={{
          padding: "40px 0 60px",
          background: "linear-gradient(180deg,#FBF7ED 0%,#FAFAF8 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(600px 300px at 85% 30%,rgba(232,201,122,.35),transparent 70%),radial-gradient(500px 260px at 10% 70%,rgba(201,168,76,.2),transparent 70%)",
          }}
        />
        <div className="relative max-w-[1400px] mx-auto px-6 grid gap-8 lg:gap-[60px] items-center grid-cols-1 lg:[grid-template-columns:1.1fr_0.9fr]">
          {/* LEFT: copy — real designer data only, no placeholders */}
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-[18px] px-3.5 py-1.5 rounded-full"
              style={{
                color: "var(--gold-dim)",
                background: "rgba(255,255,255,0.6)",
                border: "1px solid var(--border-gold)",
                letterSpacing: ".3px",
              }}
            >
              <Sparkles className="w-3 h-3" />
              {specialization || "מעצבת פנים"}
              {city && ` · ${city}`}
            </span>
            <h1
              className="font-heading m-0 mb-3"
              style={{
                fontSize: "clamp(40px,5.2vw,64px)",
                lineHeight: 1.05,
                letterSpacing: "-1.2px",
                fontWeight: 500,
              }}
            >
              {displayName}
            </h1>
            {companyName && (
              <p
                className="text-[16px] m-0 mb-3"
                style={{ color: "var(--gold-dim)", fontWeight: 500 }}
              >
                {companyName}
              </p>
            )}
            {tagline && (
              <p
                className="text-[18px] text-text-secondary max-w-[520px] m-0 mb-6"
                style={{ lineHeight: 1.55 }}
              >
                {tagline}
              </p>
            )}
            <div className="flex flex-wrap gap-[18px] text-[13.5px] text-text-muted mb-7">
              {city && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" style={{ color: "var(--gold)" }} />
                  {city}
                </span>
              )}
              {projectsCount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4" style={{ color: "var(--gold)" }} />
                  {projectsCount} פרויקטים
                </span>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              <a href="#cta-form" className="btn-gold inline-flex items-center gap-2">
                <MessageCircle className="w-3.5 h-3.5" /> שלחי פנייה
              </a>
              <Link
                href={`/business-card/${designerId}`}
                className="btn-outline inline-flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" /> כרטיס ביקור דיגיטלי
              </Link>
              <button
                type="button"
                onClick={handleShare}
                className="btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-text-secondary font-medium rounded-lg hover:bg-bg-surface hover:text-text-primary"
              >
                <Share2 className="w-3.5 h-3.5" /> שתף
              </button>
            </div>
          </div>

          {/* RIGHT: hero visual */}
          <div
            className="relative w-full mx-auto lg:mx-0 lg:justify-self-end"
            style={{ aspectRatio: "5 / 6", maxWidth: "460px" }}
          >
            <div
              className="absolute inset-0 rounded-[22px] overflow-hidden"
              style={{
                boxShadow: "var(--shadow-xl)",
                background: "linear-gradient(160deg,#C9A84C,#8B6914)",
                transform: "rotate(-2deg)",
              }}
            >
              {designerLogo ? (
                <img
                  src={designerLogo}
                  alt={`לוגו ${displayName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg
                  viewBox="0 0 400 480"
                  preserveAspectRatio="xMidYMid slice"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full relative"
                >
                  <defs>
                    <linearGradient id="hero-g" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#E8C97A" />
                      <stop offset=".5" stopColor="#C9A84C" />
                      <stop offset="1" stopColor="#8B6914" />
                    </linearGradient>
                    <linearGradient id="wall-g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#FBF7ED" />
                      <stop offset="1" stopColor="#F5ECD3" />
                    </linearGradient>
                  </defs>
                  <rect width="400" height="480" fill="url(#hero-g)" />
                  {/* Room sketch */}
                  <rect x="60" y="80" width="280" height="260" fill="url(#wall-g)" opacity=".75" />
                  <rect x="60" y="340" width="280" height="40" fill="rgba(139,101,8,.4)" />
                  {/* Sofa */}
                  <rect x="100" y="240" width="140" height="80" fill="rgba(26,20,16,.5)" rx="6" />
                  <rect x="110" y="250" width="45" height="60" fill="rgba(255,255,255,.3)" rx="4" />
                  <rect x="165" y="250" width="45" height="60" fill="rgba(255,255,255,.3)" rx="4" />
                  {/* Pendant light */}
                  <line x1="250" y1="80" x2="250" y2="170" stroke="rgba(26,20,16,.4)" strokeWidth="1.5" />
                  <circle cx="250" cy="180" r="18" fill="rgba(255,235,180,.9)" />
                  {/* Plant */}
                  <rect x="270" y="280" width="30" height="40" fill="rgba(26,20,16,.4)" />
                  <path
                    d="M275 280 Q285 260 295 280 M280 280 Q275 250 290 260 M285 280 Q295 245 305 270"
                    stroke="rgba(46,80,40,.7)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Art frame */}
                  <rect x="115" y="130" width="100" height="80" fill="rgba(255,255,255,.8)" stroke="rgba(26,20,16,.3)" strokeWidth="2" />
                  <circle cx="145" cy="170" r="14" fill="rgba(201,168,76,.8)" />
                  <rect x="170" y="160" width="30" height="30" fill="rgba(139,101,8,.5)" />
                </svg>
              )}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg,transparent 40%,rgba(0,0,0,.3))",
                  zIndex: 1,
                }}
              />
              <div
                className="absolute bottom-5 right-5 z-[2] text-white font-bold text-[18px]"
                style={{ fontFamily: "'Rubik', sans-serif", letterSpacing: ".3px" }}
              >
                {displayName}
                <small className="block font-normal text-[11.5px] opacity-85 tracking-[0.5px] uppercase mt-0.5">
                  Interior Designer
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BIO STRIP (real data only) ============ */}
      {(projectsCount > 0 || specialization || city) && (
        <section
          className="bg-bg-card py-6"
          style={{
            borderTop: "1px solid var(--border)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="max-w-[1400px] mx-auto px-6 flex flex-wrap gap-8 items-center justify-center">
            {projectsCount > 0 && (
              <div className="text-center">
                <div
                  className="text-[28px] font-bold text-text-primary"
                  style={{ fontFamily: "'Rubik', sans-serif", letterSpacing: "-.5px" }}
                >
                  {projectsCount}
                </div>
                <div className="text-[11.5px] text-text-muted font-medium uppercase tracking-[0.8px] mt-0.5">
                  פרויקטים
                </div>
              </div>
            )}
            {specialization && (
              <div className="text-center">
                <div
                  className="text-[18px] font-semibold text-text-primary"
                  style={{ fontFamily: "'Rubik', sans-serif" }}
                >
                  {specialization}
                </div>
                <div className="text-[11.5px] text-text-muted font-medium uppercase tracking-[0.8px] mt-0.5">
                  התמחות
                </div>
              </div>
            )}
            {city && (
              <div className="text-center">
                <div
                  className="text-[18px] font-semibold text-text-primary"
                  style={{ fontFamily: "'Rubik', sans-serif" }}
                >
                  {city}
                </div>
                <div className="text-[11.5px] text-text-muted font-medium uppercase tracking-[0.8px] mt-0.5">
                  אזור פעילות
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============ FILTER BAR ============ */}
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="py-9 pb-5.5 flex justify-between items-center flex-wrap gap-4">
          <div>
            <div
              className="text-[13px] font-semibold uppercase tracking-[1px] mb-1.5"
              style={{ color: "var(--gold-dim)", fontFamily: "'Rubik', sans-serif" }}
            >
              הפרויקטים שלי
            </div>
            <h2
              className="font-heading text-[34px] m-0"
              style={{ fontWeight: 500, letterSpacing: "-.6px" }}
            >
              {projectsCount} סיפורים מהשנים האחרונות
            </h2>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Chip
              active={categoryFilter === "all"}
              onClick={() => setCategoryFilter("all")}
            >
              הכל · {categoryCounts["all"] || 0}
            </Chip>
            {CATEGORIES.map((cat) => (
              <Chip
                key={cat.value}
                active={categoryFilter === cat.value}
                onClick={() => setCategoryFilter(cat.value)}
              >
                {cat.label} · {categoryCounts[cat.value] || 0}
              </Chip>
            ))}
          </div>
        </div>

        {/* ============ MASONRY ============ */}
        <div className="pb-5">
          {loading ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-[18px]">
              {["h-72", "h-96", "h-64", "h-80", "h-72", "h-96", "h-64", "h-80", "h-72"].map(
                (h, i) => (
                  <div
                    key={i}
                    className={`bg-bg-surface border border-border-subtle rounded-xl mb-[18px] animate-pulse ${h} break-inside-avoid`}
                  />
                )
              )}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed border-border-subtle bg-bg-surface rounded-2xl">
              <p className="text-text-muted text-sm">אין פרויקטים להצגה</p>
            </div>
          ) : (
            <>
              <MasonryGallery
                items={masonryItems}
                onItemClick={(i) => setLightboxIndex(i)}
                columns={{ base: 1, sm: 2, lg: 3 }}
                layoutIdPrefix="portfolio"
              />
              <Lightbox
                images={lightboxImages}
                index={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
                onChange={(i) => setLightboxIndex(i)}
                layoutIdPrefix="portfolio"
              />
            </>
          )}
        </div>

        <div className="text-center mt-7 mb-5">
          <button type="button" className="btn-outline inline-flex items-center gap-2">
            <ArrowDown className="w-3.5 h-3.5" /> טענו עוד פרויקטים
          </button>
        </div>
      </div>

      {/* ============ TESTIMONIALS (real, published only) ============ */}
      {recommendations.length > 0 && (
        <section
          className="py-[70px] mt-[60px]"
          style={{ background: "linear-gradient(180deg,#FAFAF8 0%,#FBF7ED 100%)" }}
        >
          <div className="max-w-[1240px] mx-auto px-6">
            <div className="text-center mb-2.5">
              <div
                className="text-[13px] font-semibold uppercase tracking-[1px] mb-1.5"
                style={{ color: "var(--gold-dim)", fontFamily: "'Rubik', sans-serif" }}
              >
                המלצות לקוחות
              </div>
              <h2
                className="font-heading text-[34px] m-0"
                style={{ fontWeight: 500, letterSpacing: "-.6px" }}
              >
                מה אומרים עליי
              </h2>
            </div>
            <div className="grid gap-5 mt-7 grid-cols-1 lg:grid-cols-3">
              {recommendations.map((r) => {
                const nameForInitials = r.clientName || "";
                const parts = nameForInitials.trim().split(/\s+/).filter(Boolean);
                const initials =
                  parts.length === 0
                    ? "?"
                    : parts.length === 1
                    ? parts[0].charAt(0)
                    : parts[0].charAt(0) + parts[parts.length - 1].charAt(0);

                return (
                  <div
                    key={r.id}
                    className="relative bg-white rounded-[14px] p-[26px] border border-border-subtle"
                    style={{ boxShadow: "var(--shadow-xs)" }}
                  >
                    <span
                      aria-hidden
                      className="absolute top-2.5 right-5.5 font-heading text-[72px] leading-none"
                      style={{ color: "var(--gold)", opacity: 0.18 }}
                    >
                      &ldquo;
                    </span>
                    {r.text && (
                      <p
                        className="text-[14.5px] text-text-secondary m-0 mb-4 italic relative"
                        style={{ lineHeight: 1.7 }}
                      >
                        {r.text}
                      </p>
                    )}
                    {r.clientName && (
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 rounded-full grid place-items-center text-white font-bold text-[13px]"
                          style={{ background: "linear-gradient(135deg,#E8C97A,#C9A84C)" }}
                        >
                          {initials || "?"}
                        </div>
                        <div>
                          <div
                            className="font-semibold text-[13.5px]"
                            style={{ fontFamily: "'Rubik', sans-serif" }}
                          >
                            {r.clientName}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============ CTA FOOTER ============ */}
      <div className="max-w-[1240px] mx-auto px-6" id="cta-form">
        <div
          className="relative overflow-hidden mt-[70px] mb-10 rounded-3xl grid gap-10 items-center grid-cols-1 lg:[grid-template-columns:1.3fr_1fr]"
          style={{
            padding: "48px 40px",
            background: "linear-gradient(135deg,#FBF7ED 0%,#F5ECD3 100%)",
            border: "1px solid var(--border-gold)",
            boxShadow: "var(--shadow-gold)",
          }}
        >
          <div
            aria-hidden
            className="absolute pointer-events-none"
            style={{
              top: "-50%",
              left: "-10%",
              width: "400px",
              height: "400px",
              background:
                "radial-gradient(closest-side,rgba(201,168,76,.25),transparent)",
            }}
          />
          <div className="relative z-[1]">
            <h2
              className="font-heading m-0 mb-2.5"
              style={{
                fontSize: "36px",
                fontWeight: 500,
                letterSpacing: "-.8px",
                lineHeight: 1.15,
              }}
            >
              רוצים להתחיל לדמיין
              <br />
              את הבית שלכם יחד?
            </h2>
            <p
              className="text-text-secondary m-0 mb-5.5 text-[15px] max-w-[420px]"
              style={{ lineHeight: 1.65 }}
            >
              שיחת ייעוץ ראשונית של 30 דקות ללא עלות. מספרים לי על החלל,
              על החיים בתוכו, ועל מה שחלמתם אבל לא ידעתם איך לבקש.
            </p>
            <div className="flex gap-2.5 flex-wrap">
              <a href="#cta-form" className="btn-gold inline-flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> קבעו שיחת ייעוץ
              </a>
              <a href="tel:0547123456" className="btn-outline inline-flex items-center gap-2">
                <Phone className="w-3.5 h-3.5" /> 054-7123456
              </a>
            </div>
          </div>
          <div className="relative z-[1]">
            <form
              onSubmit={handleContactSubmit}
              className="bg-white rounded-2xl p-5 border border-border-subtle"
              style={{ boxShadow: "var(--shadow-md)" }}
            >
              <div
                className="font-semibold mb-1"
                style={{ fontFamily: "'Rubik', sans-serif" }}
              >
                שלחי הודעה מהירה
              </div>
              <div className="text-[12px] text-text-muted mb-2.5">
                אחזור תוך 2 שעות
              </div>
              <label className="block text-[12px] text-text-muted mt-2.5 mb-1 font-medium">
                שם
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="השם שלך"
                className="w-full px-3 py-2.5 text-[13px] border border-border-subtle rounded-lg bg-white outline-none focus:border-[color:var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)]/10"
              />
              <label className="block text-[12px] text-text-muted mt-2.5 mb-1 font-medium">
                טלפון
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="050-0000000"
                className="w-full px-3 py-2.5 text-[13px] border border-border-subtle rounded-lg bg-white outline-none focus:border-[color:var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)]/10"
              />
              <label className="block text-[12px] text-text-muted mt-2.5 mb-1 font-medium">
                ספרי לי על הפרויקט
              </label>
              <textarea
                rows={2}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="דירת 4 חדרים בתל אביב, רוצים לעצב מחדש את הסלון והמטבח..."
                className="w-full px-3 py-2.5 text-[13px] border border-border-subtle rounded-lg bg-white outline-none focus:border-[color:var(--gold)] focus:ring-2 focus:ring-[color:var(--gold)]/10 font-sans"
              />
              <button
                type="submit"
                disabled={contactSubmitting}
                className="btn-gold w-full mt-3 inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {contactSubmitting ? "שולח..." : "שליחה"} <Send className="w-3.5 h-3.5" />
              </button>
              {contactSubmitted && (
                <p className="text-[12px] text-text-muted mt-2 text-center">
                  תודה! הפנייה נשלחה — המעצבת תחזור אלייך בהקדם.
                </p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* ============ FOOTER ============ */}
      <footer
        className="text-center text-[12.5px] text-text-muted py-7 bg-bg-card"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div>
          <Link href="/" style={{ color: "var(--gold-dim)" }}>
            ← חזרה לאינדקס
          </Link>{" "}
          · זירת האדריכלות · {displayName}
          {specialization ? ` · ${specialization}` : ""}
        </div>
      </footer>
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-1.5 text-[12.5px] rounded-full font-medium border transition-all cursor-pointer"
      style={{
        background: active ? "var(--gold-50)" : "var(--bg-surface)",
        color: active ? "var(--gold-dim)" : "var(--text-secondary)",
        borderColor: active ? "var(--border-gold)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}

function FilterPill({
  children,
  active,
  onClick,
  small,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={`${small ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"} rounded-full font-semibold border transition-all ${
        active
          ? "bg-[color:var(--gold-50)] border-[color:var(--border-gold)] text-[color:var(--gold-dim)] shadow-[0_2px_8px_-3px_rgba(201,168,76,0.35)]"
          : "bg-white border-border-subtle text-text-secondary hover:border-border-hover hover:text-text-primary"
      }`}
    >
      {children}
    </motion.button>
  );
}
