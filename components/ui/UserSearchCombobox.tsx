"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { PublicUserDto } from "../../lib/types";
import { useUserSearch } from "../../hooks/useUserSearch";
import { Input } from "./Input";
import { cn } from "../../lib/utils";

interface UserSearchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (user: PublicUserDto) => void;
  label?: string;
  placeholder?: string;
  inputClassName?: string;
  renderOption?: (user: PublicUserDto, active: boolean) => React.ReactNode;
  closeOnSelect?: boolean;
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

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        label={label}
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClassName}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-activedescendant={showList && results[safeIndex] ? optionId(safeIndex) : undefined}
        autoComplete="off"
      />
      {showList && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-[rgba(164,190,123,0.2)] bg-[rgba(26,58,32,0.98)] shadow-lg">
          {search.isFetching && results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[rgba(164,190,123,0.9)]">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[rgba(164,190,123,0.9)]">No people found.</div>
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
                      "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm text-[var(--color-parchment)]",
                      active ? "bg-[rgba(95,141,78,0.35)]" : "hover:bg-[rgba(95,141,78,0.2)]"
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
