"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, tooltipTriggerClass, type TooltipSide } from "./Tooltip";

export type IconButtonSurface = "rail" | "panel" | "pane";
export type IconButtonSize = "sm" | "md" | "lg";

/*
 * Heights are 36 / 40 / 44 px only, matching the control scale: 36 and 40 for a
 * desk, 44 wherever the same control can be reached by touch. The `touch` flag
 * promotes a small control to 44 px below the 768 px breakpoint rather than
 * shipping a second component.
 */
const SIZES: Record<IconButtonSize, string> = {
  sm: "h-9 w-9",
  md: "h-10 w-10",
  lg: "h-11 w-11",
};

interface SurfaceStyles {
  idle: string;
  danger: string;
  focus: string;
}

const SURFACES: Record<IconButtonSurface, SurfaceStyles> = {
  // Rail: sage on the darkest forest measures 6.13:1, so the icon is never faint;
  // cream on hover reads 8.94:1. Focus uses the dark-surface ring.
  rail: {
    idle: "text-[var(--app-rail-text)] hover:bg-[var(--app-rail-hover)] hover:text-[var(--app-rail-text-strong)]",
    danger: "text-[var(--app-danger-on-dark)] hover:bg-[rgba(192,57,43,0.22)]",
    focus: "focus-ring",
  },
  // Panel: the sage token only reaches 4.26:1 on this surface, so icons use the
  // lighter sage (5.59:1) and cream on hover (6.22:1).
  panel: {
    idle: "text-[var(--app-panel-text-soft)] hover:bg-[var(--app-panel-hover)] hover:text-[var(--app-panel-text)]",
    danger: "text-[var(--app-danger-on-dark)] hover:bg-[rgba(192,57,43,0.28)]",
    focus: "focus-ring",
  },
  // Parchment: forest at 6.22:1, and the light-surface focus pair.
  pane: {
    idle: "text-[var(--app-pane-text-soft)] hover:bg-[var(--app-pane-hover)] hover:text-[var(--app-pane-text)]",
    danger: "text-[var(--app-danger-on-light)] hover:bg-[rgba(143,42,27,0.12)]",
    focus: "focus-ring-light",
  },
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name. Required: an icon alone never names a control. */
  label: string;
  /** Tooltip text; defaults to `label`. Pass `null` to render no tooltip at all. */
  tooltip?: string | null;
  tooltipSide?: TooltipSide;
  surface?: IconButtonSurface;
  size?: IconButtonSize;
  tone?: "default" | "danger";
  /** Promote to a 44 px target below the 768 px breakpoint. */
  touch?: boolean;
  /**
   * React 19 passes `ref` as a normal prop; callers that need to anchor a popover
   * to this control (or return focus to it) use a callback ref, not `useRef` read
   * during render.
   */
  ref?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
}

export function IconButton({
  label,
  tooltip,
  tooltipSide = "bottom",
  surface = "panel",
  size = "md",
  tone = "default",
  touch,
  className,
  children,
  ...props
}: IconButtonProps) {
  const styles = SURFACES[surface];
  const tooltipLabel = tooltip === null ? null : tooltip ?? label;

  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] transition-colors duration-150 motion-reduce:transition-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        SIZES[size],
        touch && "max-md:h-11 max-md:w-11",
        tone === "danger" ? styles.danger : styles.idle,
        styles.focus,
        tooltipLabel && tooltipTriggerClass,
        className
      )}
      {...props}
    >
      {children}
      {tooltipLabel && <Tooltip label={tooltipLabel} side={tooltipSide} />}
    </button>
  );
}
