"use client";
/* eslint-disable @next/next/no-img-element */
interface LogoProps {
    size?: "sm" | "md" | "lg" | "xl";
    variant?: "dark" | "light";
    showText?: boolean;
}
export default function Logo({ size = "md", variant = "dark", showText = true }: LogoProps) {
    const imgSizes = { sm: 48, md: 56, lg: 120, xl: 180 };
    void variant;
    void showText;
    return (<div className="flex items-center justify-center">
      <img src="/logo-sticker.webp" alt="זירת האדריכלות" width={imgSizes[size]} height={imgSizes[size]} className="flex-shrink-0 object-contain" style={{ background: "transparent" }}/>
    </div>);
}
