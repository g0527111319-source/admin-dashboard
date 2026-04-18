import type { Metadata } from "next";
import {
  Heebo,
  Assistant,
  Frank_Ruhl_Libre,
  Rubik,
  Secular_One,
  Bellefair,
  David_Libre,
  Suez_One,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import AccessibilityWidget from "@/components/AccessibilityWidget";
import GlobalSearch from "@/components/GlobalSearch";
import SmoothScrollProvider from "@/components/motion/SmoothScrollProvider";
import { ThemeProvider, ThemeScript } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import KeyboardShortcutsProvider from "@/components/KeyboardShortcutsProvider";
import MobileBottomNav from "@/components/MobileBottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-heebo",
  display: "swap",
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-assistant",
  display: "swap",
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-frank-ruhl",
  display: "swap",
});

// ── פונטים עבריים נוספים מ-Google — תמיכה מאומתת בעברית ──
const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-rubik",
  display: "swap",
});

const secularOne = Secular_One({
  subsets: ["hebrew", "latin"],
  weight: ["400"],
  variable: "--font-secular",
  display: "swap",
});

const bellefair = Bellefair({
  subsets: ["hebrew", "latin"],
  weight: ["400"],
  variable: "--font-bellefair",
  display: "swap",
});

const davidLibre = David_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-david",
  display: "swap",
});

const suezOne = Suez_One({
  subsets: ["hebrew", "latin"],
  weight: ["400"],
  variable: "--font-suez",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.ziratadrichalut.co.il";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: "זירת האדריכלות | קהילת מעצבות פנים ואדריכליות בישראל",
        template: "%s | זירת האדריכלות",
    },
    description:
        "זירת האדריכלות — הקהילה המקצועית הגדולה בישראל למעצבות פנים ואדריכליות. הזדמנויות עסקיות, ספקים מאומתים, אירועים מקצועיים, שיתופי פעולה וצמיחה — כל מה שמעצבת צריכה, במקום אחד.",
    keywords: [
        "מעצבת פנים",
        "עיצוב פנים",
        "אדריכלית פנים",
        "אדריכלות פנים",
        "קהילת מעצבות",
        "זירת האדריכלות",
        "ספקים לעיצוב פנים",
        "אירועים לאדריכליות",
        "שיתופי פעולה מעצבות",
        "עסקים לעיצוב פנים",
        "פורטל מעצבות פנים",
        "קורסים לאדריכלות פנים",
    ],
    authors: [{ name: "זירת האדריכלות" }],
    creator: "זירת האדריכלות",
    publisher: "זירת האדריכלות",
    applicationName: "זירת האדריכלות",
    category: "Architecture & Interior Design",
    alternates: {
        canonical: "/",
        languages: { "he-IL": "/" },
    },
    openGraph: {
        type: "website",
        locale: "he_IL",
        url: SITE_URL,
        siteName: "זירת האדריכלות",
        title: "זירת האדריכלות | קהילת מעצבות פנים ואדריכליות בישראל",
        description:
            "הקהילה המקצועית למעצבות פנים ואדריכליות — הזדמנויות עסקיות, ספקים, אירועים ושיתופי פעולה.",
        images: [
            {
                url: "/logo.png",
                width: 1200,
                height: 630,
                alt: "זירת האדריכלות",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "זירת האדריכלות | קהילת מעצבות פנים",
        description:
            "הקהילה המקצועית הגדולה בישראל למעצבות פנים ואדריכליות.",
        images: ["/logo.png"],
    },
    robots: {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
        },
    },
    icons: {
        icon: "/favicon.ico",
        apple: "/logo-sticker.webp",
    },
    verification: {
        google: "yfcoIh96qYOARTamBbB2-Tq1ZTWaNmkdUce1stOym1s",
    },
};

const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": ["Organization", "ProfessionalService"],
    "@id": `${SITE_URL}/#organization`,
    name: "זירת האדריכלות",
    alternateName: "Zirat Adrichal",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    description:
        "קהילה מקצועית של מעצבות פנים ואדריכליות בישראל — הזדמנויות עסקיות, ספקים, אירועים ושיתופי פעולה.",
    areaServed: { "@type": "Country", name: "Israel" },
    inLanguage: "he",
    sameAs: [] as string[],
};

const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "זירת האדריכלות",
    inLanguage: "he-IL",
    publisher: { "@id": `${SITE_URL}/#organization` },
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="he" dir="rtl" suppressHydrationWarning className={`${heebo.variable} ${assistant.variable} ${frankRuhlLibre.variable} ${rubik.variable} ${secularOne.variable} ${bellefair.variable} ${davidLibre.variable} ${suezOne.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="google-site-verification" content="yfcoIh96qYOARTamBbB2-Tq1ZTWaNmkdUce1stOym1s" />
        <meta name="theme-color" content="#C9A84C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/logo-sticker.webp" />
        {/* Inline script prevents FOUC when user has chosen dark mode */}
        <script dangerouslySetInnerHTML={{ __html: ThemeScript }} />
        {/* SEO: structured data for rich results in Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        {/* i18n: client portal uses its own language switcher via client-portal-lang key */}
      </head>
      <body className="font-body antialiased min-h-screen bg-bg text-text-primary">
        <ThemeProvider>
          <ToastProvider>
            <SmoothScrollProvider>{children}</SmoothScrollProvider>
            <GlobalSearch />
            <KeyboardShortcutsProvider />
            <MobileBottomNav />
            <AccessibilityWidget />
            <ServiceWorkerRegister />
            <Analytics />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>);
}
