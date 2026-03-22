import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
    title: "\u05D6\u05D9\u05E8\u05EA \u05D4\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D5\u05EA | \u05E7\u05D4\u05D9\u05DC\u05D4 \u05E9\u05D4\u05D9\u05D0 \u05D1\u05D9\u05EA",
    description: "\u05DE\u05E2\u05E8\u05DB\u05EA \u05E0\u05D9\u05D4\u05D5\u05DC \u05E7\u05D4\u05D9\u05DC\u05EA \u05DE\u05E2\u05E6\u05D1\u05D5\u05EA \u05E4\u05E0\u05D9\u05DD \u05D5\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D9\u05D5\u05EA \u2014 \u05D6\u05D9\u05E8\u05EA \u05D4\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D5\u05EA",
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
      </body>
    </html>);
}
