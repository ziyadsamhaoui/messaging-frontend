"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type SwitchSurface = "panel" | "pane";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  surface?: SwitchSurface;
  disabled?: boolean;
  busy?: boolean;
  describedBy?: string;
  className?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  surface = "panel",
  disabled,
  busy,
  describedBy,
  className,
}: SwitchProps) {
  const inert = disabled || busy;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      aria-busy={busy || undefined}
      disabled={inert}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 motion-reduce:transition-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        surface === "pane" ? "focus-ring-light" : "focus-ring",
        checked
          ? "border-transparent bg-[var(--color-primary)]"
          : surface === "pane"
            ? "border-[var(--app-pane-control-border)] bg-transparent"
            : "border-transparent bg-[rgba(229,217,182,0.22)]",
        "max-md:before:absolute max-md:before:-inset-2.5 max-md:before:content-['']",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full transition-transform duration-150 motion-reduce:transition-none",
          checked
            ? "translate-x-6 bg-[var(--color-parchment)]"
            : surface === "pane"
              ? "translate-x-1 bg-[rgba(40,84,48,0.45)]"
              : "translate-x-1 bg-[var(--app-panel-text-soft)]"
        )}
      />
    </button>
  );
}
