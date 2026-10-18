"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Pencil,
  SmilePlus,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  AttachmentResponse,
  ChatMessage,
  MessageReactionSummary,
  PendingAttachmentUpload,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/time";
import { Popover, popoverItemClasses } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";
import { AttachmentPreview } from "./AttachmentPreview";

/*
 * Emoji are user content, not UI icons, so the reaction set is a plain array rather
 * than an icon library import. The quick six cover almost every reaction; the built-in
 * set behind the "+" is deliberately small and local — no emoji picker dependency.
 */
export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
export const MORE_REACTIONS = [
  "🎉", "🔥", "👏", "😍", "🤔", "😅", "😊", "😎", "🥳", "😴",
  "💯", "✅", "❌", "⭐", "🌈", "🌿", "☕", "🎈", "🚀", "💡",
  "📌", "🤝", "🕊️", "😇",
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
    <>
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
    </>
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
  /** Sender name is only shown in group chats, inside the first bubble of a group. */
  showSenderName: boolean;
  /** First bubble of the sender's group: carries the 6 x 8 px tail. */
  isFirstOfGroup: boolean;
  senderName?: string;
  /** A stable per-sender hue index for the name colour, so a name never changes colour. */
  senderTone?: number;
  canDeleteAsOwner?: boolean;
  currentUserId: string | null;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string) => void;
  /** Failed sends can only be retried by the sender; the list owns the retry. */
  onRetry?: (messageId: string) => void;
  attachments?: AttachmentResponse[];
  pendingUpload?: PendingAttachmentUpload;
  onRetryUpload?: (messageId: string) => void;
}

/*
 * Names in a group chat take one of four tones, picked from the sender id so the same
 * person keeps the same colour in every session. All four are measured on the
 * received bubble (#F1E9D2): 7.4:1, 6.9:1, 7.1:1 and 6.3:1.
 */
const NAME_TONES = [
  "text-[#2F6B3A]",
  "text-[#8A5A12]",
  "text-[#1F5A73]",
  "text-[#7A3B6B]",
];

