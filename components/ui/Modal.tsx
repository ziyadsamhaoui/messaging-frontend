"use client";

import React, { useCallback, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

interface ModalEntry {
  id: symbol;
  onClose: () => void;
}

const modalStack: ModalEntry[] = [];

let lockedOverflow: string | null = null;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function lockBodyScroll() {
  if (typeof document === "undefined") return;
  if (modalStack.length === 1) {
    lockedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}

function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  if (modalStack.length === 0) {
    document.body.style.overflow = lockedOverflow ?? "";
    lockedOverflow = null;
  }
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const entryRef = useRef<ModalEntry | null>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const entry = entryRef.current;
    if (!entry) return;
    const top = modalStack[modalStack.length - 1];
    if (!top || top.id !== entry.id) return;

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      entry.onClose();
      return;
    }

    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => element.offsetParent !== null || element === document.activeElement
    );
    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey) {
      if (active === first || !active || !dialog.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !active || !dialog.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const entry: ModalEntry = { id: Symbol("modal"), onClose: () => onCloseRef.current() };
    entryRef.current = entry;
    triggerRef.current = (document.activeElement as HTMLElement) ?? null;
    modalStack.push(entry);
    lockBodyScroll();
    window.addEventListener("keydown", handleKeyDown, true);

    const dialog = dialogRef.current;
    const initial = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (initial ?? dialog)?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      const index = modalStack.indexOf(entry);
      if (index >= 0) modalStack.splice(index, 1);
      entryRef.current = null;
      unlockBodyScroll();
      const trigger = triggerRef.current;
      if (trigger && typeof trigger.focus === "function" && document.contains(trigger)) {
        trigger.focus();
      }
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(40,84,48,0.6)] backdrop-blur-sm px-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={cn(
          "w-full max-w-lg rounded-3xl border border-[rgba(164,190,123,0.2)] bg-gradient-to-br from-[rgba(40,84,48,0.95)] to-[rgba(26,58,32,0.95)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] focus:outline-none",
          className
        )}
      >
        <div className="flex items-center justify-between">
          {title && (
            <h3
              id={titleId}
              className="text-lg font-semibold text-transparent bg-gradient-to-r from-[var(--color-parchment)] to-[var(--color-sage)] bg-clip-text"
            >
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-[rgba(164,190,123,0.85)] hover:text-[var(--color-parchment)]"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
