"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./Input";

export interface SearchInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "size" | "type" | "leading" | "trailing"
  > {
  value: string;
  onValueChange: (value: string) => void;
  tone?: "dark" | "light";
  className?: string;
}

export function SearchInput({
  value,
  onValueChange,
  tone = "dark",
  className,
  onKeyDown,
  ...props
}: SearchInputProps) {
  return (
    <Input
      {...props}
      type="search"
      size="md"
      tone={tone}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      leading={<Search size={18} strokeWidth={1.75} aria-hidden="true" />}
      trailing={
        value ? (
          <button
            type="button"
            onClick={() => onValueChange("")}
            aria-label="Clear search"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none",
              tone === "light"
                ? "text-[var(--app-pane-text-soft)] hover:bg-[var(--app-pane-hover)] hover:text-[var(--app-pane-text)]"
                : "text-[var(--app-panel-text-soft)] hover:bg-[var(--app-panel-hover)] hover:text-[var(--app-panel-text)]"
            )}
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : undefined
      }
      className={cn("pr-10 [&::-webkit-search-cancel-button]:appearance-none", className)}
      onKeyDown={(event) => {
        if (event.key === "Escape" && value) {
          event.preventDefault();
          event.stopPropagation();
          onValueChange("");
          return;
        }
        onKeyDown?.(event);
      }}
    />
  );
}
