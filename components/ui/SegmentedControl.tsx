"use client";

import React, { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Base for the generated `tab`/`tabpanel` ids, so a panel can link back with aria-labelledby. */
  idBase: string;
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
}

/** Id of the tab for `value`, so its panel can point back at it. */
export function segmentedTabId(idBase: string, value: string) {
  return `${idBase}-tab-${value}`;
}

/**
 * Id of the content panel. Every tab points here, because both consumers render a
 * single panel and swap its contents — one always-present target keeps
 * `aria-controls` resolving instead of dangling at the inactive tab.
 */
export function segmentedPanelId(idBase: string) {
  return `${idBase}-panel`;
}

/*
 * The single segmented control in the app: previously each caller hand-rolled its
 * own, with no tab semantics and a gradient on both the track and the active
 * segment (parchment on that gradient measured 1.46:1 at the sage end).
 *
 * Conventions are the caller's original shape — `rounded-2xl` track, `p-1`, a
 * `rounded-xl` segment on a `--color-surface-2` track that is a shade lighter
 * than the card. The active segment is a SOLID cream fill: no gradient, per the
 * design constraints.
 *
 * Semantics are a manual-activation tab list: arrows/Home/End move focus, and
 * Enter or Space activates the focused tab. Focus never leaves the control, and
 * the `tab`/`tabpanel` ids are exposed through the helpers above so panels can be
 * labelled by their tab.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  idBase,
  label,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);

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
        // Manual activation: arrows only move focus, Enter/Space selects. Claiming
        // the key here stops the button's own click so onChange never fires twice.
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
        "flex h-11 w-full items-center gap-2 rounded-2xl bg-[var(--color-surface-2)] p-1",
        className
      )}
    >
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
            tabIndex={tabIndex}
            onClick={() => {
              setFocusIndex(index);
              onChange(option.value);
            }}
            onFocus={() => setFocusIndex(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              // The interface face is correct for a control, but the unlayered
              // `button { font-family: inherit }` rule in globals.css outranks a
              // plain utility, so the important modifier is what makes it land.
              "focus-ring flex h-full flex-1 items-center justify-center rounded-xl px-3 font-ui! text-sm font-medium",
              "transition-colors duration-200 motion-reduce:transition-none",
              selected
                ? "bg-[var(--color-parchment)] text-[var(--color-forest)]"
                : "bg-transparent text-[var(--color-sage-light)] hover:text-[var(--color-parchment)]"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
