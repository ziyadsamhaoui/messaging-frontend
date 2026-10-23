"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, CircleX, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastTone = "info" | "warning" | "success" | "error";

interface ToastItem {
  id: string;
  message: string;
  tone?: ToastTone;
}

interface ToastContextValue {
  push: (message: string, tone?: ToastTone) => void;
}

const TONE_STYLES: Record<
  ToastTone,
  { accent: string; tint: string; Icon: typeof CircleAlert; label: string }
> = {
  info: {
    accent: "var(--color-parchment)",
    tint: "rgba(229, 217, 182, 0.06)",
    Icon: CircleAlert,
    label: "Notice",
  },
  warning: {
    accent: "var(--color-warning)",
    tint: "rgba(224, 165, 59, 0.14)",
    Icon: TriangleAlert,
    label: "Warning",
  },
  success: {
    accent: "var(--color-success)",
    tint: "rgba(127, 176, 105, 0.16)",
    Icon: CircleCheck,
    label: "Success",
  },
  error: {
    accent: "var(--color-error)",
    tint: "rgba(192, 57, 43, 0.18)",
    Icon: CircleX,
    label: "Error",
  },
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((message: string, tone: ToastTone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3800);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        aria-atomic="false"
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex w-[min(320px,90vw)] flex-col gap-3 md:bottom-4"
      >
        {items.map((item) => {
          const style = TONE_STYLES[item.tone ?? "info"];
          const Icon = style.Icon;
          return (
            <div
              key={item.id}
              className="relative flex items-start gap-3 overflow-hidden rounded-2xl border border-[var(--color-border)] px-4 py-3 pt-4 text-sm text-[var(--color-parchment)] shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur"
              style={{
                backgroundColor: "var(--color-forest-deep)",
                backgroundImage: `linear-gradient(${style.tint}, ${style.tint})`,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: style.accent }}
              />
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: style.accent, color: style.accent }}
              >
                <Icon size={16} strokeWidth={1.75} />
              </span>
              <span className="sr-only">{style.label}: </span>
              <span className="min-w-0 flex-1 pt-1 leading-snug">{item.message}</span>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className={cn(
                  "-mr-1 -mt-0.5 rounded-full p-1 text-[rgba(229,217,182,0.85)] hover:text-[var(--color-parchment)]",
                  "focus-ring"
                )}
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
