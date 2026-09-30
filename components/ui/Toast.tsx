"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { cn } from "../../lib/utils";

interface ToastItem {
  id: string;
  message: string;
  tone?: "info" | "error" | "success";
}

interface ToastContextValue {
  push: (message: string, tone?: ToastItem["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: ToastItem["tone"] = "info") => {
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
      <div className="fixed right-4 bottom-4 z-50 flex w-[min(320px,90vw)] flex-col gap-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "rounded-2xl border border-[var(--color-border)] px-4 py-3 text-sm shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur",
              item.tone === "error" && "bg-[rgba(192,57,43,0.2)] text-[var(--color-parchment)]",
              item.tone === "success" && "bg-[rgba(95,141,78,0.25)] text-[var(--color-parchment)]",
              item.tone === "info" && "bg-[rgba(40,84,48,0.7)] text-[var(--color-parchment)]"
            )}
          >
            {item.message}
          </div>
        ))}
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

