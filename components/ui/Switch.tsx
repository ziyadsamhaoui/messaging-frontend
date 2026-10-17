"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type SwitchSurface = "panel" | "pane";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /**
   * Accessible name. Required: a switch with no visible label names itself through
   * this string, exactly like {@link import("./IconButton").IconButton}.
   */
  label: string;
  surface?: SwitchSurface;
  disabled?: boolean;
  /** Set while the value is being saved so a second toggle cannot race the first. */
  busy?: boolean;
  /** Id of the element that explains the switch, wired to `aria-describedby`. */
  describedBy?: string;
  className?: string;
}

/*
 * A real `role="switch"`, not a checkbox wearing a track.
 *
 * What this replaces: native `<input type="checkbox">` on the parchment pages, which
 * rendered as the browser's own unstyled box (a light 20 px square with a blue focus
 * ring from the platform accent) in the middle of a forest-and-parchment surface, and
 * which a screen reader announced as a checkbox rather than as an on/off setting.
 *
 * The track is two flat fills and the knob is one: no gradient, no shadow, and the
 * only movement is the knob's translate. Both states were measured against their own
 * surface — the "on" track is `--color-primary` (parchment label 4.96:1) and the
 * "off" knob is `--app-panel-text-soft` on a 20% cream track.
 *
 * Height is 24 px with a 44 px hit area below the 768 px breakpoint, the same
 * touch-promotion rule the icon buttons use, so a settings row stays reachable on a
 * phone without shipping a second component.
 */
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
