import * as React from "react";

/**
 * StatCard — KPI tile: big Suez-One numeral, uppercase gold label,
 * optional delta line. Uses `.ds-stat*` utilities.
 *
 * Cosmetic only — formatting of `value` is caller's responsibility
 * so we don't accidentally change any existing number formatting.
 */

export type StatCardProps = {
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  className?: string;
};

export function StatCard({ label, value, delta, className }: StatCardProps) {
  const cls = ["ds-stat", className].filter(Boolean).join(" ");
  return (
    <div className={cls}>
      <div className="ds-stat-label">{label}</div>
      <div className="ds-stat-num">{value}</div>
      {delta != null && <div className="ds-stat-delta">{delta}</div>}
    </div>
  );
}

export default StatCard;
