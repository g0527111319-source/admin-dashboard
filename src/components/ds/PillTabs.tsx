"use client";

import * as React from "react";

/**
 * PillTabs — segmented-control tab bar wrapped in a cream pill.
 * Controlled component. Pass `tabs` + the current `value` and an
 * `onChange` handler.
 *
 * Visual only — does not own routing; wire `onChange` to whatever
 * state/navigation layer the host page uses.
 */

export type PillTab = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export type PillTabsProps = {
  tabs: PillTab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
};

export function PillTabs({
  tabs,
  value,
  onChange,
  className,
  ariaLabel,
}: PillTabsProps) {
  const cls = ["ds-pill-tabs", className].filter(Boolean).join(" ");
  return (
    <div className={cls} role="tablist" aria-label={ariaLabel}>
      {tabs.map((t) => {
        const isActive = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? "ds-pill-active" : ""}
            disabled={t.disabled}
            onClick={() => onChange(t.value)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default PillTabs;
