"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDayLabel, isSameDay } from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";
import { MessageBubble } from "./MessageBubble";
import { Skeleton } from "@/components/ui/Skeleton";

const GROUP_WINDOW_MS = 5 * 60_000;

/**
 * A stable tone index for a sender's name in a group chat: the same person keeps the
 * same colour across reloads and sessions, because it is derived from the id rather
 * than from the order people happen to appear in.
 */
function toneForSender(senderId: string): number {
  let hash = 0;
  for (let index = 0; index < senderId.length; index += 1) {
    hash = (hash * 31 + senderId.charCodeAt(index)) % 997;
  }
  return hash % 4;
}
const BOTTOM_THRESHOLD_PX = 80;
const TOP_THRESHOLD_PX = 48;

/** One rendered row: a message or a day boundary. */
type Row =
  | { kind: "separator"; id: string; label: string }
  | { kind: "message"; id: string; message: ChatMessage; showSenderName: boolean; isFirstOfGroup: boolean; isLastOfGroup: boolean };

interface MessageListProps {
  roomId: string;
  messages: ChatMessage[];
  currentUserId: string | null;
  roomCreatedById?: string | null;
  isGroupRoom?: boolean;
  typingLabel?: string | null;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string) => void;
}

function orderMessages(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const unique: ChatMessage[] = [];
  for (const message of messages) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    unique.push(message);
  }
  return unique.sort((left, right) => {
    const a = Date.parse(left.createdAt);
    const b = Date.parse(right.createdAt);
    if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a - b;
    return left.id.localeCompare(right.id);
  });
}

/**
 * Turns the flat history into rows: day separators, sender groups and collapsed
 * tombstones.
 *
 * Grouping rules, applied in one pass so the list renders from a stable model rather
 * than from conditions spread through JSX:
 *  - consecutive messages from the same sender within five minutes form a group;
 *  - a new day starts a new group and inserts a separator;
 *  - a deleted message is its own group, so its bubble stands alone.
 *
 * Deleted messages are not a special row. They go through the bubble like any other
 * message, which is what keeps the tombstone on the sender's side of the conversation,
 * in the sender's bubble colour, with its own timestamp — the plain left-aligned
 * paragraph this replaces read as a system notice rather than as the message it was.
 */
function buildRows(messages: ChatMessage[]): Row[] {
  const rows: Row[] = [];

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];

    if (message.isDeleted) {
      const previousDeleted = messages[index - 1];
      if (!previousDeleted || !isSameDay(previousDeleted.createdAt, message.createdAt)) {
        rows.push({
          kind: "separator",
          id: `sep-${message.id}`,
          label: formatDayLabel(message.createdAt),
        });
      }
      rows.push({
        kind: "message",
        id: message.id,
        message,
        showSenderName: true,
        isFirstOfGroup: true,
        isLastOfGroup: true,
      });
      continue;
    }

    const previous = messages[index - 1];
    const next = messages[index + 1];
    const continuesPreviousGroup =
      Boolean(previous) &&
      !previous.isDeleted &&
      previous.senderId === message.senderId &&
      Math.abs(Date.parse(message.createdAt) - Date.parse(previous.createdAt)) <= GROUP_WINDOW_MS &&
      isSameDay(previous.createdAt, message.createdAt);
    const continuesNextGroup =
      Boolean(next) &&
      !next.isDeleted &&
      next.senderId === message.senderId &&
      Math.abs(Date.parse(next.createdAt) - Date.parse(message.createdAt)) <= GROUP_WINDOW_MS &&
      isSameDay(next.createdAt, message.createdAt);

    if (!previous || !isSameDay(previous.createdAt, message.createdAt)) {
      rows.push({
        kind: "separator",
        id: `sep-${message.id}`,
        label: formatDayLabel(message.createdAt),
      });
    }

    rows.push({
      kind: "message",
      id: message.id,
      message,
      showSenderName: !continuesPreviousGroup,
      isFirstOfGroup: !continuesPreviousGroup,
      isLastOfGroup: !continuesNextGroup,
    });
  }

  return rows;
}

