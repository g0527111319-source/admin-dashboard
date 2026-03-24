"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { Filter, ArrowLeft } from "lucide-react";

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
  const searchParams = useSearchParams();
  const designerParam = searchParams.get("designer");
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [styleFilter, setStyleFilter] = useState("all");
  const [designerName, setDesignerName] = useState<string | null>(null);

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
          // Extract designer name when filtered by designer
          if (designerParam && data.length > 0 && data[0].designer?.fullName) {
            setDesignerName(data[0].designer.fullName);
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

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo size="sm" variant="dark" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#e0c068] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            חזרה לדף הבית
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          {designerParam && designerName ? (
            <>
              <h1 className="text-3xl sm:text-5xl font-heading font-bold mb-4">
                תיק העבודות של <span className="text-[#C9A84C]">{designerName}</span>
              </h1>
              <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto">
                עבודות עיצוב נבחרות
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-5xl font-heading font-bold mb-4">
                גלריית <span className="text-[#C9A84C]">פרויקטים</span>
              </h1>
              <p className="text-white/50 text-sm sm:text-base max-w-xl mx-auto">
                גלו עבודות עיצוב מרהיבות של מעצבות הפנים בקהילת זירת האדריכלות
              </p>
            </>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 sm:px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Filter className="w-4 h-4 text-[#C9A84C]" />
            <span className="text-xs text-white/40 font-semibold">קטגוריה:</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                categoryFilter === "all"
                  ? "bg-[#C9A84C]/20 border-[#C9A84C] text-[#C9A84C]"
                  : "bg-white/5 border-white/10 text-white/50 hover:border-white/30"
              }`}
            >
              הכל
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
                  categoryFilter === cat.value
                    ? "bg-[#C9A84C]/20 border-[#C9A84C] text-[#C9A84C]"
                    : "bg-white/5 border-white/10 text-white/50 hover:border-white/30"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs text-white/40 font-semibold">סגנון:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStyleFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                styleFilter === "all"
                  ? "bg-[#C9A84C]/20 border-[#C9A84C] text-[#C9A84C]"
                  : "bg-white/5 border-white/10 text-white/50 hover:border-white/30"
              }`}
            >
              הכל
            </button>
            {STYLE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setStyleFilter(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  styleFilter === tag
                    ? "bg-[#C9A84C]/20 border-[#C9A84C] text-[#C9A84C]"
                    : "bg-white/5 border-white/10 text-white/50 hover:border-white/30"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="px-4 sm:px-6 pb-20">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-[#1a1a2e] rounded-xl h-72 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/30 text-sm">אין פרויקטים להצגה</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="group relative block rounded-xl overflow-hidden border border-white/5 hover:border-[#C9A84C]/30 transition-all"
                  style={{ borderRadius: "12px" }}
                >
                  {/* Cover */}
                  <div className="relative h-64 bg-[#1a1a2e]">
                    {project.coverImageUrl ? (
                      <img
                        src={proxyImageUrl(project.coverImageUrl)}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                    ) : project.images[0] ? (
                      <img
                        src={proxyImageUrl(project.images[0].imageUrl)}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#0a0a0a]">
                        <span className="text-white/10 text-4xl font-heading">{project.title.charAt(0)}</span>
                      </div>
                    )}

                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Content overlay */}
                    <div className="absolute bottom-0 right-0 left-0 p-5">
                      <h3 className="text-base font-bold text-white mb-1 line-clamp-1">
                        {project.title}
                      </h3>
                      <p className="text-xs text-white/60">
                        {project.designer.fullName}
                        {project.designer.city && ` \u00B7 ${project.designer.city}`}
                      </p>
                      {project.styleTags && project.styleTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.styleTags.slice(0, 3).map((tag: string) => (
                            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/30">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Category badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 bg-[#C9A84C]/90 text-black text-[10px] font-bold rounded-full">
                        {getCategoryLabel(project.category)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
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
          <p className="text-white/35 text-sm">&copy; {new Date().getFullYear()} כל הזכויות שמורות</p>
        </div>
      </footer>
    </div>
  );
}
