import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        gold: "bg-gold-50 text-[#92700A] border-gold/25",
        green: "bg-emerald-50 text-emerald-700 border-emerald-500/20",
        red: "bg-red-50 text-red-700 border-red-500/20",
        yellow: "bg-amber-50 text-amber-700 border-amber-500/20",
        blue: "bg-blue-50 text-blue-700 border-blue-500/20",
        purple: "bg-purple-50 text-purple-700 border-purple-500/20",
        gray: "bg-gray-50 text-gray-600 border-gray-500/20",
        outline: "bg-transparent border-border-subtle text-text-secondary",
        dark: "bg-gray-900 text-white border-gray-800",
        glow: "bg-gradient-to-r from-gold/10 via-gold/20 to-gold/10 text-gold border-gold/40 shadow-[0_0_12px_rgba(201,168,76,0.25)]",
      },
      size: {
        xs: "px-1.5 py-0 text-[10px] h-4",
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "gold",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
export default Badge;
