"use client";

import Logo from "@/components/ui/Logo";
import DepthSection from "@/components/motion/DepthSection";
import { DEPTH_IMAGES } from "@/lib/depth-images";
import {
  TwistButton,
  Eyebrow,
  GoldText,
  DsCard,
} from "@/components/ds";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Users,
  Briefcase,
  Store,
  Calendar,
  Gem,
  ShieldCheck,
  ChevronDown,
  Heart,
  Home,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

/* ──────────────────────────────────────────────────────────────
   אנימציות משותפות — fade-up עם stagger
   ────────────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.08 * i,
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

const fadeScale = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: (i: number = 0) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.1 * i,
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

/* ──────────────────────────────────────────────────────────────
   תוכן האתר
   ────────────────────────────────────────────────────────────── */
type Pillar = {
  icon: typeof Heart;
  title: string;
  desc: string;
  tint: string;
  highlight?: boolean;
};

const pillars: Pillar[] = [
  {
    icon: Heart,
    title: "קהילה שהיא בית",
    desc: "מרחב חם ואיכותי למעצבות פנים ואדריכלות בישראל — היכרות, השראה ותמיכה יומית.",
    tint: "from-[#FBF7ED] to-white",
  },
  {
    icon: Briefcase,
    title: "CRM מתקדם למעצבות",
    desc: "מערכת ניהול לקוחות מלאה — פרויקטים, חוזים, הצעות מחיר, תשלומים ותקשורת במקום אחד.",
    tint: "from-[#F5ECD3] to-white",
  },
  {
    icon: Store,
    title: "ספקים מובחרים",
    desc: "קטלוג ספקים שעברו סינון קפדני — נגרים, שיש, אריחים, חשמל ועוד.",
    tint: "from-[#FDF8E8] to-white",
  },
  {
    icon: Calendar,
    title: "אירועים והכשרות",
    desc: "מפגשים פיזיים, סדנאות, הרצאות מקצועיות ונטוורקינג — רמת היוקרה של המקצוע.",
    tint: "from-[#FBF4DD] to-white",
  },
];

const stats = [
  { value: "+1200", label: "מעצבות מובילות" },
  { value: "+50", label: "ספקים מובילים" },
  { value: "24/6", label: "עזרה הדדית" },
  { value: "+60", label: "הצעות עבודה למעצבות בשנה" },
] as const;

/* ──────────────────────────────────────────────────────────────
   רכיב: עמוד הבית
   ────────────────────────────────────────────────────────────── */
