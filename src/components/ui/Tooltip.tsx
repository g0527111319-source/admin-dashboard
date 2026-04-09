"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "start" | "end";
  delay?: number;
  className?: string;
}

function Tooltip({ content, children, side = "top", delay = 200, className }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setOpen(true), delay);
  };

  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const sideStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    start: "right-full top-1/2 -translate-y-1/2 me-2",
    end: "left-full top-1/2 -translate-y-1/2 ms-2",
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            "absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white rounded-md whitespace-nowrap pointer-events-none",
            "bg-gray-900 shadow-lg",
            "animate-fade-in",
            sideStyles[side],
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

export { Tooltip };
export default Tooltip;
