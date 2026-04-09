import * as React from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
  className,
  ...props
}: EmptyStateProps) {
  const sizes = {
    sm: "py-8 px-4",
    md: "py-12 px-6",
    lg: "py-20 px-8",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "animate-fade-in",
        sizes[size],
        className
      )}
      {...props}
    >
      {icon && (
        <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-gold-50 text-gold">
          <div className="w-8 h-8">{icon}</div>
        </div>
      )}
      <h3 className="font-heading text-xl font-bold text-text-primary mb-2 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-text-muted text-sm max-w-sm leading-relaxed mb-6">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { EmptyState };
export default EmptyState;
