"use client";

import React, { useEffect, useRef } from "react";
import { Pause, Play, Send, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { VoiceRecorderState } from "@/hooks/useVoiceRecorder";

interface VoiceRecorderBarProps {
  state: VoiceRecorderState;
  seconds: number;
  analyser: AnalyserNode | null;
  error: string | null;
  sending?: boolean;
  onPause: () => void;
  onResume: () => void;
  onSend: () => void;
  onCancel: () => void;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function VoiceRecorderBar({
  state,
  seconds,
  analyser,
  error,
  sending,
  onPause,
  onResume,
  onSend,
  onCancel,
}: VoiceRecorderBarProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = state === "paused";
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const color =
      getComputedStyle(document.documentElement).getPropertyValue("--color-fern").trim() || "#5d7f4a";
    let frame = 0;

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.fillStyle = color;

      if (analyser && data && !pausedRef.current) {
        analyser.getByteFrequencyData(data);
      }

      const bars = 36;
      const gap = 2;
      const barWidth = Math.max(2, (width - gap * (bars - 1)) / bars);
      for (let index = 0; index < bars; index += 1) {
        const sample = data && !pausedRef.current ? data[Math.floor((index * data.length) / bars)] / 255 : 0.14;
        const barHeight = Math.max(3, sample * height);
        context.globalAlpha = pausedRef.current ? 0.35 : 0.85;
        context.fillRect(index * (barWidth + gap), (height - barHeight) / 2, barWidth, barHeight);
      }
      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [analyser]);

  if (state === "error") {
    return (
      <div
        role="alert"
        className="flex min-h-12 w-full items-center gap-3 rounded-3xl border border-[rgba(143,42,27,0.3)] bg-[rgba(143,42,27,0.08)] px-3 py-2"
      >
        <p className="min-w-0 flex-1 font-ui text-[13px] text-[var(--app-pane-text)]">
          {error ?? "The microphone could not be started."}
        </p>
        <IconButton surface="pane" size="md" label="Discard recording" onClick={onCancel}>
          <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-12 w-full items-center gap-2 rounded-3xl border border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)] px-2 py-1.5">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--app-danger-on-light)]"
      />
      <span className="sr-only">
        {state === "paused" ? "Recording paused" : "Recording in progress"}
      </span>
      <span className="w-10 shrink-0 font-ui text-[13px] tabular-nums text-[var(--app-pane-text-soft)]">
        {formatDuration(seconds)}
      </span>
      <canvas ref={canvasRef} aria-hidden="true" className="h-8 min-w-0 flex-1" />
      <IconButton
        surface="pane"
        size="md"
        label={state === "paused" ? "Resume recording" : "Pause recording"}
        onClick={state === "paused" ? onResume : onPause}
      >
        {state === "paused" ? (
          <Play size={18} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Pause size={18} strokeWidth={1.75} aria-hidden="true" />
        )}
      </IconButton>
      <IconButton
        surface="pane"
        size="md"
        label="Discard recording"
        onClick={onCancel}
      >
        <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
      </IconButton>
      <button
        type="button"
        onClick={onSend}
        disabled={sending || state === "requesting"}
        aria-label="Send voice note"
        className="focus-ring-light flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-parchment)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:bg-[rgba(40,84,48,0.18)] disabled:text-[var(--app-pane-placeholder)] motion-reduce:transition-none"
      >
        <Send size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}
