"use client";

import { useState, useCallback } from "react";
import { Calendar, User, GripVertical } from "lucide-react";

/* ─── Types ─── */
type CardStatus = "todo" | "in_progress" | "done";

interface KanbanCard {
  id: string;
  title: string;
  client: string;
  dueDate: string;
  status: CardStatus;
}

/* ─── Column config (RTL: right-to-left order) ─── */
const COLUMNS: { key: CardStatus; label: string; color: string; dotColor: string }[] = [
  { key: "todo", label: "לביצוע", color: "border-[#c9a84c]", dotColor: "bg-[#c9a84c]" },
  { key: "in_progress", label: "בתהליך", color: "border-emerald-500", dotColor: "bg-emerald-500" },
  { key: "done", label: "הושלם", color: "border-red-400", dotColor: "bg-red-400" },
];

/* ─── Demo data ─── */
const INITIAL_CARDS: KanbanCard[] = [
  // To Do
  { id: "1", title: "תכנון סלון ראשי", client: "משפחת כהן", dueDate: "2026-04-15", status: "todo" },
  { id: "2", title: "בחירת ריצוף מטבח", client: "דנה לוי", dueDate: "2026-04-20", status: "todo" },
  { id: "3", title: "הזמנת ארונות", client: "רונית אברהם", dueDate: "2026-04-18", status: "todo" },
  { id: "4", title: "תכנון תאורה", client: "יעל שמיר", dueDate: "2026-05-01", status: "todo" },
  // In Progress
  { id: "5", title: "עיצוב חדר שינה", client: "משפחת כהן", dueDate: "2026-03-30", status: "in_progress" },
  { id: "6", title: "התקנת מטבח", client: "עמית גרין", dueDate: "2026-04-02", status: "in_progress" },
  { id: "7", title: "צביעת קירות", client: "דנה לוי", dueDate: "2026-04-05", status: "in_progress" },
  // Done
  { id: "8", title: "תוכניות אדריכליות", client: "משפחת כהן", dueDate: "2026-03-10", status: "done" },
  { id: "9", title: "פגישת אפיון", client: "עמית גרין", dueDate: "2026-03-05", status: "done" },
  { id: "10", title: "הצעת מחיר ריצוף", client: "רונית אברהם", dueDate: "2026-03-08", status: "done" },
  { id: "11", title: "סקר אתר", client: "יעל שמיר", dueDate: "2026-03-01", status: "done" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

export default function CrmKanban() {
  const [cards, setCards] = useState<KanbanCard[]>(INITIAL_CARDS);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStatus: CardStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;

    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: targetStatus } : c))
    );
    setDraggedId(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  return (
    <div className="space-y-6 animate-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-bold text-text-primary">
          לוח קנבן
        </h2>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>{cards.length} משימות</span>
          <span className="text-text-faint">|</span>
          <span className="text-emerald-500">{cards.filter((c) => c.status === "done").length} הושלמו</span>
        </div>
      </div>

      {/* Columns grid — RTL order via direction */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const columnCards = cards.filter((c) => c.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
              className={`rounded-2xl border-t-4 ${col.color} bg-[#13132b] min-h-[300px] p-4 transition-colors
                ${draggedId ? "ring-1 ring-white/10" : ""}`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
                  <h3 className="text-sm font-bold text-white">{col.label}</h3>
                </div>
                <span className="text-xs text-white/40 font-mono bg-white/5 px-2 py-0.5 rounded-full">
                  {columnCards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {columnCards.map((card) => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, card.id)}
                    onDragEnd={handleDragEnd}
                    className={`group bg-[#1a1a2e] border border-white/10 rounded-xl p-3.5 cursor-grab active:cursor-grabbing
                      hover:border-[#c9a84c]/30 transition-all duration-200
                      ${draggedId === card.id ? "opacity-40 scale-95" : "opacity-100"}`}
                  >
                    {/* Drag handle + title */}
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-4 h-4 text-white/20 group-hover:text-white/40 mt-0.5 flex-shrink-0 transition-colors" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{card.title}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {card.client}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(card.dueDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {columnCards.length === 0 && (
                  <div className="text-center py-8 text-white/20 text-xs">
                    גרור משימות לכאן
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
