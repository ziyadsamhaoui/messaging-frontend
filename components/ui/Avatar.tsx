import React from "react";
import { cn } from "../../lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-sage)] to-[var(--color-fern)] text-xs font-semibold text-[var(--color-parchment)]",
        className
      )}
    >
      {initials || "?"}
    </div>
  );
}

