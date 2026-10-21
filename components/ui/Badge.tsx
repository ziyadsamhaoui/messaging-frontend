import React from "react";
import { cn } from "@/lib/utils";
import { formatCount } from "@/lib/time";


const FILL =
  "bg-[var(--app-badge-fill)] text-[var(--app-badge-text)] font-ui font-semibold leading-none";

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
        "absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px]",
        "ring-2 ring-[var(--app-rail)]",
        FILL,
        className
      )}
    >
      {formatCount(count, max)}
    </span>
  );
}

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
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[12px]",
        FILL,
        className
      )}
    >
      {formatCount(count, max)}
    </span>
  );
}

export function Dot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
    />
  );
}
