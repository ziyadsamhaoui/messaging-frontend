"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CursorGridProps {
  /** `light` for the parchment pages, `dark` (default) for the forest ones. */
  tone?: "dark" | "light";
  className?: string;
}

/**
 * What counts as page content for the softening below: interactive controls and
 * images, plus anything explicitly marked with `data-cursor-grid-soften` (used for
 * prose and artwork wrappers, where no single element is the hover target).
 */
const SOFTEN_OVER =
  "[data-cursor-grid-soften], a[href], button, [role=\"button\"], [role=\"tab\"], " +
  "img, input, textarea, select, label, summary";

/** Opacity of the grid while the pointer is over content (soft, not gone). */
const SOFTENED_OPACITY = "0.3";

/**
 * A faint grid painted over the page's own background, revealed in a soft circle
 * that follows the pointer.
 *
 * Two elements, each with one job: the outer wrapper owns the fade in and out and
 * pins the whole effect to `z-0`, so every page section — prose, buttons, artwork,
 * and the authentication card — paints above it (`z-10` and up) and stacking does not
 * depend on source order. The inner element paints the grid and is the node the
 * pointer maths writes to.
 *
 * The inner element also softens (drops to {@link SOFTENED_OPACITY}) while the
 * pointer is over content, so the lines never fight the text, the artwork's
 * transparent areas or a control's label. Only element transitions are listened for,
 * so it is stable across nested inline nodes, and the change is a CSS opacity
 * transition rather than a per-frame write.
 *
 * The wrapper is `fixed`, which is what makes the maths trivial: the mask is placed
 * with `clientX`/`clientY` and no scroll offset has to be tracked. It is
 * `pointer-events-none`, so it never intercepts a click.
 *
 * A pointermove only writes two custom properties, coalesced into one
 * `requestAnimationFrame`; no state changes and no re-renders. Touch pointers are
 * ignored: there is no hover to follow, and following a dragging finger would fight
 * scrolling. The fade in/out is a transition, so reduced-motion users can turn it
 * off from the stylesheet.
 */
export function CursorGrid({ tone = "dark", className }: CursorGridProps) {
  const layer = useRef<HTMLDivElement | null>(null);
  const frame = useRef<number | null>(null);
  const shown = useRef(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = layer.current;
    if (!node) return;

    let x = 0;
    let y = 0;

    const paint = () => {
      frame.current = null;
      node.style.setProperty("--cursor-grid-x", `${x}px`);
      node.style.setProperty("--cursor-grid-y", `${y}px`);
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      x = event.clientX;
      y = event.clientY;
      if (frame.current === null) frame.current = requestAnimationFrame(paint);
      if (!shown.current) {
        shown.current = true;
        setActive(true);
      }
    };

    const onLeave = () => {
      shown.current = false;
      setActive(false);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  /*
   * Softening lives in its own effect: it only reacts to which element the pointer
   * is over, so it is independent of the position tracking above and never runs on
   * a pointermove.
   */
  useEffect(() => {
    const node = layer.current;
    if (!node) return;

    let softened = false;

    const apply = (next: boolean) => {
      if (next === softened) return;
      softened = next;
      node.style.opacity = next ? SOFTENED_OPACITY : "1";
    };

    const onOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = event.target;
      apply(target instanceof Element && target.closest(SOFTEN_OVER) !== null);
    };

    const onBlur = () => apply(false);

    // `pointerover` is enough: entering a new element always fires it, including
    // when the pointer moves back out onto bare background, so the softer state
    // cannot get stuck.
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-0 transition-opacity duration-300 ease-out motion-reduce:transition-none",
        active ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <div
        ref={layer}
        className={cn(
          "cursor-grid absolute inset-0 transition-opacity duration-300 ease-out motion-reduce:transition-none",
          tone === "light" && "cursor-grid--light"
        )}
      />
    </div>
  );
}
