"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import Logo from "@/components/ui/Logo";
import { Filter, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Reveal, { RevealStagger } from "@/components/motion/Reveal";
import MasonryGallery, { type MasonryItem } from "@/components/gallery/MasonryGallery";
import Lightbox, { type LightboxImage } from "@/components/gallery/Lightbox";
import MagneticButton from "@/components/motion/MagneticButton";

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
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
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
            <p className="text-white/80 text-xs mt-1">
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

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#050505]/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" variant="dark" />
          </Link>
          <MagneticButton
            as="a"
            href="/"
            className="group flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#e0c068] transition-colors"
            strength={0.4}
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            חזרה לדף הבית
          </MagneticButton>
        </div>
      </header>

      {/* Hero — parallax + reveal */}
      <section className="relative py-20 sm:py-28 px-4 sm:px-6 overflow-hidden">
        {/* Decorative layers */}
        <motion.div
          aria-hidden
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.18),transparent_55%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
        </motion.div>

        <div className="relative max-w-7xl mx-auto text-center">
          {designerParam && designerName ? (
            <>
              {designerLogo && (
                <Reveal variant="scale" duration={0.8}>
                  <img
                    src={designerLogo}
                    alt={`לוגו ${designerName}`}
                    className="mx-auto h-20 sm:h-28 w-auto object-contain rounded-xl mb-6"
                  />
                </Reveal>
              )}
              <Reveal variant="up" delay={0.1}>
                <p className="text-[11px] tracking-[0.3em] uppercase text-[#C9A84C]/80 mb-3 font-semibold inline-flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> תיק עבודות אישי
                </p>
              </Reveal>
              <Reveal variant="up" delay={0.15}>
                <h1 className="text-4xl sm:text-6xl font-heading font-bold mb-4 tracking-tight">
                  תיק העבודות של{" "}
                  <span className="bg-gradient-to-r from-[#C9A84C] via-[#E8C97A] to-[#C9A84C] bg-clip-text text-transparent">
                    {designerName}
                  </span>
                </h1>
              </Reveal>
              <Reveal variant="up" delay={0.25}>
                <p className="text-white/50 text-base max-w-xl mx-auto">עבודות עיצוב נבחרות</p>
              </Reveal>
            </>
          ) : (
            <>
              <Reveal variant="up">
                <p className="text-[11px] tracking-[0.3em] uppercase text-[#C9A84C]/80 mb-3 font-semibold inline-flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> גלריה אוצרתית
                </p>
              </Reveal>
              <Reveal variant="up" delay={0.1}>
                <h1 className="text-4xl sm:text-7xl font-heading font-bold mb-5 tracking-tight leading-[1.05]">
                  גלריית{" "}
                  <span className="bg-gradient-to-r from-[#C9A84C] via-[#E8C97A] to-[#C9A84C] bg-clip-text text-transparent">
                    פרויקטים
                  </span>
                </h1>
              </Reveal>
              <Reveal variant="up" delay={0.2}>
                <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto">
                  גלו עבודות עיצוב מרהיבות של מעצבות הפנים בקהילת זירת האדריכלות
                </p>
              </Reveal>
            </>
          )}
        </div>
      </section>

      {/* Filters */}
      <Reveal variant="fade" amount={0.1}>
        <section className="px-4 sm:px-6 pb-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Filter className="w-4 h-4 text-[#C9A84C]" />
              <span className="text-xs text-white/40 font-semibold tracking-widest uppercase">
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
              <span className="text-xs text-white/40 font-semibold tracking-widest uppercase">
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

      {/* Masonry Gallery */}
      <section className="px-4 sm:px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
              {[
                "h-72", "h-96", "h-64", "h-80", "h-72", "h-96",
                "h-64", "h-80", "h-72",
              ].map((h, i) => (
                <div
                  key={i}
                  className={`bg-[#1a1a2e] rounded-xl mb-5 animate-pulse ${h} break-inside-avoid`}
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <Reveal variant="fade">
              <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
                <p className="text-white/30 text-sm">אין פרויקטים להצגה</p>
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
              <RevealStagger
                className="mt-20 max-w-4xl mx-auto text-center"
                stagger={0.12}
              >
                <p className="text-[11px] tracking-[0.3em] uppercase text-[#C9A84C]/80 mb-3 font-semibold">
                  הצטרפו לקהילה
                </p>
                <h3 className="text-3xl sm:text-5xl font-heading font-bold text-white mb-4 tracking-tight">
                  הפרויקט שלכם יכול להיות כאן
                </h3>
                <p className="text-white/60 text-base mb-8 max-w-lg mx-auto">
                  מעצבות וספקים בקהילת זירת האדריכלות חולקים פרויקטים, יוצרים קשרים,
                  ומובילים את עולם העיצוב בישראל.
                </p>
                <MagneticButton
                  as="a"
                  href="/"
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#C9A84C] hover:bg-[#E8C97A] text-black font-bold text-sm transition-colors shadow-lg shadow-[#C9A84C]/20"
                >
                  גלו את הקהילה
                </MagneticButton>
              </RevealStagger>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050505] py-8 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo size="sm" variant="dark" />
            <p className="text-sm text-white/55">זירת האדריכלות</p>
          </div>
          <p className="text-white/35 text-sm">
            &copy; {new Date().getFullYear()} כל הזכויות שמורות
          </p>
        </div>
      </footer>
    </div>
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
      className={`${small ? "px-3 py-1.5 text-[11px]" : "px-4 py-2 text-xs"} rounded-full font-medium border transition-all ${
        active
          ? "bg-[#C9A84C]/20 border-[#C9A84C] text-[#C9A84C] shadow-[0_0_20px_-6px_rgba(201,168,76,0.5)]"
          : "bg-white/5 border-white/10 text-white/60 hover:border-white/30 hover:text-white"
      }`}
    >
      {children}
    </motion.button>
  );
}
