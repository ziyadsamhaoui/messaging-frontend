"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { PublicUserDto } from "@/lib/types";
import { useUserSearch } from "@/hooks/useUserSearch";
import { Input } from "./Input";
import { SearchInput } from "./SearchInput";
import { cn } from "@/lib/utils";

interface UserSearchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (user: PublicUserDto) => void;
  label?: string;
  placeholder?: string;
  inputClassName?: string;
  renderOption?: (user: PublicUserDto, active: boolean) => React.ReactNode;
  closeOnSelect?: boolean;
  variant?: "field" | "search";
  tone?: "dark" | "light";
}

export function UserSearchCombobox({
  value,
  onValueChange,
  onSelect,
  label,
  placeholder,
  inputClassName,
  renderOption,
  closeOnSelect = true,
  variant = "field",
  tone = "dark",
}: UserSearchComboboxProps) {
  const search = useUserSearch(value);
  const results = useMemo(() => search.data ?? [], [search.data]);
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const enabled = value.trim().length >= 2;
  const showList = open && enabled;
  const safeIndex = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  useEffect(() => {
    if (!showList) return;
    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showList]);

  const optionId = useCallback((index: number) => `${listboxId}-option-${index}`, [listboxId]);

  const select = useCallback(
    (user: PublicUserDto) => {
      onSelect(user);
      if (closeOnSelect) setOpen(false);
    },
    [onSelect, closeOnSelect]
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (showList) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      if (!enabled) return;
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (results.length === 0) return;
      setActiveIndex((index) => (index + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp") {
      if (!enabled || !open || results.length === 0) return;
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
      return;
    }
    if (event.key === "Enter") {
      if (!showList || results.length === 0) return;
      const active = results[safeIndex];
      if (!active) return;
      event.preventDefault();
      select(active);
    }
  }

  const handleChange = (next: string) => {
    onValueChange(next);
    setActiveIndex(0);
    setOpen(true);
  };

  const shared = {
    onFocus: () => setOpen(true),
    onKeyDown: handleKeyDown,
    placeholder,
    role: "combobox" as const,
    "aria-expanded": showList,
    "aria-controls": listboxId,
    "aria-autocomplete": "list" as const,
    "aria-haspopup": "listbox" as const,
    "aria-activedescendant":
      showList && results[safeIndex] ? optionId(safeIndex) : undefined,
    autoComplete: "off",
  };

  return (
    <div ref={wrapperRef} className="relative">
      {variant === "search" ? (
        <SearchInput
          {...shared}
          value={value}
          onValueChange={handleChange}
          aria-label={label ?? placeholder ?? "Search people"}
          className={inputClassName}
          tone={tone}
        />
      ) : (
        <Input
          {...shared}
          label={label}
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          className={inputClassName}
        />
      )}
      {showList && (
        <div
          className={cn(
            "absolute z-20 mt-1 w-full rounded-xl border shadow-lg",
            tone === "light"
              ? "border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)]"
              : "border-[rgba(164,190,123,0.2)] bg-[rgba(26,58,32,0.98)]"
          )}
        >
          {search.isFetching && results.length === 0 ? (
            <div
              className={cn(
                "px-3 py-2 font-ui text-xs",
                tone === "light"
                  ? "text-[var(--app-pane-text-soft)]"
                  : "text-[rgba(164,190,123,0.9)]"
              )}
            >
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div
              className={cn(
                "px-3 py-2 font-ui text-xs",
                tone === "light"
                  ? "text-[var(--app-pane-text-soft)]"
                  : "text-[rgba(164,190,123,0.9)]"
              )}
            >
              No people found.
            </div>
          ) : (
            <ul
              id={listboxId}
              role="listbox"
              aria-label={label ?? "Search results"}
              className="max-h-52 overflow-y-auto py-1"
            >
              {results.map((user, index) => {
                const active = index === safeIndex;
                return (
                  <li
                    key={user.id}
                    id={optionId(index)}
                    role="option"
                    aria-selected={active}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      select(user);
                    }}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 font-ui text-sm",
                      tone === "light"
                        ? "text-[var(--app-pane-text)]"
                        : "text-[var(--color-parchment)]",
                      active
                        ? tone === "light"
                          ? "bg-[var(--app-pane-hover)]"
                          : "bg-[rgba(95,141,78,0.35)]"
                        : tone === "light"
                          ? "hover:bg-[var(--app-pane-hover)]"
                          : "hover:bg-[rgba(95,141,78,0.2)]"
                    )}
                  >
                    {renderOption ? (
                      renderOption(user, active)
                    ) : (
                      <span className="truncate">@{user.username}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
