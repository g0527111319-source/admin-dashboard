"use client";

/**
 * MobileBottomNav — 5-item bottom nav for designer workspace on mobile.
 *
 * Only rendered on small screens (<md). Reads the current URL hash to
 * highlight the active tab, and pushes hash changes when tapped so the
 * existing dashboard tab-routing keeps working.
 *
 * Items: Today / Clients / Calendar / Inbox / More
 *
 * The "More" tab opens a slide-up sheet listing the remaining tabs so
 * nothing is hidden — just prioritized.
 */

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  Calendar as CalendarIcon,
  Inbox,
  Grid3x3,
  X,
  ListChecks,
  FileText,
  Palette,
  Package,
  FolderOpen,
  MessageCircle,
  Building2,
  ScrollText,
  Clock,
  Sparkles,
} from "lucide-react";

type NavItem = { hash: string; label: string; icon: typeof Home };

const PRIMARY: NavItem[] = [
  { hash: "today", label: "היום", icon: Home },
  { hash: "clients", label: "לקוחות", icon: Users },
  { hash: "calendar", label: "יומן", icon: CalendarIcon },
  { hash: "inbox", label: "נכנס", icon: Inbox },
];

const MORE: NavItem[] = [
  { hash: "tasks", label: "משימות", icon: ListChecks },
  { hash: "quotes", label: "הצעות מחיר", icon: FileText },
  { hash: "contracts", label: "חוזים", icon: ScrollText },
  { hash: "time", label: "מעקב שעות", icon: Clock },
  { hash: "chat", label: "צ'אט", icon: MessageCircle },
  { hash: "portfolio", label: "תיק עבודות", icon: Palette },
  { hash: "suppliers-mine", label: "ספקים שלי", icon: Building2 },
  { hash: "suppliers", label: "ספריית ספקים", icon: Package },
  { hash: "templates", label: "תבניות", icon: FolderOpen },
  { hash: "profile", label: "פרופיל", icon: Sparkles },
];

export default function MobileBottomNav() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [hash, setHash] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  // Keep local hash in sync with window.location
  useEffect(() => {
    const read = () => setHash(window.location.hash.slice(1) || "today");
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);

  // Only render inside designer workspace
  if (!/^\/designer\/[^/]+/.test(pathname)) return null;

  const active = hash || "today";

  const go = (h: string) => {
    router.push(`${pathname}#${h}`);
    setMoreOpen(false);
  };

  return (
    <>
      {/* Bottom nav bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-card/95 backdrop-blur-md border-t border-border-subtle"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="ניווט מובייל"
      >
        <div className="grid grid-cols-5 h-16">
          {PRIMARY.map((item) => {
            const isActive = active === item.hash;
            const Icon = item.icon;
            return (
              <button
                key={item.hash}
                type="button"
                onClick={() => go(item.hash)}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? "text-gold" : "text-text-muted hover:text-text-primary"
                }`}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? "scale-110" : ""
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.6}
                />
                <span className={`text-[10px] ${isActive ? "font-semibold" : "font-normal"}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute top-0 h-[3px] w-8 rounded-full bg-gold" />
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-text-muted hover:text-text-primary transition-colors"
            aria-label="עוד"
          >
            <Grid3x3 className="w-5 h-5" strokeWidth={1.6} />
            <span className="text-[10px]">עוד</span>
          </button>
        </div>
      </nav>

      {/* "More" slide-up sheet */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          dir="rtl"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-bg-card rounded-t-3xl border-t border-border-subtle shadow-[0_-12px_40px_rgba(0,0,0,0.25)] animate-slide-up"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <h2 className="font-heading font-bold text-text-primary">כל הלשוניות</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-lg hover:bg-bg-surface-2 text-text-muted"
                aria-label="סגור"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 p-4">
              {MORE.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.hash}
                    type="button"
                    onClick={() => go(item.hash)}
                    className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-bg-surface-2/40 hover:bg-gold/10 hover:text-gold transition-colors"
                  >
                    <Icon className="w-5 h-5 text-gold" strokeWidth={1.6} />
                    <span className="text-[11px] text-text-primary leading-tight text-center">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Spacer so content doesn't sit under the bar */}
      <div
        className="md:hidden"
        style={{ height: "calc(64px + env(safe-area-inset-bottom))" }}
        aria-hidden
      />
    </>
  );
}
