"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
};

const TYPE_STYLES: Record<ToastType, string> = {
  success: "border-emerald-500/30 bg-emerald-50 text-emerald-800",
  error: "border-red-500/30 bg-red-50 text-red-800",
  info: "border-blue-500/30 bg-blue-50 text-blue-800",
  warning: "border-amber-500/30 bg-amber-50 text-amber-800",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).slice(2);
      const newToast: Toast = { id, duration: 4000, ...t };
      setToasts((prev) => [...prev, newToast]);
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => dismiss(id), newToast.duration);
      }
    },
    [dismiss]
  );

  const success = React.useCallback(
    (title: string, description?: string) => toast({ type: "success", title, description }),
    [toast]
  );
  const error = React.useCallback(
    (title: string, description?: string) => toast({ type: "error", title, description }),
    [toast]
  );
  const info = React.useCallback(
    (title: string, description?: string) => toast({ type: "info", title, description }),
    [toast]
  );
  const warning = React.useCallback(
    (title: string, description?: string) => toast({ type: "warning", title, description }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning, dismiss }}>
      {children}
      {mounted &&
        createPortal(
          <div
            dir="rtl"
            aria-live="polite"
            className="fixed top-4 left-4 z-[1100] flex flex-col gap-2 pointer-events-none"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "pointer-events-auto min-w-[300px] max-w-md rounded-card border p-4 shadow-premium-lg",
                  "animate-[slideInRight_0.3s_cubic-bezier(0.16,1,0.3,1)]",
                  "flex items-start gap-3",
                  TYPE_STYLES[t.type]
                )}
                role="status"
              >
                <div className="flex-shrink-0 mt-0.5">{ICONS[t.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{t.title}</div>
                  {t.description && (
                    <div className="text-xs mt-0.5 opacity-90 leading-relaxed">{t.description}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="סגור"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
