import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // === DESIGN SYSTEM v3.0 — זירת האדריכלות ===
        // Premium Luxury Palette — gold / cream / ink
        bg: {
          DEFAULT: "#FAF9F6",       // cream (main background)
          card: "#FDFCFA",          // cream-3
          "card-hover": "#FFFBEF",
          surface: "#F5ECD3",       // cream-2 (warm card bg)
          "surface-2": "#EEDBA8",
          sidebar: "#1a1410",       // ink (dark sidebar)
          dark: "#0e0b08",          // deep ink
          "dark-surface": "#1a1410",
        },
        cream: {
          DEFAULT: "#FAF9F6",
          50: "#FDFCFA",
          100: "#F5ECD3",
          200: "#EEDBA8",
        },
        ink: {
          DEFAULT: "#1a1410",
          2: "#2a1f17",
          muted: "#6a5020",
          deep: "#0e0b08",
        },
        gold: {
          DEFAULT: "#C9A84C",
          light: "#E8C97A",
          dim: "#8B6914",
          deep: "#5A4608",
          dark: "#7A6520",
          50: "#FBF7ED",
          100: "#F5ECD3",
          200: "#EEDBA8",
          500: "#C9A84C",
          600: "#B8952F",
          700: "#8B6914",
          800: "#5A4608",
        },
        "text-primary": "#1a1410",
        "text-secondary": "#2a1f17",
        "text-muted": "#6a5020",
        "text-faint": "#8B6914",
        "border-subtle": "rgba(201, 168, 76, 0.20)",
        "border-hover": "rgba(201, 168, 76, 0.40)",
        "border-gold": "rgba(201, 168, 76, 0.25)",
        // Section Accent Colors
        accent: {
          crm: "#C9A84C",        // זהב — CRM
          community: "#8B5CF6",  // סגול — קהילה
          design: "#14B8A6",     // טורקיז — עיצוב
          system: "#64748B",     // כחול-אפור — מערכת
        },
      },
      fontFamily: {
        // next/font CSS variables injected on <html> in layout.tsx
        heading: ["var(--font-frank-ruhl)", '"Frank Ruhl Libre"', "Georgia", "serif"],
        body: ["var(--font-heebo)", '"Heebo"', "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["var(--font-frank-ruhl)", '"Frank Ruhl Libre"', "Georgia", "serif"],
        accent: ["var(--font-frank-ruhl)", '"Frank Ruhl Libre"', "Georgia", "serif"],
        sans: ["var(--font-heebo)", '"Heebo"', "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        assistant: ["var(--font-assistant)", '"Assistant"', "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "monospace"],
        // פונטים עבריים מ-Google Fonts — תמיכה מאומתת בעברית
        rubik: ["var(--font-rubik)", '"Rubik"', "sans-serif"],            // מודרני נקי
        secular: ["var(--font-secular)", '"Secular One"', "sans-serif"],  // תצוגה אלגנטית
        bellefair: ["var(--font-bellefair)", '"Bellefair"', "serif"],     // סריף דק יוקרתי
        david: ["var(--font-david)", '"David Libre"', "serif"],           // ספר מסורתי
        suez: ["var(--font-suez)", '"Suez One"', "sans-serif"],           // תצוגה מאסיבית
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
        "xs": ["0.75rem", { lineHeight: "1.125rem" }],
        "sm": ["0.875rem", { lineHeight: "1.375rem" }],
        "base": ["1rem", { lineHeight: "1.625rem" }],
        "lg": ["1.125rem", { lineHeight: "1.75rem" }],
        "xl": ["1.25rem", { lineHeight: "1.875rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.01em" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "4xl": ["2.25rem", { lineHeight: "2.625rem", letterSpacing: "-0.02em" }],
        "5xl": ["3rem", { lineHeight: "3.375rem", letterSpacing: "-0.03em" }],
        "6xl": ["3.75rem", { lineHeight: "4rem", letterSpacing: "-0.03em" }],
      },
      letterSpacing: {
        "tightest": "-0.04em",
        "tighter": "-0.03em",
        "tight": "-0.02em",
        "snug": "-0.01em",
        "normal": "0em",
        "wide": "0.025em",
        "wider": "0.05em",
        "widest": "0.1em",
        "luxury": "0.15em",
      },
      lineHeight: {
        "tight": "1.2",
        "snug": "1.3",
        "normal": "1.5",
        "relaxed": "1.625",
        "loose": "1.75",
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
      },
      boxShadow: {
        "xs": "0 1px 2px rgba(0,0,0,0.03)",
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        gold: "0 4px 20px rgba(201, 168, 76, 0.12)",
        "gold-hover": "0 8px 32px rgba(201, 168, 76, 0.18)",
        "gold-glow": "0 0 40px rgba(201, 168, 76, 0.12)",
        soft: "0 2px 12px rgba(0,0,0,0.04)",
        elevated: "0 8px 30px rgba(0,0,0,0.08)",
        "premium": "0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        "premium-lg": "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #C9A84C, #E8C97A, #C9A84C)",
        "gold-shimmer": "linear-gradient(90deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)",
        "gold-subtle": "linear-gradient(135deg, #C9A84C 0%, #D4B65E 100%)",
        // Design System brand gradient — used in gold-text and primary buttons
        "brand-gradient":
          "linear-gradient(90deg, #5A4608 0%, #8B6914 25%, #C9A84C 50%, #E8C97A 75%, #C9A84C 100%)",
        "twist-primary":
          "linear-gradient(135deg, #F5D77F 0%, #C9A84C 40%, #8B6914 80%, #5A4608 100%)",
        "twist-secondary":
          "linear-gradient(135deg, #FFFDF6 0%, #FAF2DD 55%, #F5ECD3 100%)",
        "card-highlight": "linear-gradient(145deg, #FFFBEF, #F5ECD3)",
        "hero-gradient": "linear-gradient(135deg, #1a1410 0%, #0e0b08 100%)",
        "warm-gradient": "linear-gradient(135deg, #FAF9F6 0%, #F5ECD3 100%)",
        "card-gradient": "linear-gradient(180deg, #FDFCFA 0%, #F5ECD3 100%)",
      },
      spacing: {
        "sidebar": "260px",
        "sidebar-collapsed": "72px",
        "header": "64px",
      },
      animation: {
        "fade-in": "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "gold-pulse": "goldPulse 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        // Design System v3.0
        "aurora-drift": "auroraDrift 24s ease-in-out infinite",
        "gold-sheen": "goldSheen 6s linear infinite",
        "logo-draw": "logoDraw 1.6s ease forwards",
        // v3.0 — Premium Animations
        shimmer: "shimmer 2s ease-in-out infinite",
        "gold-glow": "goldGlow 2s ease-in-out infinite",
        "gradient-shift": "gradientShift 3s ease infinite",
        "bounce-in": "bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "slide-right": "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        ripple: "rippleEffect 0.6s linear",
        "pulse-ring": "pulseRing 1.5s ease-out infinite",
        "float-subtle": "floatSubtle 3s ease-in-out infinite",
        "border-glow": "borderGlow 2s ease-in-out infinite",
        "count-up": "countUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        "modal-enter": "modalEnter 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "notification-pulse": "notificationPulse 2s ease-in-out infinite",
        shake: "shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        goldPulse: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(201, 168, 76, 0.12)" },
          "50%": { boxShadow: "0 0 24px 6px rgba(201, 168, 76, 0.08)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        // v3.0 — Premium Keyframes
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        goldGlow: {
          "0%, 100%": { boxShadow: "0 0 5px rgba(201, 168, 76, 0.2), 0 0 20px rgba(201, 168, 76, 0.1)" },
          "50%": { boxShadow: "0 0 20px rgba(201, 168, 76, 0.4), 0 0 40px rgba(201, 168, 76, 0.2)" },
        },
        gradientShift: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        bounceIn: {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        rippleEffect: {
          "0%": { transform: "scale(0)", opacity: "0.5" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        floatSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        borderGlow: {
          "0%, 100%": { borderColor: "rgba(201, 168, 76, 0.3)" },
          "50%": { borderColor: "rgba(201, 168, 76, 0.8)" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        modalEnter: {
          "0%": { opacity: "0", transform: "scale(0.9) translateY(20px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        notificationPulse: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.2)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
        // Design System v3.0 — aurora blobs drift on landing pages
        auroraDrift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(40px, -30px) scale(1.1)" },
          "66%": { transform: "translate(-30px, 40px) scale(0.95)" },
        },
        // Gold text sheen — runs on gold-text utility for that subtle shine
        goldSheen: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        // Logo stroke draw-in
        logoDraw: {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
