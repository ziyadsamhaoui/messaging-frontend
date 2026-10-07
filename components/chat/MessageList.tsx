"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { ChatMessage } from "../../lib/types";
import { MessageBubble } from "./MessageBubble";
import { Skeleton } from "../ui/Skeleton";

interface MessageListProps {
  roomId: string;
  messages: ChatMessage[];
  currentUserId: string | null;
  roomCreatedById?: string | null;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string) => void;
}

const BOTTOM_THRESHOLD_PX = 80;
const TOP_THRESHOLD_PX = 48;

function orderMessages(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<string>();
  const unique: ChatMessage[] = [];
  for (const message of messages) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    unique.push(message);
  }
  return unique.sort((a, b) => {
    const left = Date.parse(a.createdAt);
    const right = Date.parse(b.createdAt);
    if (Number.isFinite(left) && Number.isFinite(right) && left !== right) {
      return left - right;
    }
    return a.id.localeCompare(b.id);
  });
}

export function MessageList({
  roomId,
  messages,
  currentUserId,
  roomCreatedById,
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
  const pendingPrependRef = useRef<{
    count: number;
    scrollHeight: number;
    scrollTop: number;
  } | null>(null);

  const ordered = useMemo(() => orderMessages(messages), [messages]);

  const countRef = useRef(ordered.length);
  useEffect(() => {
    countRef.current = ordered.length;
  }, [ordered.length]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    function handleScroll() {
      if (!element) return;
      const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
      atBottomRef.current = distanceFromBottom <= BOTTOM_THRESHOLD_PX;
      if (
        element.scrollTop <= TOP_THRESHOLD_PX &&
        hasMore &&
        !loading &&
        !pendingPrependRef.current
      ) {
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

  return (
    <div
      ref={containerRef}
      role="log"
      aria-live="polite"
      className="flex-1 overflow-y-auto px-6 py-4"
    >
      {loading && ordered.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className={index % 2 === 0 ? "h-10 w-[60%]" : "ml-auto h-10 w-[55%]"} />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-[rgba(40,84,48,0.75)]">
          No messages yet. Say hello.
        </div>
      ) : (
        <div className="space-y-3">
          {ordered.map((message, index) => {
            const previous = ordered[index - 1];
            const showSender = !previous || previous.senderId !== message.senderId;
            const isOwn = message.senderId === currentUserId;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
                showSender={showSender}
                currentUserId={currentUserId}
                canDeleteAsOwner={Boolean(roomCreatedById && roomCreatedById === currentUserId)}
                onEdit={isOwn ? onEdit : undefined}
                onDelete={onDelete}
                onReact={onReact}
                onRemoveReaction={onRemoveReaction}
              />
            );
          })}
          {loading && (
            <div className="text-center text-xs text-[rgba(40,84,48,0.75)]">Loading older…</div>
          )}
        </div>
      )}
    </div>
  );
}
