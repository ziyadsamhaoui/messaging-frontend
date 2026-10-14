"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type FieldSize = "sm" | "md" | "lg";

const HEIGHTS: Record<FieldSize, string> = {
  sm: "h-[var(--control-height-sm)] px-3 text-[13px]",
  md: "h-[var(--control-height-md)] px-3.5 text-sm",
  lg: "h-[var(--control-height-lg)] px-3.5 text-[15px]",
};

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string | null;
  hint?: string;
  size?: FieldSize;
  /** Rendered inside the field on the right edge (e.g. a visibility toggle). */
  trailing?: React.ReactNode;
}

export function Input({
  className,
  label,
  error,
  hint,
  size = "lg",
  trailing,
  id,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="font-ui text-[13px] font-medium text-[var(--color-text-secondary)]"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "focus-ring w-full rounded-[var(--radius-control)] border border-[var(--color-field-border)] bg-[var(--color-field)] font-ui text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-text-placeholder)] hover:bg-[var(--color-field-hover)] disabled:cursor-not-allowed disabled:opacity-60",
            trailing && "pr-12",
            HEIGHTS[size],
            className
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>
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