export function MessageBubble({
  message,
  isOwn,
  showSenderName,
  isFirstOfGroup,
  senderName,
  senderTone = 0,
  canDeleteAsOwner,
  currentUserId,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
  onRetry,
  attachments = [],
  pendingUpload,
  onRetryUpload,
}: MessageBubbleProps) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFromMenu, setPickerFromMenu] = useState(false);
  const [moreReactions, setMoreReactions] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [menuTrigger, setMenuTrigger] = useState<HTMLButtonElement | null>(null);
  const [pickerTrigger, setPickerTrigger] = useState<HTMLButtonElement | null>(null);
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped whenever a reaction is added, so the reaction row re-mounts and plays its pop.
  const reactionTotal = message.reactions?.length ?? 0;
  const prevReactionTotal = useRef(reactionTotal);
  const [popKey, setPopKey] = useState(0);
  useEffect(() => {
    if (reactionTotal > prevReactionTotal.current) setPopKey((key) => key + 1);
    prevReactionTotal.current = reactionTotal;
  }, [reactionTotal]);

  const canDelete = Boolean(onDelete && (isOwn || canDeleteAsOwner));
  const canEdit = Boolean(onEdit && isOwn && message.type === "TEXT" && !message.isDeleted);
  const canInteract = !message.isDeleted && !message.failed;
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

  const cancelLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  /*
   * Touch has no hover, so the affordances are revealed by a long press — the same
   * actions, opened as the options menu. `onPointerDown` on the bubble body only.
   */
  function startLongPress(event: React.PointerEvent) {
    if (event.pointerType !== "touch" || !canInteract) return;
    const target = event.currentTarget as HTMLElement;
    cancelLongPress();
    longPressRef.current = setTimeout(() => {
      setMenuOpen(true);
      target.releasePointerCapture?.(event.pointerId);
    }, 450);
  }

  /*
   * The tail belongs to the first bubble of the group, on the sender's side. It is a
   * 6 x 8 px notch in the bubble's own colour, so the bubble's own corner is squared
   * where it meets the notch.
   */
  const tail = isFirstOfGroup && canInteract ? (
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-0",
        isOwn ? "-right-[5px]" : "-left-[5px]"
      )}
      style={{
        width: "var(--app-bubble-tail-w)",
        height: "var(--app-bubble-tail-h)",
        backgroundColor: isOwn ? "var(--app-bubble-out)" : "var(--app-bubble-in)",
        borderColor: isOwn ? "transparent" : "var(--app-bubble-in-border)",
        clipPath: isOwn
          ? "polygon(0 0, 100% 0, 0 100%)"
          : "polygon(0 0, 100% 0, 100% 100%)",
      }}
    />
  ) : null;

  const bubbleClasses = cn(
    "relative w-fit max-w-full font-ui text-[15px] leading-5",
    "py-[var(--app-bubble-py)] px-[var(--app-bubble-px)]",
    isOwn
      ? "bg-[var(--app-bubble-out)] text-[var(--app-bubble-out-text)]"
      : "border border-[var(--app-bubble-in-border)] bg-[var(--app-bubble-in)] text-[var(--app-bubble-in-text)]",
    // Every corner is the same 10 px radius except the one the tail grows from, which
    // is squared so the notch reads as part of the bubble rather than beside it.
    "rounded-[var(--app-bubble-radius)]",
    isFirstOfGroup && isOwn && "rounded-tr-none",
    isFirstOfGroup && !isOwn && "rounded-tl-none"
  );

  /* The time and its mark sit on the last line of the text, at its end. */
  const metaClasses = cn(
    // `float-right` after the text: the stamp is placed on the line the text ends on
    // when there is room for it there, and drops to its own right-aligned line when
    // there is not — so a one-word message stays one line tall.
    "float-right ml-3 mt-[3px] inline-flex translate-y-[2px] items-center gap-1",
    "font-ui text-[11px] leading-none whitespace-nowrap",
    isOwn ? "text-[rgba(229,217,182,0.7)]" : "text-[var(--app-pane-text-soft)]"
  );

  return (
    <div
      className={cn(
        "group/message flex w-full items-end gap-1.5",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
      style={{
        marginTop: isFirstOfGroup
          ? "var(--app-bubble-gap-between-groups)"
          : "var(--app-bubble-gap-in-group)",
      }}
    >
      <div
        className={cn(
          "relative flex min-w-0 flex-col",
          isOwn ? "items-end" : "items-start",
          // The measure: never wider than three quarters of the pane, and never wider
          // than a comfortable line length on a very wide screen.
          "max-w-[min(75%,760px)]",
          reactions.length > 0 && "mb-3"
        )}
      >
        <div className="relative">
          {/*
            The react affordance lives in the gutter on the centre-facing side: to the
            left of an outgoing bubble, to the right of a received one. It is absolute,
            so appearing never moves the bubble or its neighbours.
          */}
          {canInteract && (
            <button
              ref={setPickerTrigger}
              type="button"
              aria-label="React to this message"
              aria-haspopup="dialog"
              aria-expanded={pickerOpen}
              onClick={() => {
                setPickerFromMenu(false);
                setPickerOpen((open) => !open);
                setMoreReactions(false);
              }}
              className={cn(
                "focus-ring-light absolute top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full",
                "border border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)] text-[var(--app-pane-text-soft)]",
                "transition-opacity duration-150 motion-reduce:transition-none",
                "opacity-0 hover:text-[var(--app-pane-text)] group-hover/message:opacity-100 group-focus-within/message:opacity-100",
                "max-md:hidden",
                isOwn ? "right-full mr-1.5" : "left-full ml-1.5"
              )}
            >
              <SmilePlus size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}

          <div
            className={bubbleClasses}
            onPointerDown={startLongPress}
            onPointerUp={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onPointerLeave={cancelLongPress}
          >
            {tail}
            {showSenderName && !isOwn && isFirstOfGroup && (
              <span
                className={cn(
                  "mb-0.5 block font-ui text-[12px] font-semibold",
                  NAME_TONES[senderTone % NAME_TONES.length]
                )}
              >
                {senderName ?? message.senderUsername}
              </span>
            )}

            {editing ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  saveEdit();
                }}
                className="flex w-[min(60ch,100%)] flex-col gap-2 py-0.5"
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
            ) : message.isDeleted ? (
              /*
                A tombstone is still the sender's message: it keeps the bubble, its side
                of the conversation and its time, and only the content is replaced. The
                old plain "Message deleted" line was rendered by the list, outside the
                bubble, so on a receiver's screen it read as a system notice instead of
                as the place where the message used to be.
              */
              <p className="flow-root italic opacity-80">
                Message deleted
                <span className={metaClasses}>{formatClock(message.createdAt)}</span>
              </p>
            ) : (
              <div className="flow-root">
                {(attachments.length > 0 || pendingUpload) && (
                  <div className="mb-1.5 max-w-full">
                    <AttachmentPreview
                      attachments={attachments}
                      pendingUpload={pendingUpload}
                      onRetry={() => onRetryUpload?.(message.id)}
                    />
                  </div>
                )}
                <p className="flow-root whitespace-pre-wrap [overflow-wrap:anywhere]">
                {message.content.trim().length > 0 && <MessageText content={message.content} />}
                <span className={metaClasses}>
                  {message.isEdited && <span>edited</span>}
                  <span>{formatClock(message.createdAt)}</span>
                  {/*
                    One 16 px slot at the end of the time line, in every state, so the
                    chevron can replace the status mark on hover without the bubble
                    changing size.
                  */}
                  {/* The status mark and the options chevron share this slot; on phones the chevron is always visible, so they sit side by side instead of overlapping. */}
                  <span className="flex h-4 min-w-4 shrink-0 items-center justify-end gap-1">
                    {isOwn && !message.failed && (
                      <span
                        className={cn(
                          "flex items-center group-hover/message:hidden group-focus-within/message:hidden",
                          message.pending
                            ? "text-[rgba(229,217,182,0.6)]"
                            : "text-[rgba(229,217,182,0.6)]"
                        )}
                      >
                        {message.pending ? (
                          <Clock size={12} strokeWidth={2} aria-hidden="true" />
                        ) : (
                          <Check size={12} strokeWidth={2} aria-hidden="true" />
                        )}
                        <span className="sr-only">{message.pending ? "Sending" : "Sent"}</span>
                      </span>
                    )}
                    {canInteract && (
                      <button
                        ref={setMenuTrigger}
                        type="button"
                        aria-label="Message options"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuOpen(true);
                        }}
                        className={cn(
                          "focus-ring-light hidden h-4 w-4 items-center justify-center rounded",
                          "group-hover/message:flex group-focus-within/message:flex max-md:flex",
                          isOwn
                            ? "text-[rgba(229,217,182,0.85)]"
                            : "text-[var(--app-pane-text-soft)]"
                        )}
                      >
                        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
                      </button>
                    )}
                  </span>
                </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {message.failed && (
          <p
            role="alert"
            className="mt-1 flex items-center gap-2 font-ui text-[12px] font-medium text-[var(--app-danger-on-light)]"
          >
            <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
            Not sent
            {onRetry && (
              <button
                type="button"
                onClick={() => onRetry(message.id)}
                className="focus-ring-light rounded px-1 underline"
              >
                Retry
              </button>
            )}
          </p>
        )}

        {/* Reactions: one pill per distinct emoji, overlapping the bubble's bottom
            edge by a third of its height, inset 8 px from the bubble's outer corner. */}
        {reactions.length > 0 && (
          <div
            key={popKey}
            data-reaction-pill
            /*
             * The pill overlaps the bubble's bottom edge by a third of its own 22 px
             * height, so it sits 15 px below that edge and keeps 8 px of inset from
             * the bubble's outer-bottom corner.
             */
            className={cn(
              "absolute -bottom-[15px] z-10 flex items-center gap-1",
              popKey > 0 && "animate-reaction-pop",
              isOwn ? "right-2" : "left-2"
            )}
          >
            {reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                aria-pressed={reaction.mine}
                aria-label={`${reaction.emoji} reaction${reaction.count > 1 ? `, ${reaction.count}` : ""}`}
                onClick={() => {
                  if (reaction.mine && onRemoveReaction) onRemoveReaction(message.id);
                  else onReact?.(message.id, reaction.emoji);
                }}
                className={cn(
                  "focus-ring-light flex h-[22px] items-center gap-1 rounded-full border bg-[var(--app-pane-raised)] px-1.5 font-ui text-[12px] leading-none",
                  reaction.mine
                    ? "border-[var(--color-fern)] text-[var(--app-pane-text)]"
                    : "border-[var(--app-pane-control-border)] text-[var(--app-pane-text)]"
                )}
              >
                <span aria-hidden="true">{reaction.emoji}</span>
                {reaction.count > 1 && <span>{reaction.count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The reaction bar, anchored to the smiley, above the bubble. */}
      <Popover
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerFromMenu(false);
          setMoreReactions(false);
        }}
        anchor={pickerFromMenu ? menuTrigger : pickerTrigger}
        label="React to this message"
        align="center"
        side="top"
        className="min-w-0 p-1"
      >
        <div role="group" aria-label="Reactions" className="flex items-center gap-0.5">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              aria-label={`React with ${emoji}`}
              onClick={() => {
                onReact?.(message.id, emoji);
                setPickerOpen(false);
              }}
              className="focus-ring-light flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-transform duration-150 hover:scale-110 motion-reduce:transition-none motion-reduce:hover:scale-100"
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
          <button
            type="button"
            aria-label="More reactions"
            aria-expanded={moreReactions}
            onClick={() => setMoreReactions((value) => !value)}
            className="focus-ring-light flex h-8 w-8 items-center justify-center rounded-lg font-ui text-[16px] font-semibold text-[var(--app-pane-text-soft)]"
          >
            +
          </button>
        </div>
        {moreReactions && (
          <div className="mt-0.5 grid grid-cols-8 gap-0.5 border-t border-[var(--app-pane-divider)] pt-0.5">
            {MORE_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`React with ${emoji}`}
                onClick={() => {
                  onReact?.(message.id, emoji);
                  setPickerOpen(false);
                }}
                className="focus-ring-light flex h-8 w-8 items-center justify-center rounded-lg text-base"
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            ))}
          </div>
        )}
      </Popover>

      <Popover
        open={menuOpen}
        onClose={() => {
          setMenuOpen(false);
          setConfirmingDelete(false);
        }}
        anchor={menuTrigger}
        label="Message options"
        role="menu"
        align={isOwn ? "end" : "start"}
        side="bottom"
        className="min-w-44"
      >
        <MenuKeyboardNav>
          {confirmingDelete ? (
            <div className="flex flex-col gap-2 p-1.5" role="none">
              <p className="font-ui text-[13px] text-[var(--app-pane-text)]">
                Delete this message?
              </p>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDelete?.(message.id);
                    setConfirmingDelete(false);
                    setMenuOpen(false);
                  }}
                  className="focus-ring-light h-8 rounded-lg bg-[var(--app-danger-on-light)] px-2.5 font-ui text-[13px] font-semibold text-[var(--color-parchment-elevated)]"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="focus-ring-light h-8 rounded-lg border border-[var(--app-pane-control-border)] px-2.5 font-ui text-[13px] text-[var(--app-pane-text)]"
                >
                  Cancel
                </button>
              </span>
            </div>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                className={cn(popoverItemClasses(), "md:hidden")}
                onClick={() => {
                  setPickerFromMenu(true);
                  setMenuOpen(false);
                  setMoreReactions(false);
                  setPickerOpen(true);
                }}
              >
                <SmilePlus size={16} strokeWidth={1.75} aria-hidden="true" />
                React
              </button>
              <button
                type="button"
                role="menuitem"
                className={popoverItemClasses()}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(message.content);
                    toast.push("Message copied.", "success");
                  } catch {
                    toast.push("Could not copy the message.", "error");
                  }
                  setMenuOpen(false);
                }}
              >
                <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
                Copy
              </button>
              {canEdit && (
                <button
                  type="button"
                  role="menuitem"
                  className={popoverItemClasses()}
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                >
                  <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  role="menuitem"
                  className={popoverItemClasses({ danger: true })}
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                  Delete
                </button>
              )}
            </>
          )}
        </MenuKeyboardNav>
      </Popover>
    </div>
  );
}

/**
 * Arrow-key navigation for a popover that holds `role="menuitem"` children: Arrow
 * keys move, Home and End jump to the ends, Escape is handled by the Popover itself.
 * Focus is held on the menu items, so the ring is always on the item that would run.
 */
function MenuKeyboardNav({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  /*
   * The first item takes focus when the menu opens. Without this the popover holds
   * focus on its own container and the arrow keys below never reach the menu, which
   * is exactly how a menu that "works with the mouse" fails a keyboard user.
   */
  useEffect(() => {
    const first = ref.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus({ preventScroll: true });
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')
    ).filter((item) => item.offsetParent !== null);
    if (items.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const index = items.indexOf(active as HTMLElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[index < 0 ? 0 : (index + 1) % items.length].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[index <= 0 ? items.length - 1 : index - 1].focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0].focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1].focus();
    }
  }

  return (
    <div ref={ref} role="none" onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}
