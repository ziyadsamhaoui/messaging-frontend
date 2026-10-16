"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, Clock, Copy, Pencil, Smile, Trash2 } from "lucide-react";
import { ChatMessage, MessageReactionSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/time";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";

/*
 * Emoji are user content, not UI icons, so the reaction set is a plain array rather
 * than an icon library import. The quick row is the six that cover almost every
 * reaction; the "more" panel is a small built-in set.
 */
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];
const MORE_REACTIONS = [
  "🙏", "🔥", "👏", "😍", "🤔", "😅", "😊", "😎", "🥳", "😴",
  "👍🏽", "💯", "✅", "❌", "⭐", "🌈", "🌿", "☕", "🎈", "🚀",
  "💡", "📌", "🤝", "🕊️",
];

const URL_PATTERN = /(https?:\/\/[^\s<>()"']+)/gi;

/**
 * Message text with plain URLs turned into links.
 *
 * Only `http(s)` is linked, the anchor is opened with `noopener noreferrer nofollow`
 * and nothing is fetched to build a preview — the link is the link. Long words and
 * URLs are wrapped by the bubble, never allowed to widen it.
 */
function MessageText({ content }: { content: string }) {
  const parts = content.split(URL_PATTERN);
  return (
    <p className="whitespace-pre-wrap font-ui text-[15px] leading-relaxed [overflow-wrap:anywhere]">
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline decoration-1 underline-offset-2"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={`text-${index}`}>{part}</React.Fragment>
        )
      )}
    </p>
  );
}

interface ReactionGroup {
  emoji: string;
  count: number;
  mine: boolean;
}

function groupReactions(
  reactions: MessageReactionSummary[] | undefined,
  currentUserId: string | null
): ReactionGroup[] {
  if (!reactions || reactions.length === 0) return [];
  const groups = new Map<string, ReactionGroup>();
  for (const reaction of reactions) {
    const existing = groups.get(reaction.emoji) ?? { emoji: reaction.emoji, count: 0, mine: false };
    existing.count += 1;
    if (currentUserId && reaction.userId === currentUserId) existing.mine = true;
    groups.set(reaction.emoji, existing);
  }
  return Array.from(groups.values());
}

export interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  /** Sender name is only shown in group chats, above the first bubble of a group. */
  showSenderName: boolean;
  /** First bubble of the sender's group: the 4 px "tail" corner is not used here. */
  isFirstOfGroup: boolean;
  /** Last bubble of the group: carries the tail corner and the avatar. */
  isLastOfGroup: boolean;
  senderName?: string;
  canDeleteAsOwner?: boolean;
  currentUserId: string | null;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  showSenderName,
  isFirstOfGroup,
  isLastOfGroup,
  senderName,
  canDeleteAsOwner,
  currentUserId,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
}: MessageBubbleProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [reactionTrigger, setReactionTrigger] = useState<HTMLButtonElement | null>(null);
  const [menuTrigger, setMenuTrigger] = useState<HTMLButtonElement | null>(null);
  const editRef = useRef<HTMLTextAreaElement | null>(null);

  const canDelete = Boolean(onDelete && (isOwn || canDeleteAsOwner));
  const canEdit = Boolean(onEdit && isOwn && message.type === "TEXT" && !message.isDeleted);
  const reactions = groupReactions(message.reactions, currentUserId);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  function saveEdit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onEdit?.(message.id, trimmed);
    setEditing(false);
  }

  /* The tail corner belongs to the sender's side, on the last bubble of the group. */
  const radius =
    isOwn && isLastOfGroup
      ? "rounded-2xl rounded-br-[4px]"
      : !isOwn && isLastOfGroup
        ? "rounded-2xl rounded-bl-[4px]"
        : "rounded-2xl";

  const bubbleClasses = cn(
    "w-fit max-w-full px-3 py-2",
    radius,
    isOwn
      ? "bg-[var(--app-bubble-out)] text-[var(--app-bubble-out-text)]"
      : "border border-[var(--app-bubble-in-border)] bg-[var(--app-bubble-in)] text-[var(--app-bubble-in-text)]"
  );

  const metaClasses = cn(
    "mt-1 flex items-center justify-end gap-1.5 font-ui text-[11px]",
    isOwn ? "text-[var(--app-bubble-out-text)]" : "text-[var(--app-pane-text-soft)]"
  );

  return (
    <div
      className={cn(
        "group/message flex w-full items-end gap-2",
        isOwn ? "flex-row-reverse" : "flex-row",
        isFirstOfGroup ? "mt-3" : "mt-0.5"
      )}
    >
      <div className={cn("flex min-w-0 max-w-[70%] flex-col", isOwn ? "items-end" : "items-start")}>
        {showSenderName && !isOwn && (
          <span className="mb-0.5 px-1 font-ui text-[12px] font-semibold text-[var(--app-pane-text-soft)]">
            {senderName ?? message.senderUsername}
          </span>
        )}

        <div className={cn("flex w-full items-end gap-1.5", isOwn ? "justify-end" : "justify-start")}>
          <div className={bubbleClasses}>
            {editing ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  saveEdit();
                }}
                className="flex w-[min(60ch,100%)] flex-col gap-2"
              >
                <textarea
                  ref={editRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setDraft(message.content);
                      setEditing(false);
                    }
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      saveEdit();
                    }
                  }}
                  rows={2}
                  aria-label="Edit message"
                  className="focus-ring-light w-full resize-none rounded-lg border border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)] px-2 py-1 font-ui text-[15px] text-[var(--app-pane-text)]"
                />
                <span className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(message.content);
                      setEditing(false);
                    }}
                    className="focus-ring-light rounded-lg px-2 py-1 font-ui text-[12px] font-medium text-[var(--app-pane-text-soft)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="focus-ring-light rounded-lg bg-[var(--color-primary)] px-2 py-1 font-ui text-[12px] font-semibold text-[var(--color-parchment)]"
                  >
                    Save
                  </button>
                </span>
              </form>
            ) : (
              <MessageText content={message.content} />
            )}

            <div className={metaClasses}>
              {message.isEdited && <span>edited</span>}
              <span>{formatClock(message.createdAt)}</span>
              {isOwn && message.pending && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} strokeWidth={2} aria-hidden="true" />
                  <span className="sr-only">Sending</span>
                </span>
              )}
              {isOwn && !message.pending && !message.failed && (
                <span className="inline-flex items-center gap-1">
                  <Check size={12} strokeWidth={2} aria-hidden="true" />
                  <span className="sr-only">Sent</span>
                </span>
              )}
              {message.failed && <span className="font-medium">Failed to send</span>}
            </div>
          </div>

          {/*
            The action toolbar: revealed on hover and on keyboard focus (the buttons
            stay in the tab order, and `group-focus-within` reveals them), never on
            touch until the bubble is long-pressed — a touch device simply taps the
            row, which is why the buttons keep a 36 px target.
          */}
          {!message.pending && !message.failed && !message.isDeleted && (
            <span className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/message:opacity-100 group-focus-within/message:opacity-100 motion-reduce:transition-none">
              {onReact && (
                <IconButton
                  ref={setReactionTrigger}
                  surface="pane"
                  size="sm"
                  label="React to message"
                  tooltip="React"
                  aria-haspopup="dialog"
                  aria-expanded={reactionOpen}
                  onClick={() => setReactionOpen(true)}
                >
                  <Smile size={16} strokeWidth={1.75} aria-hidden="true" />
                </IconButton>
              )}
              {canEdit && (
                <IconButton
                  surface="pane"
                  size="sm"
                  label="Edit message"
                  tooltip="Edit"
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(true);
                  }}
                >
                  <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                </IconButton>
              )}
              {canDelete && (
                <IconButton
                  ref={setMenuTrigger}
                  surface="pane"
                  size="sm"
                  label="Delete message"
                  tooltip="Delete"
                  aria-haspopup="dialog"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen(true)}
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                </IconButton>
              )}
              <IconButton
                surface="pane"
                size="sm"
                label="Copy message"
                tooltip="Copy"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(message.content);
                    toast.push("Message copied.", "success");
                  } catch {
                    toast.push("Could not copy the message.", "error");
                  }
                }}
              >
                <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
            </span>
          )}
        </div>

        {reactions.length > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1", isOwn ? "justify-end" : "justify-start")}>
            {reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                aria-pressed={reaction.mine}
                aria-label={`${reaction.emoji} ${reaction.count}`}
                onClick={() =>
                  reaction.mine && onRemoveReaction
                    ? onRemoveReaction(message.id)
                    : onReact?.(message.id, reaction.emoji)
                }
                className={cn(
                  "focus-ring-light flex h-7 items-center gap-1 rounded-full border px-2 font-ui text-[12px]",
                  // On the tinted "mine" chip the soft text measures 4.42:1, so the
                  // label uses the full pane text colour (5.29:1) there.
                  reaction.mine
                    ? "border-[var(--color-fern)] bg-[rgba(95,141,78,0.18)] text-[var(--app-pane-text)]"
                    : "border-[var(--app-pane-control-border)] text-[var(--app-pane-text-soft)]"
                )}
              >
                <span aria-hidden="true">{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <Popover
        open={reactionOpen}
        onClose={() => setReactionOpen(false)}
        anchor={reactionTrigger}
        label="Add a reaction"
        align={isOwn ? "end" : "start"}
      >
        <div className="flex flex-wrap items-center gap-0.5 p-0.5">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React with ${emoji}`}
              onClick={() => {
                onReact?.(message.id, emoji);
                setReactionOpen(false);
              }}
              className="focus-ring-light flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-[var(--app-pane-hover)]"
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
        <div className="mt-0.5 grid grid-cols-8 gap-0.5 border-t border-[var(--app-pane-divider)] p-0.5">
          {MORE_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React with ${emoji}`}
              onClick={() => {
                onReact?.(message.id, emoji);
                setReactionOpen(false);
              }}
              className="focus-ring-light flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-[var(--app-pane-hover)]"
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      </Popover>

      {/* The confirmation is the popover itself: one click on Delete asks, the second acts. */}
      <Popover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={menuTrigger}
        label="Delete this message?"
        align={isOwn ? "end" : "start"}
      >
        <div className="flex flex-col gap-2 p-1.5">
          <p className="font-ui text-[13px] text-[var(--app-pane-text)]">Delete this message?</p>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onDelete?.(message.id);
                setMenuOpen(false);
              }}
              className="focus-ring-light h-8 rounded-lg bg-[var(--app-danger-on-light)] px-2.5 font-ui text-[13px] font-semibold text-[var(--color-parchment-elevated)]"
            >
              Delete
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="focus-ring-light h-8 rounded-lg border border-[var(--app-pane-control-border)] px-2.5 font-ui text-[13px] text-[var(--app-pane-text)]"
            >
              Cancel
            </button>
          </span>
        </div>
      </Popover>
    </div>
  );
}

/**
 * A deleted message: one quiet italic line, no dashed border, no actions, and
 * consecutive deletions are already collapsed into a single tombstone by the list.
 */
export function DeletedBubble({ count, insertedBy }: { count: number; insertedBy?: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      {insertedBy}
      <p className="font-ui text-[13px] italic text-[var(--app-pane-text-soft)]">
        {count > 1 ? `${count} messages deleted` : "Message deleted"}
      </p>
    </div>
  );
}
