"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LogOut, Loader2, X } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // proceed to /login regardless — local cookie should be cleared by server
    }
    router.push("/login");
  };

  const dialog = open ? (
    <div
      className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="יציאה מהחשבון"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) setOpen(false);
      }}
      dir="rtl"
    >
      <div className="bg-bg-card border border-border-subtle rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="font-heading font-bold text-text-primary flex items-center gap-2">
            <LogOut className="w-5 h-5 text-red-500" />
            יציאה מהחשבון
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-bg-surface-2 text-text-muted disabled:opacity-50"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-5 text-text-primary">
          האם הנך רוצה לצאת מהחשבון?
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface-2 disabled:opacity-50"
          >
            לא
          </button>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            כן, יציאה
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="p-2 rounded-xl hover:bg-bg-surface-2 transition-colors text-text-muted hover:text-red-500"
        aria-label="יציאה מהחשבון"
        title="יציאה מהחשבון"
      >
        <LogOut className="w-5 h-5" />
      </button>
      {mounted && dialog && createPortal(dialog, document.body)}
    </>
  );
}
