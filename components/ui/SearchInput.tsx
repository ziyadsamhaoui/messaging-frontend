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
  /** The surface the field sits on. Panel search rows are on the dark panel. */
  tone?: "dark" | "light";
  className?: string;
}

/**
 * The one search field style.
 *
 * Search rows used to be `Input` with a magnifier passed as a `leading` adornment,
 * which should have been enough — except `Input` merged the size tokens (and their
 * `px-*`) *after* the `pl-10` that makes room for the icon, so tailwind-merge kept
 * the horizontal padding from the size and dropped the room for the icon. The
 * placeholder therefore started under the magnifier. That merge order is fixed in
 * `Input`, and this component states the geometry the design calls for in one place:
 *
 *   40 px tall, an 18 px magnifier at 12 px from the left edge (aria-hidden),
 *   40 px of left padding so text starts 10 px clear of it, 40 px of right padding
 *   so a typed value never runs under the 32 px clear button at 8 px from the edge.
 *
 * Escape clears the field. The clear button is a real button, not a pseudo-element,
 * so it is reachable by keyboard and exposes a name.
 */
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
