import React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
/**
 * The surface the control sits on, so the foreground stays legible on both.
 *
 * `dark` and `light` are the marketing and authentication surfaces: a sculpted fill
 * with a specular top edge and a contact shadow, which is what those pages were
 * designed around and which this task must not restyle.
 *
 * `panel` and `pane` are the authenticated app screen — the forest panels and the
 * parchment pane. They are FLAT: one opaque fill, no inner sheen, no contact shadow,
 * no hover lift, and one radius. That is the design rule for the app, and keeping it
 * on its own tones is what lets the landing, login and register pages keep the look
 * they already had.
 */
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

/*
 * Each variant is a small piece of material rather than a flat fill. The gloss is
 * built from box-shadow only — a bright specular line along the top edge, a soft
 * inner shade gathering at the bottom (which is what makes it read as curved and
 * polished), a crisp contact shadow and an ambient drop — so no fill colour or
 * foreground pair changes and every label keeps its measured contrast.
 *
 * `dark.primary` stays a SOLID parchment fill: a gradient on the primary button is
 * forbidden by the design constraints, and the flat cream keeps the forest label at
 * 6.2:1. The sheen is layered on top instead. `light.primary` is solid for the same
 * reason (it is the button the landing-page fix was about).
 */
const VARIANTS: Record<ButtonTone, Record<ButtonVariant, string>> = {
  dark: {
    primary:
      "bg-[var(--color-parchment)] " +
      "text-[var(--color-forest)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-5px_9px_-7px_rgba(4,16,8,0.45),0_2px_3px_-1px_rgba(4,16,8,0.4),0_12px_26px_-14px_rgba(4,16,8,0.85)] " +
      "hover:-translate-y-0.5 hover:bg-[var(--color-parchment-elevated)] " +
      "hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-5px_9px_-7px_rgba(4,16,8,0.4),0_3px_5px_-1px_rgba(4,16,8,0.45),0_18px_34px_-14px_rgba(4,16,8,0.9)] " +
      // The base rule fades a disabled control to 60% opacity, which composites the
      // label and fill together and drops the pair to about 1.9:1 — no opacity value
      // reaches 4.5:1. A dimmer OPAQUE fill keeps the busy label legible (5.2:1) while
      // still reading as inactive. Scoped here, so no other variant changes.
      "disabled:bg-[var(--color-parchment-dim)] disabled:text-[var(--color-forest)] " +
      "disabled:opacity-100 disabled:translate-y-0 disabled:hover:bg-[var(--color-parchment-dim)]",
    // A smoked-glass panel rather than a near-transparent tint: on the hero's
    // mid-green the tint alone left the label around 3.4:1, while the smoked
    // fill keeps the parchment label at roughly 5:1.
    secondary:
      "border border-[rgba(229,217,182,0.42)] bg-[rgba(20,46,25,0.42)] text-[var(--color-parchment)] " +
      "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-5px_9px_-7px_rgba(4,16,8,0.35),0_10px_22px_-16px_rgba(4,16,8,0.7)] backdrop-blur-sm " +
      "hover:-translate-y-0.5 hover:bg-[rgba(20,46,25,0.58)] hover:border-[rgba(229,217,182,0.65)] " +
      "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-5px_9px_-7px_rgba(4,16,8,0.3),0_14px_28px_-16px_rgba(4,16,8,0.75)]",
    ghost:
      "bg-transparent text-[var(--color-text-secondary)] " +
      "hover:bg-[rgba(229,217,182,0.1)] hover:text-[var(--color-parchment)]",
    // A solid shade instead of the gradient it used to carry — gradients on a
    // control are out of the system. The parchment label on #8F2A1B measures
    // 6.89:1, and the hover shade keeps it above 4.5:1.
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
  /*
   * Authenticated app, dark panels (section panel, rail, dialogs). Flat by rule:
   * `font-medium text-sm` is repeated on every variant because the app screen sets
   * buttons at 14 px medium while the marketing surfaces keep their own scale, and
   * `cn` is a tailwind-merge so the later class wins over BASE's `font-semibold`.
   *
   * Measured pairs — parchment label on `--color-primary` 4.96:1, parchment on the
   * danger fill #8F2A1B 5.94:1, panel text on `--app-panel-field-border` above 3:1.
   */
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
  /* Authenticated app, parchment pane (page editors, empty states). Flat, as above. */
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
