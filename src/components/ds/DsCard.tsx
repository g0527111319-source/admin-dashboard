import * as React from "react";

/**
 * DsCard — the design-system card.
 *
 * Variants map to CSS utilities in design-system.css:
 *   default    → .ds-card          — frosted cream, gold hairline
 *   highlight  → .ds-card-highlight — warm cream gradient, stronger border
 *   dark       → .ds-card-dark      — ink background, gold copy
 *
 * Cosmetic wrapper. Accepts all div props.
 */

type DsCardVariant = "default" | "highlight" | "dark";

export type DsCardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: DsCardVariant;
};

export const DsCard = React.forwardRef<HTMLDivElement, DsCardProps>(
  ({ variant = "default", className, children, ...rest }, ref) => {
    const variantClass =
      variant === "highlight"
        ? "ds-card-highlight"
        : variant === "dark"
        ? "ds-card-dark"
        : "";
    const cls = ["ds-card", variantClass, className].filter(Boolean).join(" ");
    return (
      <div ref={ref} className={cls} {...rest}>
        {children}
      </div>
    );
  },
);
DsCard.displayName = "DsCard";

export default DsCard;
