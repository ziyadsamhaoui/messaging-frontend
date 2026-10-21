"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

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
  anchor: HTMLElement | null;
  label: string;
  align?: "start" | "end" | "center";
  side?: "top" | "bottom";
  className?: string;
  role?: "dialog" | "menu";
  children: React.ReactNode;
}

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

  useEffect(() => {
    if (!open || !position) return;
    const panel = panelRef.current;
    const initial = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? panel;
    initial?.focus({ preventScroll: true });
  }, [open, position]);

  useEffect(() => {
    if (!open) return;
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

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current) return;
    wasOpenRef.current = false;
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
