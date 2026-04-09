import * as React from "react";
import { cn } from "@/lib/cn";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "circle" | "text" | "button";
}

function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const base =
    "relative overflow-hidden bg-bg-surface-2 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-l before:from-transparent before:via-white/40 before:to-transparent";

  const variants = {
    default: "rounded-card h-4 w-full",
    circle: "rounded-full w-10 h-10",
    text: "rounded h-3 w-full",
    button: "rounded-btn h-10 w-24",
  };

  return <div className={cn(base, variants[variant], className)} {...props} />;
}

function SkeletonCard() {
  return (
    <div className="rounded-card border border-border-subtle p-6 space-y-4 bg-bg-card">
      <div className="flex items-center gap-4">
        <Skeleton variant="circle" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    </div>
  );
}

export { Skeleton, SkeletonCard };
export default Skeleton;
