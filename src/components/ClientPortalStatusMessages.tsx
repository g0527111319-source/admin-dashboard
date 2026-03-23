"use client";

import { useState, useEffect } from "react";
import { ct, getClientLang, setClientLang, type Lang } from "@/lib/client-portal-i18n";
import ClientLanguageSwitcher from "@/components/ClientLanguageSwitcher";

export function ClientPortalArchivedMessage() {
  const [lang, setLang] = useState<Lang>("he");

  useEffect(() => {
    const saved = getClientLang();
    setLang(saved);
    setClientLang(saved);
  }, []);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-end mb-4">
          <ClientLanguageSwitcher onChange={handleLangChange} />
        </div>
        <div className="text-5xl mb-6">🏠</div>
        <h1 className="text-2xl font-heading text-text-primary mb-3">{ct("projectCompleted", lang)}</h1>
        <p className="text-text-muted text-lg">{ct("thankYou", lang)}</p>
        <p className="text-text-faint text-sm mt-4">{ct("portalInactive", lang)}</p>
      </div>
    </div>
  );
}

export function ClientPortalErrorMessage() {
  const [lang, setLang] = useState<Lang>("he");

  useEffect(() => {
    const saved = getClientLang();
    setLang(saved);
    setClientLang(saved);
  }, []);

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-end mb-4">
          <ClientLanguageSwitcher onChange={handleLangChange} />
        </div>
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-2xl font-heading text-text-primary mb-2">{ct("error", lang)}</h1>
        <p className="text-text-muted">{ct("invalidOrExpiredLink", lang)}</p>
      </div>
    </div>
  );
}
