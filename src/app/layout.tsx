import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import AccessibilityWidget from "@/components/AccessibilityWidget";
import GlobalSearch from "@/components/GlobalSearch";
import "./globals.css";
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
    return (<html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C9A84C" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/logo-sticker.webp" />
        {/* i18n: client portal uses its own language switcher via client-portal-lang key */}
      </head>
      <body className="font-body antialiased min-h-screen bg-bg text-text-primary">
        {children}
        <GlobalSearch />
        <AccessibilityWidget />
        <Analytics />
      </body>
    </html>);
}
