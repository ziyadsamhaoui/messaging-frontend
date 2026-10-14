"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | null;
}

export function Textarea({ className, label, error, id, ...props }: TextareaProps) {
  const generatedId = React.useId();
  const textareaId = id ?? generatedId;
  const errorId = error ? `${textareaId}-error` : undefined;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="font-ui text-[13px] font-medium text-[var(--color-text-secondary)]"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(
          "focus-ring min-h-[80px] w-full resize-none rounded-[var(--radius-control)] border border-[var(--color-field-border)] bg-[var(--color-field)] px-3.5 py-3 font-ui text-[15px] text-[var(--color-text-primary)] transition-colors placeholder:text-[var(--color-text-placeholder)] hover:bg-[var(--color-field-hover)] disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        {...props}
      />
      {error && (
        <span id={errorId} className="font-ui text-xs text-[var(--color-danger)]">
          {error}
        </span>
      )}
    </div>
  );
}
