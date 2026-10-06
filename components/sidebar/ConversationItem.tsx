import React from "react";
import { RoomResponse } from "../../lib/types";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../lib/utils";

interface ConversationItemProps {
  room: RoomResponse;
  title: string;
  subtitle?: string;
  active?: boolean;
  unreadCount?: number;
  onClick: () => void;
}

export function ConversationItem({
  room,
  title,
  subtitle,
  active,
  unreadCount,
  onClick,
}: ConversationItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-200",
        active
          ? "border-l-2 border-[var(--color-fern)] bg-gradient-to-r from-[rgba(229,217,182,0.15)] to-[rgba(164,190,123,0.1)]"
          : "hover:bg-gradient-to-r hover:from-[rgba(229,217,182,0.08)] hover:to-[rgba(164,190,123,0.05)]"
      )}
    >
      <Avatar name={title || "Conversation"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold text-[var(--color-parchment)]">{title}</div>
          {typeof unreadCount === "number" && unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-fern)] px-1 text-[10px] font-bold text-[var(--color-parchment)]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <div className="truncate text-xs text-[var(--color-text-muted)]">
          {subtitle ?? (room.type === "GROUP" ? "Group chat" : "Direct message")}
        </div>
      </div>
    </button>
  );
}
