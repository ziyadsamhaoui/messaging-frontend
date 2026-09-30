import React from "react";
import { cn } from "../../lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
}

export function Textarea({ className, label, error, ...props }: TextareaProps) {
  return (
    <label className="flex w-full flex-col gap-2 text-sm">
      {label && <span className="text-[var(--color-text-secondary)]">{label}</span>}
      <textarea
        className={cn(
          "min-h-[80px] resize-none rounded-2xl border border-[var(--color-border)] bg-[rgba(40,84,48,0.7)] px-4 py-3 text-[var(--color-parchment)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-sage)] focus:outline-none focus:ring-2 focus:ring-[rgba(164,190,123,0.35)]",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-[var(--color-error)]">{error}</span>}
    </label>
  );
}

