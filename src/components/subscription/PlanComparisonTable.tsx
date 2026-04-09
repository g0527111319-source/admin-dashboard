"use client";
import { useMemo } from "react";

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
};

const GOLD = "#C9A84C";
const GOLD_SOFT = "#e0c068";
const DARK_BG = "#1a1a2e";
const DARKER_BG = "#0f0f1e";

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
}: Props) {
  const visiblePlans = useMemo(() => plans.slice(0, 4), [plans]);

  return (
    <div dir="rtl" style={{ width: "100%" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .pct-grid {
            display: grid;
            grid-template-columns: repeat(${visiblePlans.length}, minmax(0, 1fr));
            gap: 16px;
          }
          @media (max-width: 900px) {
            .pct-grid { grid-template-columns: 1fr 1fr; }
          }
          @media (max-width: 600px) {
            .pct-grid { grid-template-columns: 1fr; }
          }
          .pct-btn:hover { background: ${GOLD_SOFT} !important; }
          .pct-btn-outline:hover { background: rgba(201,168,76,0.1) !important; }
          `,
        }}
      />
      <div className="pct-grid">
        {visiblePlans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isHighlighted = plan.slug === highlightedPlanSlug;
          const borderColor = isHighlighted
            ? GOLD
            : isCurrent
            ? "rgba(34,197,94,0.6)"
            : "rgba(255,255,255,0.1)";

          return (
            <div
              key={plan.id}
              style={{
                position: "relative",
                background: DARK_BG,
                border: `2px solid ${borderColor}`,
                borderRadius: 16,
                padding: 24,
                paddingTop: 32,
                display: "flex",
                flexDirection: "column",
                boxShadow: isHighlighted
                  ? `0 0 24px rgba(201,168,76,0.25)`
                  : "none",
              }}
            >
              {isHighlighted && (
                <span
                  style={{
                    position: "absolute",
                    top: -14,
                    right: 16,
                    background: GOLD,
                    color: "#000",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 999,
                  }}
                >
                  מומלץ
                </span>
              )}
              {isCurrent && (
                <span
                  style={{
                    position: "absolute",
                    top: -14,
                    left: 16,
                    background: "#22c55e",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 999,
                  }}
                >
                  תוכנית נוכחית
                </span>
              )}

              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 4,
                }}
              >
                {plan.name}
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: 16,
                  minHeight: 32,
                }}
              >
                {plan.description || ""}
              </p>

              <div style={{ marginBottom: 20 }}>
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: GOLD,
                    lineHeight: 1,
                  }}
                >
                  {formatPrice(plan.price, plan.currency)}
                </span>
                {Number(plan.price) > 0 && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.5)",
                      marginRight: 6,
                    }}
                  >
                    / חודש
                  </span>
                )}
              </div>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  marginBottom: 24,
                  flex: 1,
                }}
              >
                {FEATURE_ROWS.map((row) => {
                  const enabled = !!plan.features?.[row.key];
                  return (
                    <li
                      key={row.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 0",
                        fontSize: 13,
                        color: enabled
                          ? "rgba(255,255,255,0.85)"
                          : "rgba(255,255,255,0.3)",
                        textDecoration: enabled ? "none" : "line-through",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          alignItems: "center",
                          justifyContent: "center",
                          background: enabled
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(255,255,255,0.05)",
                          color: enabled ? "#22c55e" : "rgba(255,255,255,0.3)",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {enabled ? "✓" : "✗"}
                      </span>
                      {row.label}
                    </li>
                  );
                })}
              </ul>

              <button
                onClick={() => onSelect?.(plan.id)}
                disabled={isCurrent || loading}
                className={isCurrent ? "" : "pct-btn"}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: isCurrent || loading ? "not-allowed" : "pointer",
                  opacity: loading && !isCurrent ? 0.7 : 1,
                  background: isCurrent
                    ? "rgba(255,255,255,0.05)"
                    : isHighlighted
                    ? GOLD
                    : GOLD,
                  color: isCurrent ? "rgba(255,255,255,0.4)" : "#000",
                  transition: "background 0.2s, opacity 0.2s",
                }}
              >
                {isCurrent
                  ? "תוכנית נוכחית"
                  : loading
                  ? "מעבד..."
                  : isHighlighted
                  ? "שדרגי"
                  : "בחרי תוכנית"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
