"use client";

import React, { useState } from "react";
import { ChatMessage, MessageReactionSummary } from "../../lib/types";
import { cn } from "../../lib/utils";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showSender: boolean;
  canDeleteAsOwner?: boolean;
  currentUserId?: string | null;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string) => void;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  mine: boolean;
}

function groupReactions(
  reactions: MessageReactionSummary[] | undefined,
  currentUserId: string | null | undefined
): ReactionGroup[] {
  if (!reactions || reactions.length === 0) return [];
  const groups = new Map<string, ReactionGroup>();
  reactions.forEach((reaction) => {
    const existing = groups.get(reaction.emoji) ?? {
      emoji: reaction.emoji,
      count: 0,
      mine: false,
    };
    existing.count += 1;
    if (currentUserId && reaction.userId === currentUserId) {
      existing.mine = true;
    }
    groups.set(reaction.emoji, existing);
  });
  return Array.from(groups.values());
}

export function MessageBubble({
  message,
  isOwn,
  showSender,
  canDeleteAsOwner,
  currentUserId,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
}: MessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [pickerOpen, setPickerOpen] = useState(false);
  const canDelete = Boolean(onDelete && (isOwn || canDeleteAsOwner));
  const reactions = groupReactions(message.reactions, currentUserId);
  const attachmentCount = message.attachmentIds?.length ?? 0;

  if (message.isDeleted) {
    return (
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <div className="rounded-2xl border border-dashed border-[rgba(40,84,48,0.3)] px-4 py-2 text-xs italic text-[rgba(40,84,48,0.5)]">
          This message was deleted
        </div>
      </div>
    );
  }

  function saveEdit() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onEdit?.(message.id, trimmed);
    setEditing(false);
  }

  return (
    <div className={cn("group flex", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && (
        <div className="mr-2 mt-auto h-7 w-7 flex-shrink-0 rounded-full bg-gradient-to-br from-[var(--color-sage)] to-[var(--color-fern)]" />
      )}
      <div className={cn("flex max-w-[70%] flex-col", isOwn ? "items-end" : "items-start")}>
        <div
          className={cn(
            "w-full rounded-2xl px-4 py-2 text-sm",
            isOwn
              ? "rounded-br-sm bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] text-[var(--color-parchment)]"
              : "rounded-bl-sm border border-[rgba(40,84,48,0.2)] bg-gradient-to-br from-[rgba(40,84,48,0.15)] to-[rgba(95,141,78,0.1)] text-[var(--color-forest)]"
          )}
        >
          {showSender && !isOwn && message.senderUsername && (
            <div className="mb-1 text-[11px] font-semibold opacity-70">@{message.senderUsername}</div>
          )}

          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={2}
                className="w-full rounded-xl border border-[rgba(229,217,182,0.4)] bg-[rgba(26,58,32,0.35)] px-2 py-1 text-sm text-[var(--color-parchment)] focus:outline-none"
              />
              <div className="flex justify-end gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(false);
                  }}
                  className="opacity-70 hover:opacity-100"
                >
                  Cancel
                </button>
                <button type="button" onClick={saveEdit} className="font-semibold">
                  Save
                </button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          )}

          {attachmentCount > 0 && (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                isOwn
                  ? "border-[rgba(229,217,182,0.35)] text-[rgba(229,217,182,0.85)]"
                  : "border-[rgba(40,84,48,0.25)] text-[rgba(40,84,48,0.7)]"
              )}
            >
              <span aria-hidden="true">📎</span>
              <span>
                {attachmentCount} attachment{attachmentCount > 1 ? "s" : ""}
              </span>
            </div>
          )}

          <div
            className={cn(
              "mt-1 flex items-center gap-2 text-[10px]",
              isOwn ? "text-[rgba(229,217,182,0.6)]" : "text-[rgba(40,84,48,0.4)]"
            )}
          >
            {message.isEdited && <span>edited</span>}
            <span>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {message.pending && <span>sending…</span>}
            {message.failed && <span className="text-red-500">failed</span>}
          </div>
        </div>

        {reactions.length > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1", isOwn ? "justify-end" : "justify-start")}>
            {reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() =>
                  reaction.mine && onRemoveReaction
                    ? onRemoveReaction(message.id)
                    : onReact?.(message.id, reaction.emoji)
                }
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                  reaction.mine
                    ? "border-[var(--color-fern)] bg-[rgba(95,141,78,0.2)] text-[var(--color-forest)]"
                    : "border-[rgba(40,84,48,0.2)] text-[rgba(40,84,48,0.75)]"
                )}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {!message.pending && !message.failed && (
          <div
            className={cn(
              "mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
              pickerOpen && "opacity-100"
            )}
          >
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              className="rounded-full px-2 py-0.5 text-[11px] text-[rgba(40,84,48,0.6)] hover:text-[var(--color-forest)]"
              aria-label="React to message"
            >
              react
            </button>
            {isOwn && onEdit && (
              <button
                type="button"
                onClick={() => {
                  setDraft(message.content);
                  setEditing(true);
                }}
                className="rounded-full px-2 py-0.5 text-[11px] text-[rgba(40,84,48,0.6)] hover:text-[var(--color-forest)]"
              >
                edit
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Delete this message?")) {
                    onDelete?.(message.id);
                  }
                }}
                className="rounded-full px-2 py-0.5 text-[11px] text-[rgba(150,60,50,0.75)] hover:text-red-600"
              >
                delete
              </button>
            )}
          </div>
        )}

        {pickerOpen && (
          <div className="mt-1 flex gap-1 rounded-full border border-[rgba(40,84,48,0.2)] bg-[rgba(229,217,182,0.9)] px-2 py-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact?.(message.id, emoji);
                  setPickerOpen(false);
                }}
                className="rounded-full px-1 text-base transition-transform hover:scale-125"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
