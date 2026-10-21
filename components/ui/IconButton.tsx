"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Tooltip, tooltipTriggerClass, type TooltipSide } from "./Tooltip";

export type IconButtonSurface = "rail" | "panel" | "pane";
export type IconButtonSize = "sm" | "md" | "lg";

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
  rail: {
    idle: "text-[var(--app-rail-text)] hover:bg-[var(--app-rail-hover)] hover:text-[var(--app-rail-text-strong)]",
    danger: "text-[var(--app-danger-on-dark)] hover:bg-[rgba(192,57,43,0.22)]",
    focus: "focus-ring",
  },
  panel: {
    idle: "text-[var(--app-panel-text-soft)] hover:bg-[var(--app-panel-hover)] hover:text-[var(--app-panel-text)]",
    danger: "text-[var(--app-danger-on-dark)] hover:bg-[rgba(192,57,43,0.28)]",
    focus: "focus-ring",
  },
  pane: {
    idle: "text-[var(--app-pane-text-soft)] hover:bg-[var(--app-pane-hover)] hover:text-[var(--app-pane-text)]",
    danger: "text-[var(--app-danger-on-light)] hover:bg-[rgba(143,42,27,0.12)]",
    focus: "focus-ring-light",
  },
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tooltip?: string | null;
  tooltipSide?: TooltipSide;
  surface?: IconButtonSurface;
  size?: IconButtonSize;
  tone?: "default" | "danger";
  touch?: boolean;
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
