"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Tooltip, tooltipTriggerClass } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import {
  AVATAR_MAX_ZOOM,
  AVATAR_MIN_ZOOM,
  AVATAR_VIEW_PX,
  AvatarCrop,
  AvatarRotation,
  DEFAULT_AVATAR_CROP,
  clampAvatarCrop,
  paintAvatar,
  renderAvatar,
} from "@/lib/avatar";
import { errorMessage } from "@/lib/errors";

const KEY_STEP_PX = 8;

type Gesture =
  | { kind: "drag"; x: number; y: number; offsetX: number; offsetY: number }
  | { kind: "pinch"; distance: number; zoom: number };

function reduceMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AvatarCropper({
  source,
  onCancel,
  onApply,
}: {
  source: ImageBitmap;
  onCancel: () => void;
  onApply: (blob: Blob) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const [crop, setCrop] = useState<AvatarCrop>(DEFAULT_AVATAR_CROP);
  const [dragging, setDragging] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const pixelRatio = window.devicePixelRatio || 1;
    const size = AVATAR_VIEW_PX * pixelRatio;
    element.width = size;
    element.height = size;
    paintAvatar(context, source, crop, size);
    context.fillStyle = "rgba(0, 0, 0, 0.55)";
    context.fillRect(0, 0, size, size);
    context.save();
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.clip();
    paintAvatar(context, source, crop, size);
    context.restore();
  }, [source, crop]);

  function update(next: AvatarCrop) {
    setCrop(clampAvatarCrop(next, source.width, source.height));
  }

  function turn(direction: 1 | -1) {
    const rotation = ((crop.rotation + (direction === 1 ? 90 : 270)) % 360) as AvatarRotation;
    const { offsetX, offsetY } = crop;
    update({
      ...crop,
      rotation,
      offsetX: direction === 1 ? -offsetY : offsetY,
      offsetY: direction === 1 ? offsetX : -offsetX,
    });
    if (!reduceMotion()) {
      canvas.current?.animate(
        [{ transform: `rotate(${direction === 1 ? -90 : 90}deg)` }, { transform: "rotate(0deg)" }],
        { duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
      );
    }
  }

  function startGesture() {
    const points = [...pointers.current.values()];
    setDragging(points.length === 1);
    if (points.length >= 2) {
      const [a, b] = points;
      gesture.current = {
        kind: "pinch",
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        zoom: crop.zoom,
      };
    } else if (points.length === 1) {
      gesture.current = {
        kind: "drag",
        x: points[0].x,
        y: points[0].y,
        offsetX: crop.offsetX,
        offsetY: crop.offsetY,
      };
    } else {
      gesture.current = null;
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (applying) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    startGesture();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = pointers.current.get(event.pointerId);
    if (!point) return;
    point.x = event.clientX;
    point.y = event.clientY;
    const active = gesture.current;
    if (!active) return;

    if (active.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      update({ ...crop, zoom: active.zoom * (distance / active.distance) });
      return;
    }
    if (active.kind === "drag") {
      const rect = event.currentTarget.getBoundingClientRect();
      const scale = rect.width ? AVATAR_VIEW_PX / rect.width : 1;
      update({
        ...crop,
        offsetX: active.offsetX + (event.clientX - active.x) * scale,
        offsetY: active.offsetY + (event.clientY - active.y) * scale,
      });
    }
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointers.current.delete(event.pointerId)) return;
    startGesture();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    if (applying) return;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP_PX, 0],
      ArrowRight: [KEY_STEP_PX, 0],
      ArrowUp: [0, -KEY_STEP_PX],
      ArrowDown: [0, KEY_STEP_PX],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    update({ ...crop, offsetX: crop.offsetX + move[0], offsetY: crop.offsetY + move[1] });
  }

  async function apply() {
    setApplying(true);
    setError(null);
    try {
      onApply(await renderAvatar(source, crop));
    } catch (applyError) {
      setError(errorMessage(applyError));
      setApplying(false);
    }
  }

  const fraction = (crop.zoom - AVATAR_MIN_ZOOM) / (AVATAR_MAX_ZOOM - AVATAR_MIN_ZOOM);
  const fillWidth = `calc(${fraction * 100}% + ${9 - 18 * fraction}px)`;

  return (
    <Modal
      open
      onClose={onCancel}
      title="Crop your picture"
      overlayClassName="backdrop-blur-sm avatar-modal-overlay"
      titleClassName="text-[18px] font-semibold"
      className="avatar-modal-dialog max-h-[calc(100dvh-2rem)] max-w-[510px] overflow-y-auto rounded-[20px] border-white/10 bg-[var(--color-surface)] p-6 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.6)]"
    >
      <div className="flex w-full flex-col items-center gap-5">
        <div className="flex w-full flex-col items-center gap-2">
          <div className="relative aspect-square w-[min(260px,75%)]">
            <canvas
              ref={canvas}
              role="img"
              tabIndex={0}
              aria-label="Crop preview. Drag to position the picture, or use the arrow keys."
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onKeyDown={handleKeyDown}
              className={cn(
                "focus-ring absolute inset-0 h-full w-full touch-none select-none rounded-2xl",
                applying ? "cursor-default" : dragging ? "cursor-grabbing" : "cursor-grab"
              )}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-full border-2 border-white/90 shadow-[inset_0_0_18px_rgba(4,16,8,0.45),0_0_22px_rgba(164,190,123,0.25)]"
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className={cn(
                  "h-full w-full transition-opacity duration-150 motion-reduce:transition-none",
                  dragging ? "opacity-100" : "opacity-0"
                )}
              >
                {[100 / 3, (200 / 3)].map((position) => (
                  <g key={position}>
                    <line
                      x1={position}
                      y1={0}
                      x2={position}
                      y2={100}
                      stroke="white"
                      strokeOpacity={0.4}
                      strokeWidth={0.4}
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={0}
                      y1={position}
                      x2={100}
                      y2={position}
                      stroke="white"
                      strokeOpacity={0.4}
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>
          <p className="font-ui text-[13px] text-[var(--app-panel-text-soft)]">Drag to reposition</p>
        </div>

        <div className="flex w-full max-w-[360px] flex-col items-center gap-4">
          <div className="flex w-full items-center gap-3">
            <ZoomOut size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-[var(--app-panel-text-soft)]" />
            <div className="relative h-6 min-w-0 flex-1">
              <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-[rgba(164,190,123,0.28)]">
                <div className="h-full rounded-full bg-[var(--color-sage)]" style={{ width: fillWidth }} />
              </div>
              <input
                type="range"
                aria-label="Zoom"
                min={AVATAR_MIN_ZOOM}
                max={AVATAR_MAX_ZOOM}
                step={0.01}
                value={crop.zoom}
                disabled={applying}
                onChange={(event) => update({ ...crop, zoom: Number(event.target.value) })}
                className="avatar-zoom-slider disabled:cursor-not-allowed"
              />
            </div>
            <ZoomIn size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-[var(--app-panel-text-soft)]" />
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => turn(-1)}
              aria-label="Rotate left"
              disabled={applying}
              className={cn(
                "focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-[var(--app-panel-text)] transition-[background-color,transform] duration-150 hover:bg-white/[0.14] active:scale-95 active:bg-white/[0.2] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
                tooltipTriggerClass
              )}
            >
              <RotateCcw size={18} strokeWidth={1.75} aria-hidden="true" />
              <Tooltip label="Rotate left" side="top" />
            </button>
            <button
              type="button"
              onClick={() => turn(1)}
              aria-label="Rotate right"
              disabled={applying}
              className={cn(
                "focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-[var(--app-panel-text)] transition-[background-color,transform] duration-150 hover:bg-white/[0.14] active:scale-95 active:bg-white/[0.2] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
                tooltipTriggerClass
              )}
            >
              <RotateCw size={18} strokeWidth={1.75} aria-hidden="true" />
              <Tooltip label="Rotate right" side="top" />
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="w-full font-ui text-[13px] font-medium text-[var(--app-danger-on-dark)]">
            {error}
          </p>
        )}

        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="focus-ring flex h-11 w-full items-center justify-center rounded-xl border border-white/20 bg-transparent px-5 font-ui text-sm font-semibold text-[var(--app-panel-text)] transition-colors duration-150 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-36"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void apply()}
            disabled={applying}
            aria-busy={applying}
            className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-sage)] px-5 font-ui text-sm font-semibold text-[var(--color-forest-deep)] transition-colors duration-150 hover:bg-[var(--color-sage-light)] disabled:cursor-wait disabled:opacity-80 sm:h-10 sm:w-36"
          >
            {applying && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {applying ? "Preparing…" : "Use picture"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
