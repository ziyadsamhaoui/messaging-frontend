import React from "react";
import { cn } from "../../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-2xl bg-gradient-to-r from-[rgba(40,84,48,0.35)] via-[rgba(95,141,78,0.2)] to-[rgba(40,84,48,0.35)] bg-[length:200%_100%]",
        className
      )}
    />
  );
}

