"use client";

import React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClasses } from "./Button";

type Tone = "panel" | "pane";

const TONES: Record<Tone, { title: string; body: string; icon: string }> = {
  panel: {
    title: "text-[var(--app-panel-text)]",
    body: "text-[var(--app-panel-text-soft)]",
    icon: "bg-[rgba(192,57,43,0.22)] text-[var(--app-danger-on-dark)]",
  },
  pane: {
    title: "text-[var(--app-pane-text)]",
    body: "text-[var(--app-pane-text-soft)]",
    icon: "bg-[rgba(143,42,27,0.1)] text-[var(--app-danger-on-light)]",
  },
};

export function ErrorBlock({
  title,
  reason,
  onRetry,
  tone = "panel",
  className,
}: {
  title: string;
  reason?: string;
  onRetry?: () => void;
  tone?: Tone;
  className?: string;
}) {
  const styles = TONES[tone];
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}
    >
      <span
        aria-hidden="true"
        className={cn("flex h-12 w-12 items-center justify-center rounded-full", styles.icon)}
      >
        <AlertTriangle size={22} strokeWidth={1.75} />
      </span>
      <p className={cn("font-ui text-[15px] font-semibold", styles.title)}>{title}</p>
      {reason && (
        <p className={cn("max-w-[38ch] font-ui text-[13px] leading-relaxed", styles.body)}>
          {reason}
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={buttonClasses({
            variant: "secondary",
            size: "sm",
            tone: tone === "pane" ? "light" : "dark",
            className: "mt-1",
          })}
        >
          <RotateCw size={16} strokeWidth={1.75} aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}
