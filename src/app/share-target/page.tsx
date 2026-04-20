"use client";

// Share-target landing — receives GET params from the PWA/TWA Web Share Target API.
// When the user shares a URL/text/title from another Android app into the installed
// "זירת האדריכלות" TWA, Android routes that share to this page via the manifest
// entry "share_target". We render the payload and offer a CTA into the app.

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Share2, ArrowLeft, Home, FolderPlus } from "lucide-react";

function ShareTargetContent() {
  const params = useSearchParams();
  const title = params.get("title")?.trim() || "";
  const text = params.get("text")?.trim() || "";
  const url = params.get("url")?.trim() || "";

  const hasAny = Boolean(title || text || url);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-bg text-text-primary flex items-center justify-center px-6 py-16"
    >
      <div className="w-full max-w-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl backdrop-blur">
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#C9A84C]/20 text-[#C9A84C]">
            <Share2 className="w-6 h-6" />
          </span>
          <h1 className="text-2xl md:text-3xl font-bold">קיבלת שיתוף</h1>
        </div>

        {!hasAny ? (
          <p className="text-text-secondary leading-relaxed">
            לא התקבל תוכן לשיתוף. ניתן לשתף קישור, טקסט או פרויקט מאפליקציה אחרת ישירות ל"זירת האדריכלות".
          </p>
        ) : (
          <div className="space-y-4 mb-8">
            {title && (
              <div>
                <div className="text-xs uppercase tracking-wider text-text-secondary mb-1">כותרת</div>
                <div className="text-lg font-semibold break-words">{title}</div>
              </div>
            )}
            {text && (
              <div>
                <div className="text-xs uppercase tracking-wider text-text-secondary mb-1">תיאור</div>
                <div className="text-base whitespace-pre-wrap break-words">{text}</div>
              </div>
            )}
            {url && (
              <div>
                <div className="text-xs uppercase tracking-wider text-text-secondary mb-1">קישור</div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#C9A84C] underline break-all"
                >
                  {url}
                </a>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/designer/me"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C9A84C] text-black font-semibold hover:brightness-110 transition"
          >
            <FolderPlus className="w-5 h-5" />
            שמור לתיק עבודות
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition"
          >
            <Home className="w-5 h-5" />
            פתח ב-זירת האדריכלות
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-text-secondary hover:text-text-primary transition"
          >
            <ArrowLeft className="w-5 h-5" />
            חזרה
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense
      fallback={
        <main dir="rtl" className="min-h-screen bg-bg flex items-center justify-center">
          <div className="text-text-secondary">טוען…</div>
        </main>
      }
    >
      <ShareTargetContent />
    </Suspense>
  );
}
