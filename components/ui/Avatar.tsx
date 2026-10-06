import React from "react";
import { cn } from "../../lib/utils";
import { OnlineStatus } from "../../lib/types";
import { presenceDotClass } from "../../lib/presence";

interface AvatarProps {
  name: string;
  className?: string;
  status?: OnlineStatus;
}

export function Avatar({ name, className, status }: AvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="relative flex-shrink-0">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-sage)] to-[var(--color-fern)] text-xs font-semibold text-[var(--color-parchment)]",
          className
        )}
      >
        {initials || "?"}
      </div>
      {status && (
        <span
          aria-label={`Presence: ${status}`}
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[rgba(26,58,32,0.9)]",
            presenceDotClass[status]
          )}
        />
      )}
    </div>
  );
}
