"use client";

import React, { useEffect, useRef, useState } from "react";
import { Mic, Plus, Send, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { extensionForMimeType } from "@/lib/attachments/compress";
import { AttachmentMenu } from "./composer/AttachmentMenu";
import { VoiceRecorderBar } from "./composer/VoiceRecorderBar";

const LINE_HEIGHT_PX = 22;
const MAX_LINES = 6;
const MAX_HEIGHT_PX = LINE_HEIGHT_PX * MAX_LINES + 20;

const COMPOSER_EMOJI = [
  "😀", "😄", "😊", "🙂", "😉", "😍", "😘", "🤔",
  "😅", "😢", "😭", "😮", "😴", "🥳", "😎", "👍",
  "👏", "🙏", "❤️", "🔥", "🎉", "✅", "❌", "💡",
];

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (content: string) => void;
  onSendAttachment?: (file: File) => void;
  onTyping?: () => void;
  disabled?: boolean;
  blocked?: boolean;
  muted?: boolean;
  sending?: boolean;
  blockedAction?: React.ReactNode;
}

export function MessageInput({
  value,
  onChange,
  onSend,
  onSendAttachment,
  onTyping,
  disabled,
  blocked,
  muted,
  sending,
  blockedAction,
}: MessageInputProps) {
  const toast = useToast();
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiTrigger, setEmojiTrigger] = useState<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTrigger, setMenuTrigger] = useState<HTMLButtonElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [sendingRecording, setSendingRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recorder = useVoiceRecorder();

  const hasContent = value.trim().length > 0;
  const inputDisabled = Boolean(disabled || blocked || muted);
  const recording = recorder.state !== "idle";

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

  function openPicker(accept: string) {
    const input = fileInputRef.current;
    if (!input) return;
    setMenuOpen(false);
    input.accept = accept;
    input.value = "";
    input.click();
  }

  async function sendRecording() {
    setSendingRecording(true);
    try {
      const recorded = await recorder.stop();
      const extension = extensionForMimeType(recorded.mimeType);
      const file = new File([recorded.blob], `voice-note-${Date.now()}.${extension}`, {
        type: recorded.mimeType,
      });
      onSendAttachment?.(file);
    } catch (error) {
      toast.push(
        error instanceof Error && error.message ? error.message : "The recording could not be sent.",
        "error"
      );
      recorder.reset();
    } finally {
      setSendingRecording(false);
    }
  }

  if (blocked || muted) {
    return (
      <div className="border-t border-[var(--app-pane-divider)] px-4 py-4">
        <div
          className={cn(
            "flex w-full flex-wrap items-center justify-center gap-3 rounded-2xl border px-4 py-3 text-center",
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
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          onSendAttachment?.(file);
        }}
      />

      {recording ? (
        <VoiceRecorderBar
          state={recorder.state}
          seconds={recorder.seconds}
          analyser={recorder.analyser}
          error={recorder.error}
          sending={sendingRecording}
          onPause={recorder.pause}
          onResume={recorder.resume}
          onSend={() => void sendRecording()}
          onCancel={recorder.cancel}
        />
      ) : (
        <div
          className={cn(
            "flex w-full items-end gap-1 rounded-3xl border bg-[var(--app-pane-raised)] p-1.5 transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none",
            focused
              ? "border-[var(--color-forest)] shadow-[0_0_0_2px_var(--app-pane),0_0_0_4px_var(--color-forest)]"
              : "border-[var(--app-pane-control-border)]"
          )}
        >
          <div className="flex shrink-0 items-center">
          <IconButton
            ref={setMenuTrigger}
            surface="pane"
            size="md"
            label="Add attachment"
            tooltip={null}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>

          <IconButton
            ref={setEmojiTrigger}
            surface="pane"
            size="md"
            label="Insert emoji"
            tooltip={null}
            aria-haspopup="dialog"
            aria-expanded={emojiOpen}
            onClick={() => setEmojiOpen(true)}
          >
            <Smile size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
          </div>

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
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Type a message"
            disabled={inputDisabled}
            className="max-h-[152px] min-h-[22px] flex-1 resize-none self-center bg-transparent px-1 py-2 font-ui text-[15px] text-[var(--app-pane-text)] placeholder:text-[var(--app-pane-placeholder)] focus:outline-none focus-visible:outline-none"
            style={{ height: LINE_HEIGHT_PX + 16 }}
          />

          {hasContent ? (
            <button
              type="button"
              onClick={submit}
              disabled={inputDisabled || sending}
              aria-label="Send message"
              className={cn(
                "focus-ring-light flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none",
                !inputDisabled
                  ? "bg-[var(--color-primary)] text-[var(--color-parchment)] hover:bg-[var(--color-primary-hover)]"
                  : "cursor-not-allowed bg-[rgba(40,84,48,0.18)] text-[var(--app-pane-placeholder)]"
              )}
            >
              <Send size={20} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : (
            <IconButton
              surface="pane"
              size="md"
              label="Record a voice message"
              tooltip={null}
              onClick={() => void recorder.start()}
              disabled={inputDisabled}
            >
              <Mic size={20} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
          )}
        </div>
      )}

      <AttachmentMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={menuTrigger}
        onPick={openPicker}
      />

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
