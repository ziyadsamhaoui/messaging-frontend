"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import {
  AttachmentResponse,
  ChatMessage,
  PendingAttachmentUpload,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDayLabel, isSameDay } from "@/lib/time";
import { Avatar } from "@/components/ui/Avatar";
import { MessageBubble } from "./MessageBubble";
import { Skeleton } from "@/components/ui/Skeleton";

const GROUP_WINDOW_MS = 5 * 60_000;

function toneForSender(senderId: string): number {
  let hash = 0;
  for (let index = 0; index < senderId.length; index += 1) {
    hash = (hash * 31 + senderId.charCodeAt(index)) % 997;
  }
  return hash % 4;
}
const BOTTOM_THRESHOLD_PX = 80;
const TOP_THRESHOLD_PX = 48;

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
  attachments?: Record<string, AttachmentResponse>;
  pendingUploads?: Record<string, PendingAttachmentUpload>;
  onRetryUpload?: (messageId: string) => void;
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

type MessageRow = Extract<Row, { kind: "message" }>;

type DayGroup = { key: string; label: string | null; rows: MessageRow[] };

function groupRowsByDay(rows: Row[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const row of rows) {
    if (row.kind === "separator") {
      groups.push({ key: row.id, label: row.label, rows: [] });
      continue;
    }
    let current = groups[groups.length - 1];
    if (!current) {
      current = { key: `lead-${row.id}`, label: null, rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }
  return groups;
}

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
  attachments,
  pendingUploads,
  onRetryUpload,
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

  useEffect(() => {
    if (!typingLabel) return;
    if (!atBottomRef.current) return;
    const element = containerRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [typingLabel]);

  const [floatingLabel, setFloatingLabel] = useState<string | null>(null);
  const updateFloatingLabel = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;
    let label: string | null = null;
    for (const node of container.querySelectorAll<HTMLElement>("[data-day-separator]")) {
      if (node.getBoundingClientRect().top >= containerTop) break;
      label = node.dataset.daySeparator ?? null;
    }
    setFloatingLabel(label);
  }, []);

  useEffect(() => {
    updateFloatingLabel();
  }, [ordered, updateFloatingLabel]);

  return (
    <div className="relative min-h-0 flex-1">
      {floatingLabel && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center"
        >
          <span className="rounded-full bg-[rgba(40,84,48,0.1)] px-3 py-1 font-ui text-[12px] font-medium text-[var(--app-pane-text-soft)] shadow-sm backdrop-blur-sm">
            {floatingLabel}
          </span>
        </div>
      )}
      <div
        ref={containerRef}
        onScroll={updateFloatingLabel}
        role="log"
        aria-live="polite"
        aria-label="Messages"
        className="app-scroll-light h-full overflow-y-auto px-4 py-4"
      >
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
              {groupRowsByDay(rows).map((group) => (
                <section key={group.key}>
                  {group.label && (
                    <div
                      data-day-separator={group.label}
                      className="my-3 flex justify-center"
                    >
                      <span className="rounded-full bg-[rgba(40,84,48,0.1)] px-3 py-1 font-ui text-[12px] font-medium text-[var(--app-pane-text-soft)]">
                        {group.label}
                      </span>
                    </div>
                  )}
                  {group.rows.map((row) => {
                const message = row.message;
                const isOwn = message.senderId === currentUserId;

                return (
                  <div key={row.id} className="flex items-end gap-1.5">
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
                        isLastOfGroup={row.isLastOfGroup}
                        senderName={message.senderUsername}
                        senderTone={toneForSender(message.senderId)}
                        canDeleteAsOwner={Boolean(roomCreatedBy && roomCreatedBy === currentUserId)}
                        currentUserId={currentUserId}
                        onEdit={isOwn ? onEdit : undefined}
                        onDelete={onDelete}
                        onReact={onReact}
                        onRemoveReaction={onRemoveReaction}
                        attachments={message.attachmentIds
                          .map((attachmentId) => attachments?.[attachmentId])
                          .filter((attachment): attachment is AttachmentResponse =>
                            Boolean(attachment)
                          )}
                        pendingUpload={pendingUploads?.[message.id]}
                        onRetryUpload={onRetryUpload}
                      />
                    </div>
                  </div>
                );
                  })}
                </section>
              ))}

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
