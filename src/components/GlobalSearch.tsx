"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Users, Building2, FolderKanban } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: "clients" | "suppliers" | "projects";
  href: string;
}

const DEMO_DATA: SearchResult[] = [
  // Clients
  { id: "c1", title: "מיכל לוי", subtitle: "פרויקט דירה בתל אביב", category: "clients", href: "/admin" },
  { id: "c2", title: "רונית כהן", subtitle: "עיצוב משרד", category: "clients", href: "/admin" },
  { id: "c3", title: "שירה אברהם", subtitle: "שיפוץ וילה בהרצליה", category: "clients", href: "/admin" },
  { id: "c4", title: "נועה גולן", subtitle: "דירת גן ברמת גן", category: "clients", href: "/admin" },
  // Suppliers
  { id: "s1", title: "אור תאורה", subtitle: "תאורה ונברשות", category: "suppliers", href: "/admin/suppliers" },
  { id: "s2", title: "מטבחי פלוס", subtitle: "מטבחים מעוצבים", category: "suppliers", href: "/admin/suppliers" },
  { id: "s3", title: "רהיטי הצפון", subtitle: "ריהוט יוקרה", category: "suppliers", href: "/admin/suppliers" },
  { id: "s4", title: "קרמיקה ישראלית", subtitle: "אריחים וחיפויים", category: "suppliers", href: "/admin/suppliers" },
  // Projects
  { id: "p1", title: "דירת 4 חדרים — תל אביב", subtitle: "בביצוע", category: "projects", href: "/admin" },
  { id: "p2", title: "פנטהאוז — הרצליה פיתוח", subtitle: "תכנון", category: "projects", href: "/admin" },
  { id: "p3", title: "משרד עורכי דין — רמת גן", subtitle: "הושלם", category: "projects", href: "/admin" },
  { id: "p4", title: "וילה — קיסריה", subtitle: "בביצוע", category: "projects", href: "/admin" },
];

const CATEGORY_META = {
  clients: { label: "לקוחות", icon: Users },
  suppliers: { label: "ספקים", icon: Building2 },
  projects: { label: "פרויקטים", icon: FolderKanban },
} as const;

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = query.trim().length > 0
    ? DEMO_DATA.filter(
        (item) =>
          item.title.includes(query) ||
          (item.subtitle && item.subtitle.includes(query))
      )
    : [];

  const grouped = (["clients", "suppliers", "projects"] as const).reduce(
    (acc, cat) => {
      const items = filtered.filter((r) => r.category === cat);
      if (items.length > 0) acc[cat] = items;
      return acc;
    },
    {} as Partial<Record<"clients" | "suppliers" | "projects", SearchResult[]>>
  );

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    router.push(result.href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[#1A1A1A] border border-[#333] rounded-2xl shadow-2xl overflow-hidden animate-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#333]">
          <Search className="w-5 h-5 text-[#C9A84C] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לקוחות, ספקים, פרויקטים..."
            className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-base"
            dir="rtl"
          />
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim().length === 0 && (
            <div className="px-4 py-8 text-center text-white/40 text-sm">
              התחל להקליד כדי לחפש...
            </div>
          )}

          {query.trim().length > 0 && Object.keys(grouped).length === 0 && (
            <div className="px-4 py-8 text-center text-white/40 text-sm">
              לא נמצאו תוצאות עבור &ldquo;{query}&rdquo;
            </div>
          )}

          {(Object.keys(grouped) as Array<keyof typeof CATEGORY_META>).map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            const items = grouped[cat]!;
            return (
              <div key={cat} className="mb-2">
                <div className="flex items-center gap-2 px-4 py-2 text-xs text-[#C9A84C] font-semibold uppercase tracking-wider">
                  <Icon className="w-3.5 h-3.5" />
                  {meta.label}
                </div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors text-right"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-white/45 text-xs truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#333] text-xs text-white/30">
          <span>Esc לסגירה</span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[10px]">
              Ctrl
            </kbd>
            {" + "}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white/50 font-mono text-[10px]">
              K
            </kbd>
            {" לפתיחה"}
          </span>
        </div>
      </div>
    </div>
  );
}
