import React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
/** The surface the control sits on, so the foreground stays legible on both. */
export type ButtonTone = "dark" | "light";

const BASE =
  "focus-ring inline-flex items-center justify-center gap-2 font-ui font-semibold tracking-[0.01em] " +
  "rounded-[var(--radius-control)] transition-[background-color,background-image,border-color,color,box-shadow,transform] " +
  "duration-200 ease-out active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-[var(--control-height-sm)] px-3.5 text-[13px]",
  md: "h-[var(--control-height-md)] px-4 text-sm",
  lg: "h-[var(--control-height-lg)] px-6 text-[15px]",
};

/*
 * Each variant is a small piece of material rather than a flat fill: a soft
 * vertical gradient, a one-pixel highlight along the top edge, and a shallow
 * shadow so the control lifts off the surface. Foreground colours are unchanged
 * from the measured pairs, so every label stays at or above 4.5:1.
 */
const VARIANTS: Record<ButtonTone, Record<ButtonVariant, string>> = {
  dark: {
    primary:
      "bg-[linear-gradient(180deg,var(--color-parchment-elevated),var(--color-parchment-dim))] " +
      "text-[var(--color-forest)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_10px_24px_-14px_rgba(4,16,8,0.8)] " +
      "hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#FFFFFF,var(--color-parchment-elevated))] " +
      "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_30px_-14px_rgba(4,16,8,0.85)]",
    // A smoked-glass panel rather than a near-transparent tint: on the hero's
    // mid-green the tint alone left the label around 3.4:1, while the smoked
    // fill keeps the parchment label at roughly 5:1.
    secondary:
      "border border-[rgba(229,217,182,0.42)] bg-[rgba(20,46,25,0.42)] text-[var(--color-parchment)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-sm " +
      "hover:-translate-y-0.5 hover:bg-[rgba(20,46,25,0.58)] hover:border-[rgba(229,217,182,0.65)]",
    ghost:
      "bg-transparent text-[var(--color-text-secondary)] " +
      "hover:bg-[rgba(229,217,182,0.1)] hover:text-[var(--color-parchment)]",
    danger:
      "bg-[linear-gradient(180deg,#B43625,#8F2A1B)] text-[var(--color-parchment-elevated)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_-14px_rgba(4,16,8,0.8)] " +
      "hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#C0392B,#A5301F)]",
  },
  light: {
    primary:
      "bg-[linear-gradient(180deg,#3F6B36,var(--color-primary))] text-[var(--color-parchment)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_10px_22px_-14px_rgba(4,16,8,0.7)] " +
      "hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#47763C,var(--color-primary-hover))] " +
      "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_26px_-14px_rgba(4,16,8,0.75)]",
    secondary:
      "border border-[rgba(40,84,48,0.3)] bg-[rgba(40,84,48,0.06)] text-[var(--color-text-on-light)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] " +
      "hover:-translate-y-0.5 hover:bg-[rgba(40,84,48,0.12)] hover:border-[rgba(40,84,48,0.45)]",
    ghost:
      "bg-transparent text-[var(--color-text-on-light-soft)] " +
      "hover:bg-[rgba(40,84,48,0.08)] hover:text-[var(--color-text-on-light)]",
    danger:
      "bg-[linear-gradient(180deg,#B43625,#8F2A1B)] text-[var(--color-parchment-elevated)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_10px_22px_-14px_rgba(4,16,8,0.7)] " +
      "hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#C0392B,#A5301F)]",
  },
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  tone?: ButtonTone;
  className?: string;
}

/**
 * The single source of truth for action styling. Exported separately so anchors
 * and other elements can share the exact same treatment as {@link Button}.
 */
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