export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-text-primary overflow-hidden" dir="rtl">
      {/* ═══════════════════════════════════════════════════════
          TOP BAR — לוגו + כפתור ניהול דיסקרטי
          ═══════════════════════════════════════════════════════ */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-white/60 border-b border-gold/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" variant="light" />
          </div>
          <Link
            href="/login?role=admin"
            className="group flex items-center gap-1.5 text-[11px] tracking-[0.25em] uppercase text-text-muted/70 hover:text-gold transition-colors duration-300"
            aria-label="כניסת ניהול"
          >
            <ShieldCheck className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            <span>ניהול</span>
          </Link>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════
          HERO — קרם, זהב, אוויר
          ═══════════════════════════════════════════════════════ */}
      <DepthSection
        image={DEPTH_IMAGES.brightVilla}
        speed={0.35}
        opacity={0.08}
        overlayTone="none"
        fullHeight
        className="bg-gradient-to-b from-[#FDFCFA] via-[#FAF9F6] to-[#F5ECD3]/30"
      >
        <section ref={heroRef} className="relative isolate min-h-screen pt-16">
          {/* אורות זהב רכים ברקע */}
          <motion.div
            className="absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-gold/20 blur-[140px] pointer-events-none"
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-1/3 -right-32 w-[380px] h-[380px] rounded-full bg-[#E8C97A]/25 blur-[120px] pointer-events-none"
            animate={{ scale: [1.05, 1, 1.05], opacity: [0.45, 0.65, 0.45] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />

          {/* שבכת נקודות עדינה */}
          <div className="absolute inset-0 opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,#C9A84C_1px,transparent_0)] [background-size:38px_38px] pointer-events-none" />

          {/* קו זהב עליון */}
          <div className="absolute top-16 left-0 right-0 h-[2px] bg-gradient-to-l from-transparent via-gold to-transparent opacity-60" />

          <motion.div
            style={{ y: heroY, opacity: heroOpacity }}
            className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-24 text-center"
          >
            {/* לוגו ראשי */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeScale}
              custom={0}
              className="flex justify-center mb-8"
            >
              <div className="relative">
                <div className="absolute -inset-8 bg-gold/20 blur-3xl rounded-full opacity-50" />
                <div className="relative">
                  <Logo size="xl" variant="light" />
                </div>
              </div>
            </motion.div>

            {/* תג יוקרה */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={1}
              className="mb-8 inline-flex items-center justify-center"
            >
              <Eyebrow className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/70 backdrop-blur-sm px-5 py-2 shadow-sm">
                <Gem className="w-3.5 h-3.5 text-gold" />
                הקהילה היוקרתית של אדריכלות הפנים בישראל
              </Eyebrow>
            </motion.div>

            {/* כותרת ראשית — שילוב פונטים יוקרתי */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={2}
              className="leading-[1.02] text-[2.75rem] sm:text-6xl lg:text-[5.5rem] text-[#1a1410] tracking-tight"
            >
              <span className="font-suez">כשעולם העיצוב</span>
              <GoldText className="block mt-4 font-bellefair">
                פוגש משפחה
              </GoldText>
            </motion.h1>

            {/* תיאור פואטי */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={3}
              className="mt-8 text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed font-rubik"
            >
              מרחב אחד למעצבות פנים ואדריכלות — <span className="text-gold-dim font-medium">קהילה חמה</span>,
              מערכת <span className="text-gold-dim font-medium">CRM מקצועית</span> לניהול לקוחות,
              ספקים מובחרים ואירועים שמרימים את המקצוע לרמה אחרת.
            </motion.p>

            {/* כפתורי פעולה ראשיים */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={4}
              className="mt-12 flex flex-col sm:flex-row gap-4 items-center justify-center"
            >
              {/* CTA ראשי — כניסה לאזור אישי */}
              <TwistButton href="/login" variant="primary" size="lg">
                <span className="inline-flex items-center gap-3">
                  <Sparkles className="w-5 h-5" />
                  <span>כניסה לאזור אישי</span>
                  <ArrowLeft className="w-5 h-5" />
                </span>
              </TwistButton>

              {/* CTA משני — הרשמה */}
              <TwistButton href="/register" variant="secondary" size="lg">
                <span className="inline-flex items-center gap-2">
                  <span>להצטרפות לקהילה</span>
                  <ArrowLeft className="w-4 h-4" />
                </span>
              </TwistButton>
            </motion.div>

            {/* CTA ייעודי ללקוחות פרטיים — "אני מחפש מעצבת" */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={4.5}
              className="mt-6 flex items-center justify-center"
            >
              <TwistButton href="/find-designer" variant="secondary" size="md">
                <span className="inline-flex items-center gap-3">
                  <Home className="w-5 h-5" />
                  <span>אני מחפש/ת מעצבת לפרויקט שלי</span>
                  <ArrowLeft className="w-4 h-4" />
                </span>
              </TwistButton>
            </motion.div>

            {/* מספרים */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={5}
              className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
            >
              {stats.map((item, i) => (
                <motion.div
                  key={item.label}
                  custom={6 + i}
                  variants={fadeUp}
                  className="relative rounded-2xl border border-gold/15 bg-white/60 backdrop-blur-sm px-4 py-5 shadow-[0_10px_30px_rgba(201,168,76,0.06)] hover:shadow-[0_15px_40px_rgba(201,168,76,0.12)] hover:-translate-y-1 transition-all duration-500 group"
                >
                  <div className="text-2xl sm:text-3xl font-heading font-bold bg-gradient-to-l from-[#8B6914] to-gold bg-clip-text text-transparent">
                    {item.value}
                  </div>
                  <div className="mt-1.5 text-xs sm:text-sm text-text-muted leading-snug">{item.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* חץ גלילה */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 0.6, y: 0 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-1.5 text-gold/70 text-[10px] tracking-[0.3em] uppercase"
            >
              <span>גלול</span>
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </section>
      </DepthSection>

      {/* ═══════════════════════════════════════════════════════
          SECTION — מה זה זירת האדריכלות?
          ═══════════════════════════════════════════════════════ */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#FDFCFA] to-[#FAF9F6] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="mb-6 inline-flex items-center justify-center gap-2"
          >
            <div className="h-px w-10 bg-gold/40" />
            <Eyebrow>מה זה זירת האדריכלות?</Eyebrow>
            <div className="h-px w-10 bg-gold/40" />
          </motion.div>

          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl lg:text-6xl text-[#1a1410] leading-[1.1] mb-8"
          >
            <span className="font-suez">הרבה יותר מקהילה.</span>
            <GoldText className="block mt-3 font-bellefair">
              כל מה שצריך במקום אחד.
            </GoldText>
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={2}
            className="text-lg sm:text-xl text-text-secondary leading-relaxed max-w-3xl mx-auto"
          >
            זירת האדריכלות היא הבית של מעצבות הפנים והאדריכלות בישראל —
            קהילה חמה שחיה ונושמת, ובצמוד אליה <strong className="text-gold-dim">מערכת CRM מלאה</strong> שמנהלת עבורך את
            הלקוחות, הפרויקטים, הצעות המחיר, החוזים, התשלומים והתקשורת —
            הכל בממשק אחד, בעברית, ובסטנדרט של מעצבות אמיתיות.
          </motion.p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          PILLARS — ארבעה עמודי תווך
          ═══════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-[#FAF9F6] to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeScale}
                  custom={i}
                  className={`group relative rounded-[28px] p-7 sm:p-8 bg-gradient-to-br ${p.tint} border transition-all duration-500 hover:-translate-y-2 ${
                    p.highlight
                      ? "border-gold/50 shadow-[0_20px_50px_rgba(201,168,76,0.18)] hover:shadow-[0_28px_60px_rgba(201,168,76,0.28)]"
                      : "border-gold/15 shadow-[0_10px_30px_rgba(26,20,16,0.04)] hover:shadow-[0_20px_45px_rgba(26,20,16,0.08)] hover:border-gold/30"
                  }`}
                >
                  {p.highlight && (
                    <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-gradient-to-l from-[#8B6914] to-gold text-white text-[10px] font-bold tracking-[0.2em] uppercase shadow-md">
                      חדש
                    </div>
                  )}

                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-gold/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <Icon className="w-6 h-6 text-gold-dim" />
                  </div>

                  <h3 className="font-secular text-xl text-[#1a1410] mb-3">{p.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed font-rubik">{p.desc}</p>

                  <div className="mt-6 h-px bg-gradient-to-l from-transparent via-gold/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          CLOSING CTA — הזמנה חמה להצטרף
          ═══════════════════════════════════════════════════════ */}
      <section className="relative py-24 sm:py-32 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FDFCFA] via-[#FBF4DD] to-[#F5ECD3]" />

        {/* אורות רקע */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-gold/15 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#E8C97A]/20 blur-[120px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeUp}
          >
            <Users className="w-10 h-10 text-gold mx-auto mb-6" />

            <h2 className="text-4xl sm:text-5xl lg:text-6xl text-[#1a1410] leading-tight mb-6">
              <span className="font-suez">מוכנות להיות</span>
              <GoldText className="block mt-3 font-bellefair">
                חלק מהבית?
              </GoldText>
            </h2>

            <p className="text-lg sm:text-xl text-text-secondary leading-relaxed mb-10 max-w-2xl mx-auto">
              הצטרפי למאות מעצבות שכבר מנהלות את העסק שלהן בצורה חכמה יותר —
              ומרגישות בבית.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <TwistButton href="/register" variant="primary" size="lg">
                <span className="inline-flex items-center gap-3">
                  <Sparkles className="w-5 h-5" />
                  <span>בואי להצטרף</span>
                  <ArrowLeft className="w-5 h-5" />
                </span>
              </TwistButton>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-4 text-gold-dim font-medium hover:text-gold transition-colors"
              >
                <span>כבר חלק מהקהילה? כניסה</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER — דיסקרטי, אוורירי
          ═══════════════════════════════════════════════════════ */}
      <footer className="relative bg-[#FAF9F6] border-t border-gold/10 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <Logo size="sm" variant="light" />
            <p className="font-bellefair text-base text-gold-dim">קהילה שהיא בית</p>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <Link
              href="/privacy"
              className="text-text-muted hover:text-gold transition-colors"
              aria-label="Privacy Policy - מדיניות פרטיות"
              title="Privacy Policy"
            >
              פרטיות (Privacy Policy)
            </Link>
            <Link
              href="/terms"
              className="text-text-muted hover:text-gold transition-colors"
              aria-label="Terms of Service - תנאי שימוש"
              title="Terms of Service"
            >
              תנאי שימוש (Terms of Service)
            </Link>
            <Link
              href="/accessibility"
              className="text-text-muted hover:text-gold transition-colors"
              aria-label="Accessibility Statement"
            >
              נגישות
            </Link>
            <span className="text-text-muted/60">© 2026 זירת האדריכלות</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
