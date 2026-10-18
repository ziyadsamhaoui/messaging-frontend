"use client";

import React, { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: React.ReactNode;
  /** Surface classes (radius, border, background, padding, shadow). */
  className?: string;
  /** Semantic element to render. Defaults to `article`: a self-contained card. */
  as?: "article" | "section" | "div";
}

/**
 * A card whose surface responds to the pointer: a lit one-pixel border edge follows
 * the cursor, painted by `.spotlight-ring` in `globals.css`.
 *
 * Position and opacity are written straight to this element's inline style — the
 * node is held in a ref owned here and never handed out — so a pointermove costs one
 * `requestAnimationFrame` and zero React renders. Touch pointers are skipped (there
 * is no hover to follow, and chasing a dragging finger would fight scrolling), and
 * the fade is a CSS transition, not an animation loop.
 *
 * The card is unchanged while nothing is pointing at it: the border starts at zero
 * opacity.
 */
export function SpotlightCard({ children, className, as = "article" }: SpotlightCardProps) {
  const node = useRef<HTMLElement | null>(null);
  const frame = useRef<number | null>(null);
  const point = useRef({ x: 0, y: 0 });

  const setNode = useCallback((element: HTMLElement | null) => {
    node.current = element;
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch") return;
    const element = node.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    point.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        element.style.setProperty("--spot-x", `${point.current.x}px`);
        element.style.setProperty("--spot-y", `${point.current.y}px`);
      });
    }
    if (element.style.getPropertyValue("--spot-opacity") !== "1") {
      element.style.setProperty("--spot-opacity", "1");
    }
  }, []);

  const onPointerLeave = useCallback(() => {
    node.current?.style.setProperty("--spot-opacity", "0");
  }, []);

  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={setNode}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn("relative isolate overflow-hidden", className)}
    >
      {/*
        Purely decorative, and beneath the content (which is `relative`): the ring is a
        gradient masked down to the 1px padding box, so only the border lights up.
      */}
      <span
        aria-hidden="true"
        className="spotlight-ring pointer-events-none absolute inset-0 rounded-[inherit]"
      />
      <div className="relative">{children}</div>
    </Tag>
  );
}
