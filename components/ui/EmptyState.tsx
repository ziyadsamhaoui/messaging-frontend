import React from "react";
import { cn } from "@/lib/utils";

type Tone = "panel" | "pane";

const TONES: Record<Tone, { title: string; body: string; icon: string }> = {
  panel: {
    title: "text-[var(--app-panel-text)]",
    body: "text-[var(--app-panel-text-soft)]",
    icon: "bg-[rgba(164,190,123,0.14)] text-[var(--app-panel-text-soft)]",
  },
  pane: {
    title: "text-[var(--app-pane-text)]",
    body: "text-[var(--app-pane-text-soft)]",
    icon: "bg-[rgba(40,84,48,0.08)] text-[var(--app-pane-text-soft)]",
  },
};

/**
 * The empty state for a panel or a pane: an icon, a statement of what is missing
 * and one action when there is something useful to do. Shared so the four panels
 * cannot drift into four different shapes, and used instead of a bare line of text.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  tone = "panel",
  className,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const styles = TONES[tone];
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center", className)}>
      <span
        aria-hidden="true"
        className={cn("flex h-12 w-12 items-center justify-center rounded-full", styles.icon)}
      >
        {icon}
      </span>
      {/*
        A real heading, not a paragraph: an empty state is the content of the region it
        sits in, so it belongs in the outline. `h2` is the level every caller needs —
        the destination's `h1` is the section panel, and its pane and panel contents are
        subordinate to it.
      */}
      <h2 className={cn("font-ui text-[15px] font-semibold", styles.title)}>{title}</h2>
      {description && (
        <p className={cn("max-w-[36ch] font-ui text-[13px] leading-relaxed", styles.body)}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
