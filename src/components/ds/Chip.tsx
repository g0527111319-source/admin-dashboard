"use client";

import * as React from "react";

/**
 * Chip — pill-shaped filter/tag. Active state uses a gold gradient.
 * Pure cosmetic wrapper around `.ds-chip` / `.ds-chip.active` CSS.
 */

export type ChipProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> & {
  active?: boolean;
  className?: string;
  children: React.ReactNode;
};

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ active, className, children, type = "button", ...rest }, ref) => {
    const cls = ["ds-chip", active ? "ds-chip-active" : "", className]
      .filter(Boolean)
      .join(" ");
    return (
      <button ref={ref} type={type} className={cls} {...rest}>
        {children}
      </button>
    );
  },
);
Chip.displayName = "Chip";

export default Chip;
