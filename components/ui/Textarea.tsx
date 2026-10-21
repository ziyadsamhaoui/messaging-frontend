"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  tone?: "dark" | "light";
}

const TONES = {
  dark: {
    field:
      "border-[var(--color-field-border)] bg-[var(--color-field)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] hover:bg-[var(--color-field-hover)]",
    label: "text-[var(--color-text-secondary)]",
    ring: "focus-ring",
    hint: "text-[var(--color-text-secondary)]",
    error: "text-[var(--color-danger)]",
  },
  light: {
    field:
      "border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)] text-[var(--app-pane-text)] placeholder:text-[var(--app-pane-placeholder)]",
    label: "text-[var(--app-pane-text-soft)]",
    ring: "focus-ring-light",
    hint: "text-[var(--app-pane-text-soft)]",
    error: "text-[var(--app-danger-on-light)]",
  },
} as const;

export function Textarea({
  className,
  label,
  error,
  hint,
  tone = "dark",
  id,
  ...props
}: TextareaProps) {
  const generatedId = React.useId();
  const textareaId = id ?? generatedId;
  const errorId = error ? `${textareaId}-error` : undefined;
  const hintId = hint && !error ? `${textareaId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const styles = TONES[tone];

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className={cn("font-ui text-[13px] font-medium", styles.label)}>
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-[80px] w-full resize-none rounded-[var(--radius-control)] border px-3.5 py-3 font-ui text-[15px] transition-colors disabled:cursor-not-allowed disabled:opacity-60",
          styles.ring,
          styles.field,
          className
        )}
        {...props}
      />
      {error ? (
        <span id={errorId} className={cn("font-ui text-xs", styles.error)}>
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className={cn("font-ui text-xs", styles.hint)}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
