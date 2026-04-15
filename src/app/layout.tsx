import type { Metadata } from "next";
import { Heebo, Assistant, Frank_Ruhl_Libre } from "next/font/google";
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

export const metadata: Metadata = {
    title: "זירת האדריכלות | קהילה שהיא בית",
    description: "מערכת ניהול קהילת מעצבות פנים ואדריכליות — זירת האדריכלות",
    icons: {
        icon: "/favicon.ico",
    },
};
export default function RootLayout({ children, }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="he" dir="rtl" suppressHydrationWarning className={`${heebo.variable} ${assistant.variable} ${frankRuhlLibre.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="google-site-verification" content="yfcoIh96qYOARTamBbB2-Tq1ZTWaNmkdUce1stOym1s" />
        <meta name="theme-color" content="#C9A84C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/logo-sticker.webp" />
        {/* Inline script prevents FOUC when user has chosen dark mode */}
        <script dangerouslySetInnerHTML={{ __html: ThemeScript }} />
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
