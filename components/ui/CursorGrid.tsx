"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface CursorGridProps {
  tone?: "dark" | "light";
  className?: string;
}

const SOFTEN_OVER =
  "[data-cursor-grid-soften], a[href], button, [role=\"button\"], [role=\"tab\"], " +
  "img, input, textarea, select, label, summary";

const SOFTENED_OPACITY = "0.3";

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
