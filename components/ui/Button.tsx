import React from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline" | "soft";
}

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition",
        variant === "primary" &&
          "bg-[var(--color-cta)] text-[var(--color-parchment)] hover:bg-[var(--color-cta-hover)]",
        variant === "ghost" &&
          "bg-transparent text-[var(--color-text-primary)] hover:bg-[rgba(164,190,123,0.1)]",
        variant === "outline" &&
          "border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-sage)]",
        variant === "soft" &&
          "bg-[rgba(164,190,123,0.15)] text-[var(--color-parchment)] hover:bg-[rgba(164,190,123,0.25)]",
        className
      )}
      {...props}
    />
  );
}

