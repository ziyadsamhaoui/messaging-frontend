"use client";

import React, { useCallback, useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { buttonClasses } from "./Button";

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

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

let openDialogs = 0;
let lockedOverflow: string | null = null;

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  danger,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const isClient = useIsClient();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCancelRef = useRef(onCancel);
  const titleId = useId();
  const descriptionId = useId();
  const busyRef = useRef(busy);

  useEffect(() => {
    onCancelRef.current = onCancel;
    busyRef.current = busy;
  }, [onCancel, busy]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (!busyRef.current) onCancelRef.current();
      return;
    }
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
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

    triggerRef.current = (document.activeElement as HTMLElement) ?? null;
    openDialogs += 1;
    if (openDialogs === 1) {
      lockedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    window.addEventListener("keydown", handleKeyDown, true);
    cancelRef.current?.focus({ preventScroll: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      openDialogs = Math.max(openDialogs - 1, 0);
      if (openDialogs === 0) {
        document.body.style.overflow = lockedOverflow ?? "";
        lockedOverflow = null;
      }
      const trigger = triggerRef.current;
      if (trigger && typeof trigger.focus === "function" && document.contains(trigger)) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [open, handleKeyDown]);

  if (!open || !isClient) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(12,28,16,0.82)] px-4"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "focus-ring w-full max-w-sm rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] p-5 focus:outline-none"
        )}
      >
        <h2 id={titleId} className="font-ui text-[15px] font-semibold text-[var(--app-panel-text)]">
          {title}
        </h2>
        {description && (
          <p
            id={descriptionId}
            className="mt-2 font-ui text-[13px] leading-relaxed text-[var(--app-panel-text-soft)]"
          >
            {description}
          </p>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={() => !busy && onCancel()}
            disabled={busy}
            className={buttonClasses({ variant: "secondary", size: "sm", tone: "panel" })}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => !busy && onConfirm()}
            disabled={busy}
            className={buttonClasses({
              variant: danger ? "danger" : "primary",
              size: "sm",
              tone: "panel",
            })}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
