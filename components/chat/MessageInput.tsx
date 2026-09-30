"use client";

import React, { useId, useState } from "react";
import { Textarea } from "../ui/Textarea";

interface MessageInputProps {
  onSend: (content: string) => Promise<void> | void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");
  const fileInputId = useId();

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed) return;
    await onSend(trimmed);
    setValue("");
  }

  const hasContent = value.trim().length > 0;

  return (
    <div className="border-t border-[rgba(40,84,48,0.1)] bg-gradient-to-r from-[rgba(212,200,158,0.8)] to-[rgba(229,217,182,0.9)] px-4 py-3">
      <div className="flex items-end gap-3">
        <div>
          <label
            htmlFor={fileInputId}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(40,84,48,0.2)] bg-[rgba(229,217,182,0.4)] text-[var(--color-forest)] transition-all hover:bg-[rgba(229,217,182,0.6)]"
            aria-label="Attach file"
          >
            +
          </label>
          <input id={fileInputId} type="file" className="hidden" />
        </div>
        <div className="relative flex-1">
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type a message..."
            className="w-full rounded-4xl text-lg border border-[rgba(40,84,48,0.15)] bg-gradient-to-r from-[rgba(40,84,48,0.08)] to-[rgba(95,141,78,0.05)] pr-12 text-[var(--color-forest)] placeholder:text-[rgba(40,84,48,0.4)] focus:ring-2 focus:ring-[rgba(95,141,78,0.3)]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!hasContent || disabled}
            className="absolute bottom-2 right-2 flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] text-[var(--color-parchment)] transition-all disabled:opacity-60"
            aria-label={hasContent ? "Send message" : "Voice message"}
          >
            {hasContent ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12m0 0-4-4m4 4-4 4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2.75a3.25 3.25 0 0 0-3.25 3.25v5a3.25 3.25 0 1 0 6.5 0v-5A3.25 3.25 0 0 0 12 2.75Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.75 11.5v.5a6.25 6.25 0 0 0 12.5 0v-.5" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.25v2.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
