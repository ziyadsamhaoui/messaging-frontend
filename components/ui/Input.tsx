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
  /**
   * The surface the field sits on, so foreground and border stay legible on both.
   * `dark` is the default and is what the authentication cards and the public pages
   * already use; `light` is for the parchment panes of the app screen.
   */
  tone?: "dark" | "light";
  /** Rendered inside the field on the left edge (e.g. a search icon). */
  leading?: React.ReactNode;
  /** Rendered inside the field on the right edge (e.g. a visibility toggle). */
  trailing?: React.ReactNode;
}

const TONES = {
  dark: {
    field:
      "border-[var(--color-field-border)] bg-[var(--color-field)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-placeholder)] hover:bg-[var(--color-field-hover)]",
    label: "text-[var(--color-text-secondary)]",
    ring: "focus-ring",
    // The placeholder token, so the icon reads as a hint rather than as content.
    adornment: "text-[var(--color-text-placeholder)]",
  },
  // On parchment: forest text at 6.22:1, a 3.30:1 control border and a 4.64:1
  // placeholder, all measured against the pane.
  light: {
    field:
      "border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)] text-[var(--app-pane-text)] placeholder:text-[var(--app-pane-placeholder)]",
    label: "text-[var(--app-pane-text-soft)]",
    ring: "focus-ring-light",
    adornment: "text-[var(--app-pane-placeholder)]",
  },
} as const;

/**
 * The one text field style per surface.
 *
 * Panels and panes each get exactly one height, radius, border and placeholder
 * contrast, and a search field is this component with a `leading` magnifier rather
 * than a hand-rolled `<input type="search">` with its own classes — which is how the
 * chat and connections panels ended up with a field that did not match the fields
 * inside the dialogs.
 */
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
            styles.ring,
            styles.field,
            leading && "pl-10",
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
