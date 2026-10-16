import React from "react";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/time";

/*
 * Count badges. Both shapes are decorative: the number belongs to the accessible
 * name of the thing it sits on (a rail row is "Notifications, 3 unread"), so the
 * badge itself is hidden from assistive tech and is never announced twice. Callers
 * that put a count on a control without other text must include it in the label.
 *
 * The fill is the sage token with forest text: 6.13:1, and it reads the same on the
 * rail as on the panel. A cream-on-fern badge (2.76:1) is what this replaces.
 */

const FILL =
  "bg-[var(--app-badge-fill)] text-[var(--app-badge-text)] font-ui font-semibold leading-none";

/** Round badge used on a collapsed rail row, pinned to the icon's top-right. */
export function RailBadge({
  count,
  max = 9,
  className,
}: {
  count: number;
  max?: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px]",
        "ring-2 ring-[var(--app-rail)]",
        FILL,
        className
      )}
    >
      {formatCount(count, max)}
    </span>
  );
}

/** Pill badge used at the end of an expanded row and on conversation rows. */
export function CountBadge({
  count,
  max = 99,
  className,
}: {
  count: number;
  max?: number;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px]",
        FILL,
        className
      )}
    >
      {formatCount(count, max)}
    </span>
  );
}

/**
 * A plain dot: unread state, a pending indicator. Paired with text or an accessible
 * name elsewhere because colour alone never carries meaning.
 */
export function Dot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
    />
  );
}
