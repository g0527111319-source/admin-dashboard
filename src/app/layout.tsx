import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
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
    return (<html lang="he" dir="rtl">
      <body className="font-body antialiased min-h-screen bg-bg text-text-primary">
        {children}
        <Analytics />
      </body>
    </html>);
}
