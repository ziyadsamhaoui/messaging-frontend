"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";

const LINE_HEIGHT_PX = 22;
const MAX_LINES = 6;
const MAX_HEIGHT_PX = LINE_HEIGHT_PX * MAX_LINES + 20;

/*
 * The composer's emoji set. Emoji here are user content (they end up in the
 * message), and there is no emoji picker dependency in the project, so this is a
 * deliberately small built-in set rather than a new package.
 */
const COMPOSER_EMOJI = [
  "😀", "😄", "😊", "🙂", "😉", "😍", "😘", "🤔",
  "😅", "😢", "😭", "😮", "😴", "🥳", "😎", "👍",
  "👏", "🙏", "❤️", "🔥", "🎉", "✅", "❌", "💡",
];

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string) => void;
  onTyping?: () => void;
  disabled?: boolean;
  blocked?: boolean;
  muted?: boolean;
  sending?: boolean;
  /** Shown instead of the field when the reader cannot write here. */
  blockedAction?: React.ReactNode;
}

/**
 * The composer, docked to the bottom of the message column and using the same
 * centred width as the messages above it.
 *
 * A failed send never clears the draft: the text stays in the field (only a
 * successful send clears it), which is what makes retrying a one-key action.
 */
export function MessageInput({
  value,
  onChange,
  onSend,
  onTyping,
  disabled,
  blocked,
  muted,
  sending,
  blockedAction,
}: MessageInputProps) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiTrigger, setEmojiTrigger] = useState<HTMLButtonElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const hasContent = value.trim().length > 0;
  const inputDisabled = Boolean(disabled || blocked || muted);

  // Auto-growing field: one line to begin with, up to six, then it scrolls. The
  // height is written directly to the element so growing the field never re-renders
  // the message list above it.
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const next = Math.min(textarea.scrollHeight, MAX_HEIGHT_PX);
    textarea.style.height = `${next}px`;
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || inputDisabled) return;
    onSend(trimmed);
  }

  if (blocked || muted) {
    return (
      <div className="border-t border-[var(--app-pane-divider)] px-4 py-4">
        <div
          className={cn(
            "mx-auto flex max-w-[820px] flex-wrap items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-center",
            blocked
              ? "border-[rgba(143,42,27,0.3)] bg-[rgba(143,42,27,0.08)]"
              : "border-[rgba(224,165,59,0.4)] bg-[rgba(224,165,59,0.12)]"
          )}
        >
          <p className="font-ui text-[13px] text-[var(--app-pane-text)]">
            {blocked
              ? "This conversation is blocked. Messaging is disabled until the block is lifted."
              : "You are muted in this room and cannot send messages."}
          </p>
          {blockedAction}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--app-pane-divider)] px-4 py-3">
      <div className="mx-auto flex w-full max-w-[820px] items-end gap-2 rounded-3xl border border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)] p-1.5">
        <IconButton
          ref={setEmojiTrigger}
          surface="pane"
          size="md"
          label="Insert emoji"
          tooltip="Emoji"
          aria-haspopup="dialog"
          aria-expanded={emojiOpen}
          onClick={() => setEmojiOpen(true)}
        >
          <Smile size={20} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>

        <label className="sr-only" htmlFor="composer">
          Message
        </label>
        <textarea
          id="composer"
          ref={textareaRef}
          value={value}
          rows={1}
          onChange={(event) => {
            onChange(event.target.value);
            onTyping?.();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Type a message"
          disabled={inputDisabled}
          className={cn(
            "focus-ring-light max-h-[152px] min-h-[22px] flex-1 resize-none self-center bg-transparent px-1 py-2 font-ui text-[15px] text-[var(--app-pane-text)]",
            "placeholder:text-[var(--app-pane-placeholder)] focus:outline-none"
          )}
          style={{ height: LINE_HEIGHT_PX + 16 }}
        />

        <button
          type="button"
          onClick={submit}
          disabled={!hasContent || inputDisabled || sending}
          aria-label="Send message"
          className={cn(
            "focus-ring-light flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none",
            hasContent && !inputDisabled
              ? "bg-[var(--color-primary)] text-[var(--color-parchment)] hover:bg-[var(--color-primary-hover)]"
              : "cursor-not-allowed bg-[rgba(40,84,48,0.18)] text-[var(--app-pane-placeholder)]"
          )}
        >
          <Send size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <Popover
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        anchor={emojiTrigger}
        label="Insert an emoji"
      >
        <div className="grid w-[248px] grid-cols-8 gap-0.5 p-1">
          {COMPOSER_EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`Insert ${emoji}`}
              onClick={() => {
                onChange(value + emoji);
                setEmojiOpen(false);
                textareaRef.current?.focus();
              }}
              className="focus-ring-light flex h-7 w-7 items-center justify-center rounded-lg text-base hover:bg-[var(--app-pane-hover)]"
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}
