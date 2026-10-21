import React from "react";
import { cn } from "@/lib/utils";

export type TooltipSide = "right" | "bottom" | "top" | "bottom-start" | "bottom-end";

const SIDES: Record<TooltipSide, string> = {
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  "bottom-start": "top-full left-0 mt-2",
  "bottom-end": "top-full right-0 mt-2",
};

export function Tooltip({
  label,
  side = "right",
  className,
}: {
  label: string;
  side?: TooltipSide;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "app-tooltip pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-[rgba(164,190,123,0.25)] bg-[var(--app-tooltip-surface)] px-2 py-1 font-ui text-xs font-medium text-[var(--app-tooltip-text)] shadow-[0_8px_20px_-10px_rgba(4,16,8,0.8)]",
        SIDES[side],
        className
      )}
    >
      {label}
    </span>
  );
}

export const tooltipTriggerClass = "app-tooltip-trigger relative";
