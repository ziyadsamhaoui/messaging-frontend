"use client";

import React from "react";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  blocked?: boolean;
  muted?: boolean;
  sending?: boolean;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onTyping,
  disabled,
  blocked,
  muted,
  sending,
}: MessageInputProps) {
  const hasContent = value.trim().length > 0;
  const inputDisabled = Boolean(disabled || blocked || muted);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || inputDisabled) return;
    onSend(trimmed);
  }

  if (blocked) {
    return (
      <div className="border-t border-[rgba(40,84,48,0.1)] bg-[rgba(192,57,43,0.12)] px-4 py-4 text-center text-sm text-[rgba(120,30,20,0.9)]">
        This conversation is blocked. Messaging is unavailable until the block is lifted.
      </div>
    );
  }

  if (muted) {
    return (
      <div className="border-t border-[rgba(40,84,48,0.1)] bg-[rgba(163,124,44,0.14)] px-4 py-4 text-center text-sm text-[rgba(122,92,26,0.95)]">
        You are muted in this room and cannot send messages.
      </div>
    );
  }

  return (
    <div className="border-t border-[rgba(40,84,48,0.1)] bg-gradient-to-r from-[rgba(212,200,158,0.8)] to-[rgba(229,217,182,0.9)] px-4 py-3">
      <div className="relative flex items-end gap-3">
        <Textarea
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            onTyping?.();
          }}
          placeholder="Type a message..."
          disabled={inputDisabled}
          className="w-full rounded-4xl border border-[rgba(40,84,48,0.15)] bg-gradient-to-r from-[rgba(40,84,48,0.08)] to-[rgba(95,141,78,0.05)] pr-14 text-lg text-[var(--color-forest)] placeholder:text-[rgba(40,84,48,0.4)] focus:ring-2 focus:ring-[rgba(95,141,78,0.3)]"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!hasContent || inputDisabled || sending}
          className="absolute bottom-2 right-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] text-[var(--color-parchment)] transition-all disabled:opacity-60"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
