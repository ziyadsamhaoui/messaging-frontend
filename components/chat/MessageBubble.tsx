import React from "react";
import { MessageDTO } from "../../lib/types";
import { cn } from "../../lib/utils";

interface MessageBubbleProps {
  message: MessageDTO;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}
    >
      {!isOwn && (
        <div className="mr-2 mt-auto h-7 w-7 flex-shrink-0 rounded-full bg-gradient-to-br from-[var(--color-sage)] to-[var(--color-fern)]" />
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
          isOwn
            ? "rounded-br-sm bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] text-[var(--color-parchment)]"
            : "rounded-bl-sm border border-[rgba(40,84,48,0.2)] bg-gradient-to-br from-[rgba(40,84,48,0.15)] to-[rgba(95,141,78,0.1)] text-[var(--color-forest)]"
        )}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <div className={cn("mt-1 text-[10px]", isOwn ? "text-[rgba(229,217,182,0.6)]" : "text-[rgba(40,84,48,0.4)]")}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

