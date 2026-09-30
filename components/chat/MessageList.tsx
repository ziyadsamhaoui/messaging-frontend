"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { MessageDTO } from "../../lib/types";
import { MessageBubble } from "./MessageBubble";
import { Skeleton } from "../ui/Skeleton";

interface MessageListProps {
  messages: MessageDTO[];
  currentUserId: number | null;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function MessageList({ messages, currentUserId, loading, hasMore, onLoadMore }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const ordered = useMemo(() => {
    // API returns newest first; display oldest first.
    return [...messages].reverse();
  }, [messages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop === 0 && hasMore && !loading) {
        onLoadMore();
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loading, onLoadMore]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4">
      {loading && messages.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={i % 2 === 0 ? "h-10 w-[60%]" : "ml-auto h-10 w-[55%]"} />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-[rgba(40,84,48,0.4)]">
          No messages yet. Say hello.
        </div>
      ) : (
        <div className="space-y-3">
          {ordered.map((msg) => (
            <MessageBubble key={msg.messageId} message={msg} isOwn={msg.userId === currentUserId} />
          ))}
          {loading && <div className="text-center text-xs text-[rgba(40,84,48,0.4)]">Loading more…</div>}
        </div>
      )}
    </div>
  );
}

