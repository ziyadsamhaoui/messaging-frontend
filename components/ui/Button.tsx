import React from "react";
import { cn } from "@/lib/utils";

export function Button({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-cta)] px-5 py-2.5 text-sm font-medium text-[var(--color-parchment)] transition hover:bg-[var(--color-cta-hover)]",
        className
      )}
      {...props}
    />
  );
}
