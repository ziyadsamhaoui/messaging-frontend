"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type FieldSize = "sm" | "md" | "lg";

const HEIGHTS: Record<FieldSize, string> = {
  sm: "h-[var(--control-height-sm)] px-3 text-[13px]",
  md: "h-[var(--control-height-md)] px-3.5 text-[15px]",
  lg: "h-[var(--control-height-lg)] px-3.5 text-[15px]",
};

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string | null;
  hint?: string;
  size?: FieldSize;
  tone?: "dark" | "light";
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

const TONES = {
  dark: {
    field:
      "border-[var(--color-field-border)] bg-[var(--color-field)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] hover:bg-[var(--color-field-hover)]",
    label: "text-[var(--color-text-secondary)]",
    ring: "focus-ring",
    adornment: "text-[var(--color-text-placeholder)]",
  },
  light: {
    field:
      "border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)] text-[var(--app-pane-text)] placeholder:text-[var(--app-pane-placeholder)]",
    label: "text-[var(--app-pane-text-soft)]",
    ring: "focus-ring-light",
    adornment: "text-[var(--app-pane-placeholder)]",
  },
} as const;

export function Input({
  className,
  label,
  error,
  hint,
  size = "lg",
  tone = "dark",
  leading,
  trailing,
  id,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const styles = TONES[tone];

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn("font-ui text-[13px] font-medium", styles.label)}
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leading && (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 left-3 flex items-center",
              styles.adornment
            )}
          >
            {leading}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full rounded-[var(--radius-control)] border font-ui transition-colors disabled:cursor-not-allowed disabled:opacity-60",
            HEIGHTS[size],
            styles.ring,
            styles.field,
            leading && "pl-10",
            trailing && "pr-12",
            className
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-2 flex items-center">{trailing}</span>
        )}
      </div>
      {hint && !error && (
        <span id={hintId} className="font-ui text-xs text-[var(--color-text-muted)]">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="font-ui text-xs text-[var(--color-danger)]">
          {error}
        </span>
      )}
    </div>
  );
}
