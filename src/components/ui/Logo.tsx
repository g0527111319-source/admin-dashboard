"use client";
/* eslint-disable @next/next/no-img-element */
interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "dark" | "light";
    showText?: boolean;
}
export default function Logo({ size = "md", variant = "dark", showText = true }: LogoProps) {
    // גדלים מותאמים — הלוגו כולל את הטקסט בתוך התמונה
    const imgSizes = { sm: 100, md: 140, lg: 180, xl: 260 };
    void variant;
    void showText;
    return (<div className="flex items-center justify-center">
      <img src="/logo.png" alt="\u05D6\u05D9\u05E8\u05EA \u05D4\u05D0\u05D3\u05E8\u05D9\u05DB\u05DC\u05D5\u05EA" width={imgSizes[size]} height={imgSizes[size]} className="flex-shrink-0 object-contain"/>
    </div>);
}
