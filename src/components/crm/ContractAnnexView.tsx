"use client";

/**
 * ContractAnnexView — read-only rendering of a contract annex, shared
 * between the designer's preview screen and the public client signing page.
 *
 * Rendered as a clean "addendum page" styled to visually pair with the main
 * contract. The client sees it before signing, so the single signature at
 * the bottom of the page covers the main contract + annex together.
 */

import { CheckCircle2, XCircle, Home, Calendar, Users, Ban, FileText } from "lucide-react";
import { ContractAnnex, VISIT_FREQUENCY_LABELS } from "@/lib/contract-annex";

interface Props {
  annex: ContractAnnex;
  /**
   * Used for a tiny "Annex X" sub-label when multiple annexes could exist.
   * Keep simple: default to "נספח א׳" — Hebrew style.
   */
  label?: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ContractAnnexView({ annex, label = "נספח א׳" }: Props) {
  if (!annex.enabled) return null;

  const included = annex.services.filter((s) => s.included);
  const excluded = annex.services.filter((s) => !s.included);

  return (
    <div
      className="relative mt-10 pt-8 border-t-2 border-dashed border-gold/40"
      dir="rtl"
    >
      {/* Annex header — a soft visual break marking the start of the addendum. */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-2xs text-gold font-semibold tracking-[0.2em] uppercase">
            {label}
          </div>
          <h2 className="text-xl font-heading font-bold text-text-primary mt-1">
            פרטי השיפוץ והתחייבויות המעצבת
          </h2>
        </div>
        <div className="hidden sm:block text-2xs text-text-faint max-w-[50%] text-left leading-relaxed">
          נספח זה מהווה חלק בלתי-נפרד מהחוזה. החתימה בתחתית העמוד חלה גם עליו.
        </div>
      </div>

      {/* Property details */}
      {(annex.propertyAddress || annex.propertyArea || annex.renovationScope ||
        annex.startDate || annex.estimatedEndDate) && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-3">
            <Home className="w-4 h-4 text-gold" />
            פרטי הנכס
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {annex.propertyAddress && (
              <div className="flex gap-2">
                <span className="text-text-muted w-20 flex-shrink-0">כתובת:</span>
                <span className="text-text-primary font-medium">{annex.propertyAddress}</span>
              </div>
            )}
            {annex.propertyArea && (
              <div className="flex gap-2">
                <span className="text-text-muted w-20 flex-shrink-0">שטח:</span>
                <span className="text-text-primary font-medium">{annex.propertyArea} מ״ר</span>
              </div>
            )}
            {annex.startDate && (
              <div className="flex gap-2">
                <span className="text-text-muted w-20 flex-shrink-0 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> התחלה:
                </span>
                <span className="text-text-primary font-medium">{formatDate(annex.startDate)}</span>
              </div>
            )}
            {annex.estimatedEndDate && (
              <div className="flex gap-2">
                <span className="text-text-muted w-20 flex-shrink-0 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> סיום משוער:
                </span>
                <span className="text-text-primary font-medium">{formatDate(annex.estimatedEndDate)}</span>
              </div>
            )}
          </div>
          {annex.renovationScope && (
            <div className="mt-3 p-3 rounded-lg bg-bg-surface-2/40 border border-border-subtle">
              <div className="text-xs text-text-muted mb-1">תיאור השיפוץ:</div>
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {annex.renovationScope}
              </p>
            </div>
          )}
        </section>
      )}

      {/* Services — included */}
      {included.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            השירות כולל
          </h3>
          <ul className="space-y-1.5">
            {included.map((s) => (
              <li key={s.id} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-text-primary">{s.label}</span>
                  {s.details && (
                    <span className="text-text-muted"> — {s.details}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Visits */}
      {(annex.visitCount || annex.visitFrequency) && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-2">
            <Users className="w-4 h-4 text-gold" />
            פיקוח ותיאום
          </h3>
          <div className="text-sm text-text-secondary leading-relaxed">
            {VISIT_FREQUENCY_LABELS[annex.visitFrequency]}
            {annex.visitCount && (
              <>
                {" · "}
                {annex.visitCount}
              </>
            )}
            {annex.supplierCoordination && (
              <>
                {" · "}
                תיאום פעיל עם ספקים וקבלנים
              </>
            )}
            .
          </div>
        </section>
      )}

      {/* Exclusions */}
      {annex.exclusions && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-2">
            <Ban className="w-4 h-4 text-text-muted" />
            מה לא כלול
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {annex.exclusions}
          </p>
        </section>
      )}

      {/* Not-included services (if any were toggled off) — shown briefly */}
      {excluded.length > 0 && (
        <section className="mb-6">
          <div className="text-xs text-text-faint italic">
            שירותים שאינם כלולים בהסכם זה:{" "}
            {excluded.map((s, i) => (
              <span key={s.id} className="text-text-muted">
                {s.label}
                {i < excluded.length - 1 ? ", " : ""}
              </span>
            ))}
            <XCircle className="inline w-3 h-3 text-text-faint mr-1 rotate-0" />
          </div>
        </section>
      )}

      {/* Custom clauses */}
      {annex.customClauses.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-3">
            <FileText className="w-4 h-4 text-gold" />
            סעיפים מיוחדים
          </h3>
          <ol className="space-y-3">
            {annex.customClauses.map((clause, idx) => (
              <li key={clause.id} className="pr-4 border-r-2 border-gold/30">
                <div className="text-sm font-semibold text-text-primary">
                  {idx + 1}. {clause.title || "סעיף"}
                </div>
                {clause.text && (
                  <p className="text-sm text-text-secondary leading-relaxed mt-1 whitespace-pre-wrap">
                    {clause.text}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="mt-6 pt-4 border-t border-border-subtle text-2xs text-text-faint text-center">
        בחתימה על החוזה, הלקוח מאשר גם את פרטי הנספח.
      </div>
    </div>
  );
}
