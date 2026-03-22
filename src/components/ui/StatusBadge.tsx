"use client";

import { STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] || status;
  const colorClass = STATUS_COLORS[status] || "badge-gold";

  return (
    <span
      className={`${colorClass} ${
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-0.5"
      }`}
    >
      {label}
    </span>
  );
}
