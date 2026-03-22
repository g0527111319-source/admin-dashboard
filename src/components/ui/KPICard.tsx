"use client";

import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: "gold" | "green" | "red" | "blue";
}

export default function KPICard({ title, value, subtitle, icon: Icon, trend, color = "gold" }: KPICardProps) {
  const colorMap = {
    gold: "text-gold",
    green: "text-emerald-600",
    red: "text-red-500",
    blue: "text-blue-600",
  };

  const bgMap = {
    gold: "bg-amber-50",
    green: "bg-emerald-50",
    red: "bg-red-50",
    blue: "bg-blue-50",
  };

  const iconColorMap = {
    gold: "text-gold",
    green: "text-emerald-500",
    red: "text-red-400",
    blue: "text-blue-500",
  };

  return (
    <div className="card-static animate-in">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-text-muted text-sm mb-1">{title}</p>
          <p className={`text-3xl font-bold font-mono ${colorMap[color]}`}>{value}</p>
          {subtitle && <p className="text-text-muted text-xs mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs font-semibold ${trend.value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {trend.value >= 0 ? "+" : ""}{trend.value}%
              </span>
              <span className="text-text-muted text-xs">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgMap[color]}`}>
          <Icon className={`w-6 h-6 ${iconColorMap[color]}`} />
        </div>
      </div>
    </div>
  );
}
