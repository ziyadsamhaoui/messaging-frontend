"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePanelWidth } from "@/hooks/usePanelWidth";
import { cn } from "@/lib/utils";

const STEP_PX = 16;
const LARGE_STEP_PX = 48;

interface DragState {
  pointerId: number;
  startX: number;
  startWidth: number;
  /** The most recent width the pointer asked for; written on the next frame, and on drop. */
  pending: number;
}

/**
 * The section panel's resize handle.
 *
 * Behaviour worth stating because each part is a decision:
 *
 * - The hit area is 8 px wide even though the line it draws is 1 px, because a 1 px
 *   target is unhittable. The line thickens to 3 px on hover and while dragging, which
 *   is the only feedback needed to make the affordance discoverable.
 * - Dragging uses pointer events with pointer capture, so the gesture survives the
 *   pointer leaving the 8 px strip — which it does immediately during a fast drag — and
 *   works identically for mouse, pen and touch. `touch-action: none` stops a touch drag
 *   from scrolling the panel instead of resizing it.
 * - Width updates are coalesced into one `requestAnimationFrame` per frame: a pointer can
 *   fire far more often than the display refreshes, and re-rendering the panel and the
 *   chat beside it on every event is wasted work. localStorage is written once, on
 *   pointer up, not on every frame.
 * - Text selection is disabled on the body for the duration of the drag; without it a
 *   drag across the panel selects labels instead of moving the edge.
 * - The handle is a real `separator` with a value, so it is operable from the keyboard:
 *   arrows move 16 px (48 with Shift), Home and End jump to the limits, and Enter resets
 *   to the default — the same reset a double-click performs.
 */
export function PanelResizeHandle() {
  const { width, min, max, enabled, setWidth, reset } = usePanelWidth();
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const frameRef = useRef<number | null>(null);

  const clamp = useCallback(
    (value: number) => Math.min(Math.max(Math.round(value), min), max),
    [min, max]
  );

  const write = useCallback(
    (value: number, persist: boolean) => {
      setWidth(clamp(value), { persist });
    },
    [setWidth, clamp]
  );

  const flushFrame = useCallback(() => {
    frameRef.current = null;
    const state = dragRef.current;
    if (!state) return;
    setWidth(clamp(state.pending), { persist: false });
  }, [setWidth, clamp]);

  const scheduleFrame = useCallback(
    (value: number) => {
      const state = dragRef.current;
      if (!state) return;
      state.pending = value;
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(flushFrame);
    },
    [flushFrame]
  );

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!enabled || event.button !== 0) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is unavailable in jsdom and in some older engines; the drag still
      // works while the pointer stays over the handle.
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: width,
      pending: width,
    };
    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    scheduleFrame(state.startWidth + (event.clientX - state.startX));
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state) return;
    dragRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    // Persisted once here rather than on every frame, and against the final value so a
    // drag that ends between frames still stores where the pointer stopped.
    write(state.pending, true);
    setDragging(false);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Nothing to release outside a captured pointer.
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!enabled) return;
    const step = event.shiftKey ? LARGE_STEP_PX : STEP_PX;
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        write(width + step, true);
        return;
      case "ArrowLeft":
        event.preventDefault();
        write(width - step, true);
        return;
      case "Home":
        event.preventDefault();
        write(min, true);
        return;
      case "End":
        event.preventDefault();
        write(max, true);
        return;
      case "Enter":
        event.preventDefault();
        reset();
        return;
      default:
    }
  }

  useEffect(() => {
    if (!dragging) return;
    const previousSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    return () => {
      document.body.style.userSelect = previousSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [dragging]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={width}
      aria-valuetext={`${width} pixels`}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={handleKeyDown}
      onDoubleClick={reset}
      className={cn(
        "app-panel-resize-handle focus-ring group/handle absolute inset-y-0 -right-1 z-20 flex w-2",
        "cursor-col-resize touch-none items-stretch justify-center",
        !enabled && "pointer-events-none"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-full w-px bg-[var(--app-panel-divider)] transition-[width,background-color] duration-150 motion-reduce:transition-none",
          "group-hover/handle:w-[3px] group-hover/handle:bg-[var(--color-sage)]",
          dragging && "w-[3px] bg-[var(--color-sage)]"
        )}
      />
    </div>
  );
}
