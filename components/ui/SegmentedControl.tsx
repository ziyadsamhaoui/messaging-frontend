"use client";

import React, { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CountBadge } from "./Badge";

const TRACK_PADDING_PX = 4;
const TRACK_GAP_PX = 8;

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  idBase: string;
  label: string;
  className?: string;
  glossy?: boolean;
}

export function segmentedTabId(idBase: string, value: string) {
  return `${idBase}-tab-${value}`;
}

export function segmentedPanelId(idBase: string) {
  return `${idBase}-panel`;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  idBase,
  label,
  className,
  glossy = true,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const count = options.length;

  const pillWidth = `calc((100% - ${TRACK_PADDING_PX * 2 + TRACK_GAP_PX * (count - 1)}px) / ${count})`;
  const pillOffset = `calc(${Math.max(selectedIndex, 0)} * (100% + ${TRACK_GAP_PX}px))`;

  const moveFocus = useCallback(
    (index: number) => {
      const next = (index + options.length) % options.length;
      setFocusIndex(next);
      refs.current[next]?.focus();
    },
    [options.length]
  );

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        moveFocus(index + 1);
        return;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        moveFocus(index - 1);
        return;
      case "Home":
        event.preventDefault();
        moveFocus(0);
        return;
      case "End":
        event.preventDefault();
        moveFocus(options.length - 1);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        onChange(options[index].value);
        return;
      default:
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "relative flex h-11 w-full items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-surface-2)] p-1",
        className
      )}
    >
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1 bottom-1 left-1 rounded-[10px] bg-[var(--color-parchment)]",
          glossy &&
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-5px_9px_-7px_rgba(4,16,8,0.45),0_2px_3px_-1px_rgba(4,16,8,0.4),0_12px_26px_-14px_rgba(4,16,8,0.85)]",
          "transition-[transform,width] duration-200 ease-out motion-reduce:transition-none"
        )}
        style={{ width: pillWidth, transform: `translateX(${pillOffset})` }}
      />
      {options.map((option, index) => {
        const selected = option.value === value;
        const tabIndex =
          focusIndex !== null ? (index === focusIndex ? 0 : -1) : index === selectedIndex ? 0 : -1;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={segmentedTabId(idBase, option.value)}
            aria-selected={selected}
            aria-controls={segmentedPanelId(idBase)}
            aria-label={
              option.count && option.count > 0 ? `${option.label}, ${option.count}` : undefined
            }
            tabIndex={tabIndex}
            onClick={() => {
              setFocusIndex(index);
              onChange(option.value);
            }}
            onFocus={() => setFocusIndex(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "focus-ring relative z-10 flex h-full flex-1 items-center justify-center rounded-[10px] px-3 font-ui! text-sm font-medium",
              "transition-colors duration-200 motion-reduce:transition-none",
              selected
                ? "bg-transparent text-[var(--color-forest)]"
                : "bg-transparent text-[var(--color-sage-light)] hover:text-[var(--color-parchment)]"
            )}
          >
            {option.label}
            {option.count !== undefined && option.count > 0 && (
              <CountBadge count={option.count} max={9} className="ml-1.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}
