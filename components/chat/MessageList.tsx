"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { ChatMessage } from "../../lib/types";
import { MessageBubble } from "./MessageBubble";
import { Skeleton } from "../ui/Skeleton";

interface MessageListProps {
  messages: ChatMessage[];
  currentUserId: string | null;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function MessageList({
  messages,
  currentUserId,
  loading,
  hasMore,
  onLoadMore,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const ordered = useMemo(() => [...messages].reverse(), [messages]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const onScroll = () => {
      if (element.scrollTop === 0 && hasMore && !loading) {
        onLoadMore();
      }
    };
    element.addEventListener("scroll", onScroll);
    return () => element.removeEventListener("scroll", onScroll);
  }, [hasMore, loading, onLoadMore]);

  return (
    <div
      ref={containerRef}
      role="log"
      aria-live="polite"
      className="flex-1 overflow-y-auto px-6 py-4"
    >
      {loading && messages.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className={index % 2 === 0 ? "h-10 w-[60%]" : "ml-auto h-10 w-[55%]"} />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-[rgba(40,84,48,0.5)]">
          No messages yet. Say hello.
        </div>
      ) : (
        <div className="space-y-3">
          {ordered.map((message, index) => {
            const previous = ordered[index - 1];
            const showSender = !previous || previous.senderId !== message.senderId;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
                showSender={showSender}
              />
            );
          })}
          {loading && <div className="text-center text-xs text-[rgba(40,84,48,0.4)]">Loading older…</div>}
        </div>
      )}
    </div>
  );
}
