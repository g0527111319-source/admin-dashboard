"use client";

/**
 * /experience — the full Awwwards-level showcase page.
 *
 * This is the "hero reel" for the platform. One continuous scroll takes the
 * visitor through:
 *
 *   1. HERO  — parallax gradient + animated headline + magnetic CTAs
 *   2. INTRO — blurb with scroll-driven reveal (editorial mode)
 *   3. GALLERY — masonry portfolio with hover zoom + lightbox
 *   4. PINNED  — vertical-to-horizontal scroll-hijack section of suppliers
 *   5. STATS   — numbers that count up as they enter view
 *   6. CTA     — closing call-to-action with magnetic button
 *
 * Every section shares the same brand language (gold accents on pitch-black),
 * uses GPU-accelerated transforms, and respects prefers-reduced-motion.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
  useMotionValue,
  animate,
  useInView,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowDown,
  Sparkles,
  Building2,
  Users,
  Star,
  Loader2,
} from "lucide-react";

import Logo from "@/components/ui/Logo";
import Reveal, { RevealStagger } from "@/components/motion/Reveal";
import MagneticButton from "@/components/motion/MagneticButton";
import MasonryGallery, {
  type MasonryItem,
} from "@/components/gallery/MasonryGallery";
import Lightbox, {
  type LightboxImage,
} from "@/components/gallery/Lightbox";
import PinnedHorizontalScroll from "@/components/gallery/PinnedHorizontalScroll";
import SupplierPremiumCard, {
  type SupplierCardData,
} from "@/components/gallery/SupplierPremiumCard";
import DepthSection from "@/components/motion/DepthSection";
import { DEPTH_IMAGES } from "@/lib/depth-images";

// ─────────────────────────────────────────────────────────────────────────────
// Types

type PublicProject = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  styleTags: string[];
  coverImageUrl: string | null;
  status: string;
  createdAt: string;
  designer: {
    id: string;
    fullName: string;
    city: string | null;
  };
  images: Array<{
    id: string;
    imageUrl: string;
    caption: string | null;
    sortOrder: number;
  }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers

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

const CATEGORIES: Record<string, string> = {
  apartment: "דירה",
  house: "בית פרטי",
  office: "משרד",
  commercial: "מסחרי",
  other: "אחר",
};

// Fallback cards used when the DB has no approved/featured suppliers yet.
// These make the showcase page render consistently and act as a visual
// reference for how the supplier section looks when populated.
const FALLBACK_SUPPLIERS: SupplierCardData[] = [
  {
    id: "demo-kitchen",
    name: "קיטשן פלוס",
    category: "מטבחים",
    city: "תל אביב",
    description:
      "מטבחים בעיצוב אישי, ייצור ישראלי, אחריות מלאה ושירות שרואה אתכן לאורך כל הפרויקט.",
    logoUrl: null,
    coverImageUrl: null,
    isCommunity: true,
    isVerified: true,
    dealsCount: 27,
  },
  {
    id: "demo-stone",
    name: "סטון דיזיין",
    category: "ריצוף וחיפוי",
    city: "חיפה",
    description:
      "אבן טבעית, פורצלן וקרמיקה מהמיטב שבעולם — קולקציה פרטית שמותאמת לכל סגנון.",
    logoUrl: null,
    coverImageUrl: null,
    isCommunity: true,
    isVerified: true,
    dealsCount: 41,
  },
  {
    id: "demo-lighting",
    name: "אור תאורה",
    category: "תאורה מעוצבת",
    city: "הרצליה",
    description:
      "תכנון תאורה מקצועי לבית ולעסק, עם גופי תאורה מותאמים אישית מעיצוב איטלקי.",
    logoUrl: null,
    coverImageUrl: null,
    isCommunity: true,
    isVerified: true,
    dealsCount: 18,
  },
  {
    id: "demo-wood",
    name: "נגרות קיבוץ",
    category: "נגרות ורהיטים",
    city: "רמת השרון",
    description:
      "רהיטים בהתאמה אישית מעץ מלא, נגרים עם 30 שנות ניסיון וגימור ברמה של גלריה.",
    logoUrl: null,
    coverImageUrl: null,
    isCommunity: true,
    isVerified: true,
    dealsCount: 33,
  },
  {
    id: "demo-textile",
    name: "טקסטיל לבן",
    category: "טקסטיל ואפרסומים",
    city: "ירושלים",
    description:
      "וילונות, שטיחים ומצעים באיכות בוטיק — פריטי טקסטיל שהופכים חלל לבית.",
    logoUrl: null,
    coverImageUrl: null,
    isCommunity: true,
    isVerified: false,
    dealsCount: 12,
  },
  {
    id: "demo-appliances",
    name: "מכשור בית איטלקי",
    category: "מוצרי חשמל",
    city: "פתח תקווה",
    description:
      "מותגי יוקרה איטלקיים למטבח ולחדרי הכביסה, הזמנה ישירה מהיבואן.",
    logoUrl: null,
    coverImageUrl: null,
    isCommunity: true,
    isVerified: true,
    dealsCount: 22,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page

export default function ExperiencePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#C9A84C]" />
        </div>
      }
    >
      <ExperienceContent />
    </Suspense>
  );
}

function ExperienceContent() {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          fetch("/api/public/projects"),
          fetch("/api/public/suppliers?limit=12"),
        ]);
        if (pRes.ok) setProjects(await pRes.json());
        if (sRes.ok) {
          const list: SupplierCardData[] = await sRes.json();
          // If the DB is empty/pending we still want the pinned-scroll section
          // to shine — drop in a set of community-accurate demo cards so the
          // experience renders consistently.
          setSuppliers(list.length > 0 ? list : FALLBACK_SUPPLIERS);
        } else {
          setSuppliers(FALLBACK_SUPPLIERS);
        }
      } catch (e) {
        console.error("experience: load failed", e);
        setSuppliers(FALLBACK_SUPPLIERS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
          badge: CATEGORIES[p.category] ?? p.category,
          overlay: (
            <p className="text-white/75 text-xs mt-1 font-body">
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
    // NOTE: no overflow-x-hidden here. `overflow-x: hidden` implicitly sets
    // overflow-y to auto, which creates a scroll container and breaks
    // position:sticky for descendants (the PinnedHorizontalScroll section).
    // Individual sections that need horizontal clipping own their own clipping.
    // `relative` on the root silences a Framer Motion useScroll offset warning
    // (static ancestor → ambiguous scroll container).
    <div className="relative bg-[#050505] text-white">
      <StickyHeader />

      <HeroSection />

      <IntroSection />

      <GallerySection
        items={masonryItems}
        onTileClick={setLightboxIndex}
        loading={loading}
      />

      {suppliers.length > 0 ? (
        <PinnedHorizontalScroll
          eyebrow="ספקים מובילים"
          title="הספקים של הקהילה"
          subtitle="נבחרו בקפידה ועובדים יד ביד עם המעצבות והאדריכליות של זירת האדריכלות"
          stageClassName="bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.08),transparent_60%)]"
        >
          {suppliers.map((s, i) => (
            <SupplierPremiumCard
              key={s.id}
              supplier={s}
              index={i}
              layoutIdPrefix="exp-supplier"
            />
          ))}
        </PinnedHorizontalScroll>
      ) : null}

      <StatsSection />

      <ClosingCTA />

      <FooterMini />

      <Lightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onChange={setLightboxIndex}
        layoutIdPrefix="masonry"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticky header — hides on scroll down, reveals on scroll up

function StickyHeader() {
  const { scrollY } = useScroll();
  const headerY = useSpring(0, { stiffness: 260, damping: 30 });
  const lastY = useRef(0);

  useEffect(() => {
    const unsub = scrollY.on("change", (y) => {
      const diff = y - lastY.current;
      if (y < 100) headerY.set(0);
      else if (diff > 0) headerY.set(-100);
      else headerY.set(0);
      lastY.current = y;
    });
    return () => unsub();
  }, [scrollY, headerY]);

  return (
    <motion.header
      style={{ y: headerY }}
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md bg-[#050505]/70 border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <Logo size="sm" variant="dark" />
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-white/70">
          <Link
            href="/projects"
            className="hover:text-[#C9A84C] transition-colors"
          >
            פרויקטים
          </Link>
          <Link href="/" className="hover:text-[#C9A84C] transition-colors">
            קהילה
          </Link>
          <MagneticButton
            as="a"
            href="/register"
            strength={0.3}
            className="px-5 py-2 rounded-full bg-[#C9A84C] text-black font-semibold text-xs hover:bg-[#E8C97A] transition-colors"
            halo
          >
            להצטרפות
          </MagneticButton>
        </nav>
        <MagneticButton
          as="a"
          href="/"
          strength={0.4}
          className="sm:hidden group flex items-center gap-2 text-sm text-[#C9A84C] hover:text-[#e0c068] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          חזרה
        </MagneticButton>
      </div>
    </motion.header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO

function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const gridY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <DepthSection
      image={DEPTH_IMAGES.brightVilla}
      speed={0.45}
      opacity={0.16}
      overlayTone="none"
      fullHeight
    >
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background layers with parallax (layered on top of DepthSection's architectural backdrop) */}
      <motion.div
        aria-hidden
        style={{ y: reduced ? 0 : y, scale: reduced ? 1 : bgScale }}
        className="absolute inset-0"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.18),transparent_55%)]" />
      </motion.div>

      <motion.div
        aria-hidden
        style={{ y: reduced ? 0 : gridY }}
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:52px_52px]"
      />

      <motion.div
        style={{ opacity }}
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center"
      >
        <Reveal variant="up">
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#C9A84C]/80 mb-4 font-semibold inline-flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            זירת האדריכלות · Experience
          </p>
        </Reveal>

        <Reveal variant="blur" delay={0.12} duration={0.9}>
          <h1 className="text-5xl sm:text-7xl lg:text-[96px] font-heading font-bold tracking-tight leading-[1.02] mb-6">
            עיצוב
            <br />
            שמרגישים{" "}
            <span className="italic bg-gradient-to-r from-[#C9A84C] via-[#E8C97A] to-[#C9A84C] bg-clip-text text-transparent">
              בבית
            </span>
          </h1>
        </Reveal>

        <Reveal variant="up" delay={0.3}>
          <p className="text-white/60 text-base sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            קהילה של מעצבות פנים ואדריכליות, ספקים נבחרים, ופרויקטים מרהיבים —
            הכל במקום אחד.
          </p>
        </Reveal>

        <Reveal variant="up" delay={0.45}>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <MagneticButton
              as="a"
              href="/projects"
              strength={0.35}
              halo
              className="px-8 py-4 rounded-full bg-[#C9A84C] hover:bg-[#E8C97A] text-black font-bold text-sm shadow-lg shadow-[#C9A84C]/25 transition-colors"
            >
              גלו את הפרויקטים
              <ArrowLeft className="w-4 h-4 ml-2" />
            </MagneticButton>
            <MagneticButton
              as="a"
              href="/register"
              strength={0.3}
              className="px-8 py-4 rounded-full border border-white/20 hover:border-[#C9A84C]/60 text-white hover:text-[#C9A84C] font-semibold text-sm transition-colors"
            >
              הצטרפו לקהילה
            </MagneticButton>
          </div>
        </Reveal>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 flex flex-col items-center gap-2 text-[10px] tracking-[0.3em] uppercase"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <span>גלילה</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="w-4 h-4" />
        </motion.div>
      </motion.div>
    </section>
    </DepthSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTRO — editorial block with scroll-progress type reveal

function IntroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.2"],
  });

  // Progress-driven "underline" word that fills with gold as user scrolls.
  const underlineWidth = useTransform(scrollYProgress, [0.2, 0.8], ["0%", "100%"]);

  return (
    <DepthSection
      image={DEPTH_IMAGES.livingGallery}
      speed={0.35}
      opacity={0.09}
      overlayTone="dark"
    >
    <section
      ref={ref}
      className="relative py-32 sm:py-44 px-4 sm:px-6 max-w-5xl mx-auto"
    >
      <Reveal variant="up" amount={0.3}>
        <p className="text-[11px] tracking-[0.3em] uppercase text-[#C9A84C]/80 mb-4 font-semibold">
          על הקהילה
        </p>
      </Reveal>

      <Reveal variant="up" amount={0.25} duration={0.9}>
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-bold leading-[1.15] tracking-tight">
          קהילה שיודעת שעיצוב פנים זה{" "}
          <span className="relative inline-block">
            יותר מחדרים
            <motion.span
              style={{ width: underlineWidth }}
              className="absolute left-0 -bottom-1 h-[3px] bg-gradient-to-r from-[#C9A84C] to-[#E8C97A]"
            />
          </span>
          {" "}— זה חיים.
        </h2>
      </Reveal>

      <RevealStagger className="mt-10 grid sm:grid-cols-2 gap-8" stagger={0.1}>
        <p className="text-white/65 leading-relaxed text-base sm:text-lg">
          זירת האדריכלות היא קהילה ישראלית של מעצבות פנים, אדריכליות וספקי
          איכות. במקום להתחרות, אנחנו משתפים, לומדים ומרימות אחת את השנייה.
        </p>
        <p className="text-white/65 leading-relaxed text-base sm:text-lg">
          הפלטפורמה מציגה פרויקטים אמיתיים, מחברת בין מעצבות לספקים שעובדים בפועל
          עם הקהילה, ומספקת כלים שעוזרים לכל אחת מאיתנו לנהל את העסק שלה בכבוד.
        </p>
      </RevealStagger>
    </section>
    </DepthSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GALLERY

function GallerySection({
  items,
  onTileClick,
  loading,
}: {
  items: MasonryItem[];
  onTileClick: (i: number) => void;
  loading: boolean;
}) {
  return (
    <section className="relative py-20 sm:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <Reveal variant="up" amount={0.3}>
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#C9A84C]/80 mb-3 font-semibold">
            גלריית פרויקטים
          </p>
        </Reveal>
        <Reveal variant="up" amount={0.25} duration={0.9}>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-heading font-bold tracking-tight mb-12 sm:mb-16 max-w-3xl leading-[1.05]">
            עבודות של{" "}
            <span className="bg-gradient-to-r from-[#C9A84C] via-[#E8C97A] to-[#C9A84C] bg-clip-text text-transparent">
              המעצבות
            </span>{" "}
            של הקהילה
          </h2>
        </Reveal>

        {loading ? (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
            {["h-72", "h-96", "h-64", "h-80", "h-72", "h-96"].map((h, i) => (
              <div
                key={i}
                className={`bg-[#1a1a2e] rounded-2xl mb-5 animate-pulse ${h} break-inside-avoid`}
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
            <p className="text-white/30 text-sm">אין פרויקטים להצגה כרגע</p>
          </div>
        ) : (
          <MasonryGallery
            items={items}
            onItemClick={onTileClick}
            columns={{ base: 1, sm: 2, lg: 3 }}
            layoutIdPrefix="masonry"
          />
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS — count-up numbers that trigger on view

function StatsSection() {
  return (
    <DepthSection
      image={DEPTH_IMAGES.modernFacade}
      speed={0.4}
      opacity={0.09}
      overlayTone="dark"
    >
    <section className="relative py-24 sm:py-36 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal variant="up" amount={0.3}>
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#C9A84C]/80 mb-3 font-semibold text-center">
            הקהילה במספרים
          </p>
        </Reveal>

        <Reveal variant="up" amount={0.25} duration={0.9}>
          <h2 className="text-3xl sm:text-5xl font-heading font-bold text-center mb-14 sm:mb-20 tracking-tight">
            כל מספר,{" "}
            <span className="bg-gradient-to-r from-[#C9A84C] via-[#E8C97A] to-[#C9A84C] bg-clip-text text-transparent">
              סיפור
            </span>
          </h2>
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <StatCard icon={<Users className="w-5 h-5" />} value={120} label="מעצבות בקהילה" suffix="+" />
          <StatCard icon={<Building2 className="w-5 h-5" />} value={340} label="פרויקטים שהוצגו" suffix="+" />
          <StatCard icon={<Star className="w-5 h-5" />} value={85} label="ספקים נבחרים" suffix="+" />
          <StatCard icon={<Sparkles className="w-5 h-5" />} value={98} label="שביעות רצון" suffix="%" />
        </div>
      </div>
    </section>
    </DepthSection>
  );
}

function StatCard({
  icon,
  value,
  label,
  suffix = "",
}: {
  icon: ReactNode;
  value: number;
  label: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const count = useMotionValue(0);
  const [display, setDisplay] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    const controls = animate(count, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value, count, reduced]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl border border-white/8 bg-gradient-to-br from-white/[0.03] to-transparent p-6 sm:p-8 text-center overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#C9A84C]/0 to-[#C9A84C]/0 group-hover:from-[#C9A84C]/5 transition-all duration-500" />
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <div className="text-4xl sm:text-6xl font-heading font-bold tabular-nums bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
          {display.toLocaleString()}
          {suffix}
        </div>
        <p className="text-white/50 text-xs sm:text-sm mt-2 tracking-wide">
          {label}
        </p>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA

function ClosingCTA() {
  return (
    <DepthSection
      image={DEPTH_IMAGES.beachHouse}
      speed={0.55}
      opacity={0.12}
      overlayTone="brand"
      blur
    >
    <section className="relative py-32 sm:py-44 px-4 sm:px-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.15),transparent_55%)] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        <Reveal variant="up" amount={0.3}>
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#C9A84C]/80 mb-4 font-semibold">
            הצטרפו
          </p>
        </Reveal>

        <Reveal variant="blur" amount={0.3} duration={0.9}>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-heading font-bold leading-[1.05] tracking-tight mb-6">
            הפרויקט הבא שלכן —{" "}
            <span className="bg-gradient-to-r from-[#C9A84C] via-[#E8C97A] to-[#C9A84C] bg-clip-text text-transparent">
              כאן יתחיל
            </span>
          </h2>
        </Reveal>

        <Reveal variant="up" amount={0.3} delay={0.2}>
          <p className="text-white/60 text-base sm:text-lg max-w-xl mx-auto mb-12 leading-relaxed">
            פלטפורמה אחת לניהול העסק, לחלוק פרויקטים, ולעבוד עם ספקי איכות.
          </p>
        </Reveal>

        <Reveal variant="up" amount={0.3} delay={0.35}>
          <MagneticButton
            as="a"
            href="/register"
            strength={0.35}
            halo
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-[#C9A84C] hover:bg-[#E8C97A] text-black font-bold text-base shadow-xl shadow-[#C9A84C]/25 transition-colors"
          >
            להצטרפות לקהילה
            <ArrowLeft className="w-4 h-4" />
          </MagneticButton>
        </Reveal>
      </div>
    </section>
    </DepthSection>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer

function FooterMini() {
  return (
    <footer className="bg-[#050505] py-10 px-4 border-t border-white/5">
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
  );
}
