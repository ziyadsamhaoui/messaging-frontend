"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/**
 * True only after hydration. The portal must not be created while the shell is
 * being prerendered (there is no `document`), and this reads that fact from the
 * store snapshot instead of flipping state from an effect, which would cost an
 * extra render pass on open.
 */
function useIsClient() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const GAP = 8;
const MARGIN = 8;

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** The trigger the popover is positioned against and returns focus to. */
  anchor: HTMLElement | null;
  /** Accessible name for the popover. */
  label: string;
  align?: "start" | "end" | "center";
  side?: "top" | "bottom";
  className?: string;
  /**
   * `menu` is for a popover that holds menu items — the message options, a member's
   * gear menu — so the items are announced as `menuitem`s of a real menu instead of
   * as buttons inside a dialog.
   */
  role?: "dialog" | "menu";
  children: React.ReactNode;
}

/**
 * A small anchored surface for message actions, quick reactions and confirmations.
 *
 * It replaces `window.confirm` and the inline "are you sure" pairs that used to sit
 * inside rows. Two things matter for behaviour: it is rendered into the document
 * body, so a panel with `overflow: hidden` cannot clip it, and while it is open it
 * traps Tab, closes on Escape and returns focus to the trigger — the same contract
 * the modal already provides, at popover scale.
 */
export function Popover({
  open,
  onClose,
  anchor,
  label,
  align = "start",
  side = "bottom",
  className,
  role = "dialog",
  children,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const isClient = useIsClient();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const place = useCallback(() => {
    const panel = panelRef.current;
    const trigger = anchor;
    if (!panel || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;

    let left =
      align === "end" ? rect.right - width : align === "center" ? rect.left + rect.width / 2 - width / 2 : rect.left;

    let top = side === "top" ? rect.top - height - GAP : rect.bottom + GAP;
    // Flip when the preferred side has no room, then clamp so the panel is always
    // fully on screen even at 390 px wide.
    if (side === "bottom" && top + height > window.innerHeight - MARGIN) {
      top = Math.max(MARGIN, rect.top - height - GAP);
    } else if (side === "top" && top < MARGIN) {
      top = Math.min(rect.bottom + GAP, window.innerHeight - height - MARGIN);
    }
    left = Math.min(Math.max(MARGIN, left), Math.max(MARGIN, window.innerWidth - width - MARGIN));

    setPosition({ top, left });
  }, [align, anchor, side]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  /*
   * Focus is moved into the panel only once it has been positioned, because until
   * then the panel is `visibility: hidden` — and a hidden element cannot take focus,
   * so the call would silently do nothing and the popover would open with focus still
   * on the trigger. That is what made the message menu unreachable by arrow keys.
   */
  useEffect(() => {
    if (!open || !position) return;
    const panel = panelRef.current;
    const initial = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? panel;
    initial?.focus({ preventScroll: true });
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
    // Captured so a scroll inside any ancestor scroller (the message list, the
    // panel) re-places the popover instead of letting it drift away from its trigger.
    const reposition = () => place();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchor?.contains(target)) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, onClose, anchor]);

  useEffect(() => {
    if (open) return;
    // Focus goes back to the control that opened it, which is what makes the
    // popover usable from the keyboard.
    if (anchor && document.contains(anchor)) {
      anchor.focus({ preventScroll: true });
    }
  }, [open, anchor]);

  if (!open || !isClient) return null;

  return createPortal(
    <div
      ref={panelRef}
      role={role}
      aria-label={label}
      tabIndex={-1}
      style={{
        position: "fixed",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
      className={cn(
        "focus-ring-light z-50 min-w-40 rounded-2xl border border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)] p-1.5 shadow-[0_18px_40px_-20px_rgba(4,16,8,0.75)]",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}

/**
 * A row inside a {@link Popover}: 32 px tall, full width, left aligned. Exported
 * separately so a menu entry that has to be a *link* can share the exact styling
 * without nesting an anchor inside a button.
 */
export function popoverItemClasses({
  danger,
  className,
}: { danger?: boolean; className?: string } = {}) {
  return cn(
    "focus-ring-light flex h-8 w-full items-center gap-2 rounded-lg px-2.5 font-ui text-[13px] font-medium transition-colors duration-150 motion-reduce:transition-none",
    danger
      ? "text-[var(--app-danger-on-light)] hover:bg-[rgba(143,42,27,0.12)]"
      : "text-[var(--app-pane-text)] hover:bg-[var(--app-pane-hover)]",
    className
  );
}

export function PopoverItem({
  className,
  danger,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button type="button" className={popoverItemClasses({ danger, className })} {...props}>
      {children}
    </button>
  );
}
