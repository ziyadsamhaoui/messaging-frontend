import type { QueryClient } from "@tanstack/react-query";
import type { ChatMessage, CursorPage } from "./types";
import { messagesQueryKey } from "@/hooks/useMessages";

export interface RoomPreview {
  text: string;
  at: string;
}

function isMessagePage(value: unknown): value is { pages: CursorPage<ChatMessage>[] } {
  if (!value || typeof value !== "object") return false;
  const pages = (value as { pages?: unknown }).pages;
  return Array.isArray(pages);
}

export function readCachedPreview(
  queryClient: QueryClient,
  roomId: string,
  currentUserId: string | null,
  isGroup: boolean
): RoomPreview | null {
  const data = queryClient.getQueryData(messagesQueryKey(roomId));
  if (!isMessagePage(data)) return null;

  let newest: ChatMessage | null = null;
  for (const page of data.pages) {
    for (const message of page.items) {
      if (message.pending || message.failed) continue;
      if (!newest || Date.parse(message.createdAt) > Date.parse(newest.createdAt)) {
        newest = message;
      }
    }
  }
  if (!newest) return null;

  if (newest.isDeleted) return { text: "Message deleted", at: newest.createdAt };
  const content = (newest.content ?? "").trim();
  if (!content) return null;

  const own = newest.senderId === currentUserId;
  if (own) return { text: `You: ${content}`, at: newest.createdAt };
  if (isGroup && newest.senderUsername) {
    return { text: `${newest.senderUsername}: ${content}`, at: newest.createdAt };
  }
  return { text: content, at: newest.createdAt };
}