/**
 * Zone three's message column.
 *
 * A single centred column (max 820 px) so messages never hug the edges of a wide
 * pane, day separators that stick to the top while their day is on screen, and the
 * three scroll behaviours that matter: open at the newest message, stay pinned when
 * the reader is already at the bottom, and show a "new messages" control when they
 * are not. Prepending older history keeps its position (the existing anchor logic).
 */
export function MessageList({
  roomId,
  messages,
  currentUserId,
  roomCreatedById,
  isGroupRoom,
  typingLabel,
  loading,
  hasMore,
  onLoadMore,
  onEdit,
  onDelete,
  onReact,
  onRemoveReaction,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousRoomRef = useRef<string | null>(null);
  const previousCountRef = useRef(0);
  const atBottomRef = useRef(true);
  const forceBottomRef = useRef(true);
  const pendingPrependRef = useRef<{ count: number; scrollHeight: number; scrollTop: number } | null>(null);
  const [showLatest, setShowLatest] = useState(false);

  const ordered = useMemo(() => orderMessages(messages), [messages]);
  const rows = useMemo(() => buildRows(ordered), [ordered]);
  const countRef = useRef(ordered.length);
  const roomCreatedBy = roomCreatedById ?? null;

  useEffect(() => {
    countRef.current = ordered.length;
  }, [ordered.length]);

  const scrollToBottom = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
    atBottomRef.current = true;
    setShowLatest(false);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    function handleScroll() {
      if (!element) return;
      const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
      const atBottom = distanceFromBottom <= BOTTOM_THRESHOLD_PX;
      atBottomRef.current = atBottom;
      setShowLatest(!atBottom);
      if (element.scrollTop <= TOP_THRESHOLD_PX && hasMore && !loading && !pendingPrependRef.current) {
        pendingPrependRef.current = {
          count: countRef.current,
          scrollHeight: element.scrollHeight,
          scrollTop: element.scrollTop,
        };
        onLoadMore();
      }
    }

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, [hasMore, loading, onLoadMore]);

  useEffect(() => {
    const element = containerRef.current;
    const roomChanged = previousRoomRef.current !== roomId;
    const pending = pendingPrependRef.current;

    if (roomChanged) {
      previousRoomRef.current = roomId;
      previousCountRef.current = ordered.length;
      pendingPrependRef.current = null;
      atBottomRef.current = true;
      forceBottomRef.current = true;
      setShowLatest(false);
      if (element) element.scrollTop = element.scrollHeight;
      return;
    }

    if (pending) {
      if (ordered.length > pending.count && element) {
        element.scrollTop = element.scrollHeight - pending.scrollHeight + pending.scrollTop;
        pendingPrependRef.current = null;
        previousCountRef.current = ordered.length;
        forceBottomRef.current = false;
        return;
      }
      if (!loading) pendingPrependRef.current = null;
    }

    if (ordered.length > previousCountRef.current && element) {
      if (atBottomRef.current || forceBottomRef.current) {
        element.scrollTop = element.scrollHeight;
        forceBottomRef.current = false;
      }
    }
    previousCountRef.current = ordered.length;
  }, [ordered.length, roomId, loading]);

  // The typing bubble is part of "the bottom", so it keeps the column pinned too.
  useEffect(() => {
    if (!typingLabel) return;
    if (!atBottomRef.current) return;
    const element = containerRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [typingLabel]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        role="log"
        aria-live="polite"
        aria-label="Messages"
        /*
         * Equal side padding, and the same value at every width: the list spans the
         * pane and both sides start 16 px in. The asymmetry this replaces came from
         * the message action column, which reserved 40 px on the outgoing side only.
         */
        className="app-scroll-light h-full overflow-y-auto px-4 py-4"
      >
        {/*
          The column uses the whole pane. It used to be a centred 820 px strip, which
          on a wide screen left the conversation floating in the middle of two empty
          margins and made the bubbles harder to associate with the pane they belong
          to. Line length is still bounded — by the bubble's own measure — so this is
          width without unreadable paragraphs.
        */}
        <div className="flex w-full flex-col">
          {loading && ordered.length === 0 ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className={cn("h-10 rounded-2xl", index % 2 === 0 ? "w-[60%]" : "ml-auto w-[55%]")}
                />
              ))}
            </div>
          ) : ordered.length === 0 ? (
            <p className="py-16 text-center font-ui text-[15px] text-[var(--app-pane-text-soft)]">
              No messages yet. Say hello.
            </p>
          ) : (
            <>
              {rows.map((row) => {
                if (row.kind === "separator") {
                  return (
                    <div key={row.id} className="sticky top-0 z-10 flex justify-center py-2">
                      <span className="rounded-full bg-[rgba(40,84,48,0.1)] px-3 py-1 font-ui text-[12px] font-medium text-[var(--app-pane-text-soft)]">
                        {row.label}
                      </span>
                    </div>
                  );
                }

                const message = row.message;
                const isOwn = message.senderId === currentUserId;

                return (
                  <div key={row.id} className="flex items-end gap-1.5">
                    {/*
                      A group chat shows the sender's avatar once per group, aligned to
                      the group's last bubble. It reserves its 28 px in every row of the
                      group so the bubbles above and below stay in one column.
                    */}
                    {isGroupRoom && !isOwn && (
                      <span
                        className={cn("w-7 shrink-0", !row.isLastOfGroup && "invisible")}
                        aria-hidden={!row.isLastOfGroup}
                      >
                        <Avatar
                          name={message.senderUsername || "?"}
                          seed={message.senderId}
                          size={28}
                          presenceRing="var(--app-pane)"
                        />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <MessageBubble
                        message={message}
                        isOwn={isOwn}
                        showSenderName={row.showSenderName && Boolean(isGroupRoom) && !isOwn}
                        isFirstOfGroup={row.isFirstOfGroup}
                        senderName={message.senderUsername}
                        senderTone={toneForSender(message.senderId)}
                        canDeleteAsOwner={Boolean(roomCreatedBy && roomCreatedBy === currentUserId)}
                        currentUserId={currentUserId}
                        onEdit={isOwn ? onEdit : undefined}
                        onDelete={onDelete}
                        onReact={onReact}
                        onRemoveReaction={onRemoveReaction}
                      />
                    </div>
                  </div>
                );
              })}

              {typingLabel && (
                <div className="mt-3 flex items-center gap-2" aria-live="polite">
                  <span className="flex items-center gap-1 rounded-2xl border border-[var(--app-bubble-in-border)] bg-[var(--app-bubble-in)] px-3 py-2">
                    <span className="sr-only">{typingLabel} is typing</span>
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-[var(--app-pane-text-soft)] motion-safe:animate-bounce"
                        style={{ animationDelay: `${dot * 120}ms` }}
                      />
                    ))}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showLatest && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="focus-ring-light absolute bottom-4 left-1/2 flex h-10 -translate-x-1/2 items-center gap-2 rounded-full border border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)] px-4 font-ui text-[13px] font-medium text-[var(--app-pane-text)] shadow-[0_10px_24px_-12px_rgba(4,16,8,0.6)]"
        >
          <ArrowDown size={16} strokeWidth={1.75} aria-hidden="true" />
          Latest messages
        </button>
      )}

      {loading && ordered.length > 0 && (
        <p className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-[rgba(40,84,48,0.1)] px-3 py-1 font-ui text-[12px] text-[var(--app-pane-text-soft)]">
          Loading older messages…
        </p>
      )}
    </div>
  );
}
