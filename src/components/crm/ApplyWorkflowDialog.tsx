"use client";

/**
 * ApplyWorkflowDialog — lets the designer pick a workflow template and
 * materialize its phases + tasks into a project.
 *
 * Shown from the project header (e.g. "החל תהליך עבודה"). On apply:
 *  - we POST to /api/designer/crm/workflows/:id/apply
 *  - close the dialog on success
 *  - bubble up onApplied({ phasesCreated, tasksCreated }) so the caller
 *    can refetch phases/tasks.
 */

import { useEffect, useState } from "react";
import { Loader2, Sparkles, X, Check, Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

interface Template {
  id: string;
  name: string;
  description: string | null;
  projectType: string | null;
  isDefault: boolean;
  phases: unknown;
  defaultTasks: unknown;
}

function phaseCount(t: Template): number {
  return Array.isArray(t.phases) ? (t.phases as unknown[]).length : 0;
}
function taskCount(t: Template): number {
  return Array.isArray(t.defaultTasks) ? (t.defaultTasks as unknown[]).length : 0;
}

export default function ApplyWorkflowDialog({
  projectId,
  onClose,
  onApplied,
}: {
  projectId: string;
  onClose: () => void;
  onApplied?: (stats: { phasesCreated: number; tasksCreated: number }) => void;
}) {
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/designer/crm/workflows");
        if (res.ok) {
          const list = (await res.json()) as Template[];
          setTemplates(list);
          const def = list.find((t) => t.isDefault);
          setSelected(def?.id ?? list[0]?.id ?? null);
        } else {
          setTemplates([]);
        }
      } catch {
        setTemplates([]);
      }
    })();
  }, []);

  const apply = async () => {
    if (!selected) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/designer/crm/workflows/${selected}/apply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, startDate, replaceExisting }),
        }
      );
      const j = await res.json();
      if (res.ok) {
        onApplied?.({
          phasesCreated: j.phasesCreated,
          tasksCreated: j.tasksCreated,
        });
        onClose();
      } else {
        setError(j.error || "שגיאה בהחלת תבנית");
      }
    } catch {
      setError("שגיאה ברשת");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center p-4"
      dir="rtl"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-bg-card border border-border-subtle rounded-2xl shadow-[0_32px_64px_rgba(0,0,0,0.4)] overflow-hidden animate-[modalEnter_0.25s_cubic-bezier(0.16,1,0.3,1)] max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold" />
            <h2 className="font-heading font-bold text-text-primary">
              הוספת תהליך עבודה
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bg-surface-2 text-text-muted"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-sm text-text-muted">
            בחרי תבנית — השלבים והמשימות ייווצרו בפרויקט עם דדליינים יחסיים
            לתאריך ההתחלה.
          </p>

          {templates === null ? (
            <div className="space-y-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-text-muted text-center py-6">
              עדיין אין תבניות. ניתן ליצור אחת במסך &quot;תבניות&quot;.
            </div>
          ) : (
            <ul className="space-y-2">
              {templates.map((t) => {
                const active = selected === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(t.id)}
                      className={`w-full text-right p-3 rounded-xl border transition-all ${
                        active
                          ? "border-gold bg-gold/5 shadow-sm"
                          : "border-border-subtle hover:border-gold/40 hover:bg-bg-surface-2/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-text-primary">
                              {t.name}
                            </span>
                            {t.isDefault && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/20">
                                ברירת מחדל
                              </span>
                            )}
                          </div>
                          {t.description && (
                            <p className="text-xs text-text-muted mt-1 line-clamp-2">
                              {t.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-text-muted">
                            <span className="flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              {phaseCount(t)} שלבים
                            </span>
                            <span>·</span>
                            <span>{taskCount(t)} משימות</span>
                          </div>
                        </div>
                        {active && (
                          <div className="w-6 h-6 rounded-full bg-gold text-white flex items-center justify-center flex-shrink-0">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Options */}
          <div className="space-y-3 pt-2 border-t border-border-subtle">
            <div>
              <label className="text-xs text-text-muted">תאריך התחלה</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-field w-full mt-1"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 accent-gold"
              />
              החלף שלבים ומשימות פתוחים קיימים
              <span className="text-xs text-text-muted">
                (משימות שהושלמו נשמרות)
              </span>
            </label>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-subtle bg-bg-surface-2/30">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-lg text-text-muted hover:text-text-primary transition-colors"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={applying || !selected}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-gold text-white font-semibold hover:brightness-110 transition-all disabled:opacity-40"
          >
            {applying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            החל תבנית
          </button>
        </div>
      </div>
    </div>
  );
}
