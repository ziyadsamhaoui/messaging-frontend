import React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonTone = "dark" | "light" | "panel" | "pane";

const BASE =
  "focus-ring inline-flex items-center justify-center gap-2 font-ui font-semibold tracking-[0.01em] " +
  "rounded-[var(--radius-control)] transition-[background-color,background-image,border-color,color,box-shadow,transform] " +
  "duration-200 ease-out active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-[var(--control-height-sm)] px-3.5 text-[13px]",
  md: "h-[var(--control-height-md)] px-4 text-sm",
  lg: "h-[var(--control-height-lg)] px-6 text-[15px]",
};

const VARIANTS: Record<ButtonTone, Record<ButtonVariant, string>> = {
  dark: {
    primary:
      "bg-[var(--color-parchment)] " +
      "text-[var(--color-forest)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-5px_9px_-7px_rgba(4,16,8,0.45),0_2px_3px_-1px_rgba(4,16,8,0.4),0_12px_26px_-14px_rgba(4,16,8,0.85)] " +
      "hover:-translate-y-0.5 hover:bg-[var(--color-parchment-elevated)] " +
      "hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-5px_9px_-7px_rgba(4,16,8,0.4),0_3px_5px_-1px_rgba(4,16,8,0.45),0_18px_34px_-14px_rgba(4,16,8,0.9)] " +
      "disabled:bg-[var(--color-parchment-dim)] disabled:text-[var(--color-forest)] " +
      "disabled:opacity-100 disabled:translate-y-0 disabled:hover:bg-[var(--color-parchment-dim)]",
    secondary:
      "border border-[rgba(229,217,182,0.42)] bg-[rgba(20,46,25,0.42)] text-[var(--color-parchment)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-5px_9px_-7px_rgba(4,16,8,0.35),0_10px_22px_-16px_rgba(4,16,8,0.7)] backdrop-blur-sm " +
      "hover:-translate-y-0.5 hover:bg-[rgba(20,46,25,0.58)] hover:border-[rgba(229,217,182,0.65)] " +
      "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-5px_9px_-7px_rgba(4,16,8,0.3),0_14px_28px_-16px_rgba(4,16,8,0.75)]",
    ghost:
      "bg-transparent text-[var(--color-text-secondary)] " +
      "hover:bg-[rgba(229,217,182,0.1)] hover:text-[var(--color-parchment)]",
    danger:
      "bg-[#8F2A1B] text-[var(--color-parchment-elevated)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_-14px_rgba(4,16,8,0.8)] " +
      "hover:-translate-y-0.5 hover:bg-[#A03020]",
  },
  light: {
    primary:
      "bg-[var(--color-primary)] text-[var(--color-parchment)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-5px_9px_-7px_rgba(0,0,0,0.5),0_2px_3px_-1px_rgba(4,16,8,0.3),0_12px_24px_-14px_rgba(4,16,8,0.7)] " +
      "hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)] " +
      "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-5px_9px_-7px_rgba(0,0,0,0.45),0_3px_5px_-1px_rgba(4,16,8,0.35),0_18px_30px_-14px_rgba(4,16,8,0.75)]",
    secondary:
      "border border-[rgba(40,84,48,0.3)] bg-[rgba(40,84,48,0.06)] text-[var(--color-text-on-light)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-5px_9px_-7px_rgba(20,46,25,0.16),0_8px_18px_-14px_rgba(20,46,25,0.35)] " +
      "hover:-translate-y-0.5 hover:bg-[rgba(40,84,48,0.12)] hover:border-[rgba(40,84,48,0.45)] " +
      "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.75),inset_0_-5px_9px_-7px_rgba(20,46,25,0.14),0_12px_22px_-14px_rgba(20,46,25,0.4)]",
    ghost:
      "bg-transparent text-[var(--color-text-on-light-soft)] " +
      "hover:bg-[rgba(40,84,48,0.08)] hover:text-[var(--color-text-on-light)]",
    danger:
      "bg-[#8F2A1B] text-[var(--color-parchment-elevated)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_-14px_rgba(4,16,8,0.7)] " +
      "hover:-translate-y-0.5 hover:bg-[#A03020]",
  },
  panel: {
    primary:
      "bg-[var(--color-primary)] text-[var(--color-parchment)] " +
      "font-medium text-sm hover:bg-[var(--color-primary-hover)]",
    secondary:
      "border border-[var(--app-panel-field-border)] bg-transparent text-[var(--app-panel-text)] " +
      "font-medium text-sm hover:bg-[var(--app-panel-hover)]",
    ghost:
      "bg-transparent text-[var(--app-panel-text-soft)] font-medium text-sm " +
      "hover:bg-[var(--app-panel-hover)] hover:text-[var(--app-panel-text)]",
    danger:
      "bg-[#8F2A1B] text-[var(--color-parchment)] font-medium text-sm hover:bg-[#A03020]",
  },
  pane: {
    primary:
      "bg-[var(--color-primary)] text-[var(--color-parchment)] " +
      "font-medium text-sm hover:bg-[var(--color-primary-hover)]",
    secondary:
      "border border-[var(--app-pane-control-border)] bg-transparent text-[var(--app-pane-text)] " +
      "font-medium text-sm hover:bg-[var(--app-pane-hover)]",
    ghost:
      "bg-transparent text-[var(--app-pane-text-soft)] font-medium text-sm " +
      "hover:bg-[var(--app-pane-hover)] hover:text-[var(--app-pane-text)]",
    danger:
      "bg-[#8F2A1B] text-[var(--color-parchment)] font-medium text-sm hover:bg-[#A03020]",
  },
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  className?: string;
}

export function buttonClasses({
  variant = "primary",
  size = "md",
  tone = "dark",
  className,
}: ButtonStyleOptions = {}) {
  return cn(BASE, SIZES[size], VARIANTS[tone][variant], className);
}

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleOptions {}

export function Button({
  className,
  variant = "primary",
  size = "md",
  tone = "dark",
  ...props
}: ButtonProps) {
  return <button className={buttonClasses({ variant, size, tone, className })} {...props} />;
}
