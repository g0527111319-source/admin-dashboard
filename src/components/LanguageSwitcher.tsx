"use client";

import { useState, useEffect, useRef } from "react";
import { type Lang, getSavedLang, saveLang, isRtl } from "@/lib/i18n";

const LANGUAGES: { code: Lang; flag: string; label: string }[] = [
  { code: "he", flag: "\u{1F1EE}\u{1F1F1}", label: "עברית" },
  { code: "ar", flag: "\u{1F1F8}\u{1F1E6}", label: "العربية" },
  { code: "en", flag: "\u{1F1EC}\u{1F1E7}", label: "English" },
];

export default function LanguageSwitcher() {
  const [lang, setLang] = useState<Lang>("he");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLang(getSavedLang());
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
    saveLang(code);
    setOpen(false);

    // Update html attributes live
    const html = document.documentElement;
    html.lang = code;
    html.dir = isRtl(code) ? "rtl" : "ltr";

    // Optionally trigger a page-level re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent("lang-change", { detail: code }));
  };

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
                   bg-[#1a1a2e]/60 border border-[#c9a84c]/20 hover:border-[#c9a84c]/40
                   text-white/70 hover:text-white transition-all duration-200"
        title="שפה"
      >
        <span className="text-sm">{current.flag}</span>
        <span className="hidden sm:inline font-medium">{current.label}</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 min-w-[120px]
                        bg-[#1a1a2e] border border-[#c9a84c]/30 rounded-xl shadow-2xl
                        overflow-hidden z-50 animate-in"
             style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors
                ${lang === l.code
                  ? "bg-[#c9a84c]/15 text-[#c9a84c] font-semibold"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
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
