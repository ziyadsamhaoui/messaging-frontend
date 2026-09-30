import React from "react";
import { ConversationDTO } from "../../lib/types";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../lib/utils";

interface ConversationItemProps {
  conversation: ConversationDTO;
  currentUserId?: number | null;
  active?: boolean;
  onClick: () => void;
}

function formatTimestamp(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs > 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString();
  }
  const hours = String(date.getHours()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${seconds}`;
}

export function ConversationItem({ conversation, currentUserId, active, onClick }: ConversationItemProps) {
  const otherParticipant = conversation.participants.find((p) => p.userId !== currentUserId);
  const title =
    conversation.type === "PRIVATE"
      ? otherParticipant?.displayName || otherParticipant?.username || "Private chat"
      : conversation.name || conversation.participants.map((p) => p.displayName || p.username).join(", ");

  const lastMessage = conversation.lastMessage?.content || "No messages yet";
  const lastMessageTime = formatTimestamp(conversation.lastMessage?.createdAt);
  const subtitle = lastMessageTime ? `${lastMessage} • ${lastMessageTime}` : lastMessage;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3 text-left transition-all duration-200",
        active
          ? "border-l-2 border-[var(--color-fern)] bg-gradient-to-r from-[rgba(229,217,182,0.15)] to-[rgba(164,190,123,0.1)]"
          : "hover:bg-gradient-to-r hover:from-[rgba(229,217,182,0.08)] hover:to-[rgba(164,190,123,0.05)]"
      )}
    >
      <Avatar name={title || "Conversation"} />
      <div className="flex-1">
        <div className="text-sm font-semibold text-[var(--color-parchment)] line-clamp-1">
          {title || "Untitled"}
        </div>
        <div className="text-xs text-[var(--color-text-muted)] line-clamp-1">{subtitle}</div>
      </div>
    </button>
  );
}
