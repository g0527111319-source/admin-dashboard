"use client";

import { useState, useEffect, useRef } from "react";
import { type Lang, getClientLang, setClientLang } from "@/lib/client-portal-i18n";

const LANGUAGES: { code: Lang; flag: string; label: string }[] = [
  { code: "he", flag: "\u{1F1EE}\u{1F1F1}", label: "\u05E2\u05D1\u05E8\u05D9\u05EA" },
  { code: "ar", flag: "\u{1F1F8}\u{1F1E6}", label: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629" },
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", label: "English" },
];

interface ClientLanguageSwitcherProps {
  onChange?: (lang: Lang) => void;
}

export default function ClientLanguageSwitcher({ onChange }: ClientLanguageSwitcherProps) {
  const [lang, setLang] = useState<Lang>("he");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLang(getClientLang());
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (code: Lang) => {
    setLang(code);
    setClientLang(code);
    setOpen(false);
    onChange?.(code);
  };

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
                   bg-white border border-gray-200 hover:border-gold/40
                   text-text-primary hover:text-gold transition-all duration-200 shadow-sm"
        title="Language"
      >
        <span className="text-sm">{current.flag}</span>
        <span className="font-medium">{current.label}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 right-0 min-w-[140px]
                      bg-white border border-gray-200 rounded-xl shadow-lg
                      overflow-hidden z-50"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors
                ${lang === l.code
                  ? "bg-gold/10 text-gold font-semibold"
                  : "text-text-primary hover:bg-gray-50"
                }`}
            >
              <span className="text-sm">{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
