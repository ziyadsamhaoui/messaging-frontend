"use client";

import React, { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  as?: "article" | "section" | "div";
}

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
      <span
        aria-hidden="true"
        className="spotlight-ring pointer-events-none absolute inset-0 rounded-[inherit]"
      />
      <div className="relative">{children}</div>
    </Tag>
  );
}
