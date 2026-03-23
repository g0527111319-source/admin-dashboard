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
        {/* i18n: sync html lang/dir from localStorage before paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var l=localStorage.getItem("zirat-lang");if(l==="en"){document.documentElement.lang="en";document.documentElement.dir="ltr"}else if(l==="ar"){document.documentElement.lang="ar";document.documentElement.dir="rtl"}}catch(e){}})()` }} />
      </head>
      <body className="font-body antialiased min-h-screen bg-bg text-text-primary">
        {children}
        <GlobalSearch />
        <AccessibilityWidget />
        <Analytics />
      </body>
    </html>);
}
