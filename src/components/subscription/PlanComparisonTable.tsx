"use client";
import { useMemo } from "react";
import { g } from "@/lib/gender";

export type Plan = {
  id: string;
  name: string;
  slug: string;
  price: string | number;
  currency?: string;
  description?: string | null;
  features: Record<string, boolean>;
};

type Props = {
  plans: Plan[];
  currentPlanId?: string;
  highlightedPlanSlug?: string;
  onSelect?: (planId: string) => void;
  loading?: boolean;
  gender?: string;
};

const FEATURE_ROWS: { key: string; label: string }[] = [
  { key: "crm", label: "מערכת CRM" },
  { key: "businessCard", label: "כרטיס ביקור דיגיטלי" },
  { key: "contracts", label: "חוזים והצעות מחיר" },
  { key: "portfolio", label: "תיק עבודות" },
  { key: "messages", label: "הודעות ללקוחות" },
  { key: "events", label: "אירועי קהילה" },
  { key: "suppliers", label: "ספריית ספקים" },
  { key: "raffles", label: "השתתפות בהגרלות" },
];

function formatPrice(v: string | number, currency = "ILS"): string {
  const n = Number(v);
  if (Number.isNaN(n)) return "-";
  const symbol = currency === "ILS" ? "₪" : currency;
  if (n === 0) return "חינם";
  return `${symbol}${n.toLocaleString("he-IL")}`;
}

export default function PlanComparisonTable({
  plans,
  currentPlanId,
  highlightedPlanSlug,
  onSelect,
  loading = false,
  gender,
}: Props) {
  const visiblePlans = useMemo(() => plans.slice(0, 4), [plans]);

  return (
    <div dir="rtl" className="w-full">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .pct-grid {
            display: grid;
            grid-template-columns: repeat(${visiblePlans.length}, minmax(0, 1fr));
            gap: 20px;
          }
          @media (max-width: 900px) {
            .pct-grid { grid-template-columns: 1fr 1fr; }
          }
          @media (max-width: 600px) {
            .pct-grid { grid-template-columns: 1fr; }
          }
          .plan-card {
            position: relative;
            background: #fff;
            border: 1.5px solid var(--border);
            border-radius: 20px;
            padding: 28px 24px 24px;
            display: flex;
            flex-direction: column;
            box-shadow: var(--shadow-xs);
            transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.3s ease;
          }
          .plan-card:not(.plan-card--current):hover {
            transform: translateY(-4px);
            box-shadow: var(--shadow-md);
            border-color: var(--border-hover);
          }
          .plan-card--recommended {
            background: linear-gradient(145deg, #FFFBEF 0%, #F5ECD3 100%);
            border: 2px solid var(--gold);
            box-shadow: var(--shadow-gold);
            transform: scale(1.02);
          }
          .plan-card--recommended:hover {
            transform: scale(1.02) translateY(-4px);
            box-shadow: var(--shadow-gold-lg);
          }
          .plan-card--current {
            border: 2px solid rgba(34,197,94,0.45);
            background: linear-gradient(145deg, #fff 0%, #f0fdf4 100%);
          }
          .plan-ribbon {
            position: absolute;
            top: -12px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            padding: 5px 14px;
            border-radius: 9999px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            white-space: nowrap;
          }
          .plan-ribbon--gold {
            right: 20px;
            background: linear-gradient(90deg, var(--gold-dim), var(--gold));
            color: #fff;
          }
          .plan-ribbon--green {
            left: 20px;
            background: #16a34a;
            color: #fff;
          }
          .feat-row {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 0;
            font-size: 13px;
            border-bottom: 1px solid var(--border);
          }
          .feat-row:last-child { border-bottom: none; }
          .feat-row--on { color: var(--text-secondary); }
          .feat-row--off { color: var(--text-faint); text-decoration: line-through; }
          .feat-icon {
            display: inline-flex;
            width: 20px;
            height: 20px;
            border-radius: 9999px;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 11px;
            flex-shrink: 0;
          }
          .feat-icon--on { background: rgba(34,197,94,0.12); color: #15803d; }
          .feat-icon--off { background: var(--bg-surface); color: var(--text-faint); }
          `,
        }}
      />
      <div className="pct-grid">
        {visiblePlans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isHighlighted = plan.slug === highlightedPlanSlug;
          const cardClass = [
            "plan-card",
            isHighlighted ? "plan-card--recommended" : "",
            isCurrent ? "plan-card--current" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={plan.id} className={cardClass}>
              {isHighlighted && (
                <span className="plan-ribbon plan-ribbon--gold">✦ מומלץ</span>
              )}
              {isCurrent && (
                <span className="plan-ribbon plan-ribbon--green">● התוכנית שלך</span>
              )}

              <h3 className="font-heading text-2xl font-semibold text-text-primary mb-1">
                {plan.name}
              </h3>
              <p className="text-xs text-text-muted mb-5 min-h-[32px] leading-relaxed">
                {plan.description || ""}
              </p>

              <div className="mb-5 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-semibold text-text-primary leading-none">
                  {formatPrice(plan.price, plan.currency)}
                </span>
                {Number(plan.price) > 0 && (
                  <span className="text-xs text-text-muted">/ חודש</span>
                )}
              </div>

              <ul className="list-none p-0 m-0 mb-6 flex-1">
                {FEATURE_ROWS.map((row) => {
                  const enabled = !!plan.features?.[row.key];
                  return (
                    <li
                      key={row.key}
                      className={`feat-row ${enabled ? "feat-row--on" : "feat-row--off"}`}
                    >
                      <span
                        className={`feat-icon ${enabled ? "feat-icon--on" : "feat-icon--off"}`}
                      >
                        {enabled ? "✓" : "—"}
                      </span>
                      {row.label}
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={() => onSelect?.(plan.id)}
                disabled={isCurrent || loading}
                className={
                  isCurrent
                    ? "w-full py-3 rounded-full border-2 border-green-600/30 bg-green-50 text-green-800 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                    : isHighlighted
                    ? "btn-gold w-full"
                    : "btn-outline w-full"
                }
              >
                {isCurrent ? (
                  <>
                    <span>✓</span>
                    התוכנית הנוכחית שלך
                  </>
                ) : loading ? (
                  "מעבד..."
                ) : isHighlighted ? (
                  g(gender, "שדרג", "שדרגי")
                ) : (
                  g(gender, "בחר תוכנית", "בחרי תוכנית")
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
