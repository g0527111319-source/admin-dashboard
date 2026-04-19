import * as React from "react";

/**
 * DsBadge — small pill label for status/meta. Named `DsBadge` to avoid
 * colliding with the existing `Badge` in `src/components/ui/Badge.tsx`.
 *
 * Variants map to `.ds-badge-*` classes in design-system.css.
 */

export type DsBadgeVariant = "new" | "ok" | "warn" | "alert" | "neutral";

export type DsBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: DsBadgeVariant;
};

export function DsBadge({
  variant = "neutral",
  className,
  children,
  ...rest
}: DsBadgeProps) {
  const variantClass =
    variant === "new"
      ? "ds-badge-new"
      : variant === "ok"
      ? "ds-badge-ok"
      : variant === "warn"
      ? "ds-badge-warn"
      : variant === "alert"
      ? "ds-badge-alert"
      : "";
  const cls = ["ds-badge", variantClass, className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {children}
    </span>
  );
}

export default DsBadge;
