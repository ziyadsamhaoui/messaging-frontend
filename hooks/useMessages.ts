"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useCallback } from "react";
import { listMessages, listParticipants, sendMessage } from "@/lib/services/rooms";
import { socketManager } from "@/lib/socketManager";
import { STOMP_DESTINATIONS } from "@/lib/stompClient";
import { ChatMessage, CursorPage, MessageResponse, MessageType } from "@/lib/types";

export function messagesQueryKey(roomId: string) {
  return ["messages", roomId] as const;
}

export function participantsQueryKey(roomId: string) {
  return ["participants", roomId] as const;
}

export function useMessages(roomId: string | null) {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: roomId ? messagesQueryKey(roomId) : (["messages", "none"] as const),
    enabled: Boolean(roomId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listMessages(roomId as string, pageParam, 30),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
  });

  const appendRealtimeMessage = useCallback(
    (message: MessageResponse) => {
      if (!roomId) return;
      queryClient.setQueryData<InfiniteData<CursorPage<ChatMessage>>>(
        messagesQueryKey(roomId),
        (current) => {
          if (!current) return current;
          const [first, ...rest] = current.pages;
          if (!first) return current;
          if (first.items.some((item) => item.id === message.id)) return current;
          const items = first.items.filter(
            (item) =>
              !(item.pending && item.senderId === message.senderId && item.content === message.content)
          );
          return { ...current, pages: [{ ...first, items: [message, ...items] }, ...rest] };
        }
      );
    },
    [queryClient, roomId]
  );

  return { ...query, appendRealtimeMessage };
}

interface SendMessageVariables {
  content: string;
  type?: MessageType;
}

export function useSendMessage(roomId: string | null, currentUserId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: SendMessageVariables) => {
      if (!roomId) throw new Error("No room selected");
      const type = variables.type ?? "TEXT";
      const published = socketManager.publish(STOMP_DESTINATIONS.sendMessage, {
        roomId,
        type,
        content: variables.content,
      });
      if (published) return null;
      return sendMessage(roomId, { type, content: variables.content });
    },
    onMutate: async (variables) => {
      if (!roomId) return undefined;
      await queryClient.cancelQueries({ queryKey: messagesQueryKey(roomId) });
      const optimistic: ChatMessage = {
        id: `pending-${createId()}`,
        roomId,
        senderId: currentUserId ?? "",
        senderUsername: "",
        type: variables.type ?? "TEXT",
        content: variables.content,
        attachmentIds: [],
        isDeleted: false,
        deletedAt: null,
        isEdited: false,
        editedAt: null,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      queryClient.setQueryData<InfiniteData<CursorPage<ChatMessage>>>(
        messagesQueryKey(roomId),
        (current) => appendToFirstPage(current, optimistic)
      );
      return { optimisticId: optimistic.id };
    },
    onSuccess: (server, _variables, context) => {
      if (!roomId || !context || !server) return;
      queryClient.setQueryData<InfiniteData<CursorPage<ChatMessage>>>(
        messagesQueryKey(roomId),
        (current) => replaceMessage(current, context.optimisticId, server)
      );
    },
    onError: (_error, _variables, context) => {
      if (!roomId || !context) return;
      queryClient.setQueryData<InfiniteData<CursorPage<ChatMessage>>>(
        messagesQueryKey(roomId),
        (current) => markFailed(current, context.optimisticId)
      );
    },
  });
}

export function useRoomParticipants(roomId: string | null) {
  return useQuery({
    queryKey: roomId ? participantsQueryKey(roomId) : (["participants", "none"] as const),
    enabled: Boolean(roomId),
    queryFn: () => listParticipants(roomId as string, null, 50),
  });
}

function appendToFirstPage(
  current: InfiniteData<CursorPage<ChatMessage>> | undefined,
  message: ChatMessage
): InfiniteData<CursorPage<ChatMessage>> | undefined {
  if (!current || current.pages.length === 0) {
    return {
      pageParams: [undefined],
      pages: [{ items: [message], nextCursor: null, hasMore: false }],
    };
  }
  const [first, ...rest] = current.pages;
  return { ...current, pages: [{ ...first, items: [message, ...first.items] }, ...rest] };
}

function replaceMessage(
  current: InfiniteData<CursorPage<ChatMessage>> | undefined,
  optimisticId: string,
  server: MessageResponse
): InfiniteData<CursorPage<ChatMessage>> | undefined {
  if (!current) return current;
  const pages = current.pages.map((page) => {
    const hasOptimistic = page.items.some((item) => item.id === optimisticId);
    if (!hasOptimistic) return page;
    const withoutDuplicate = page.items.filter((item) => item.id !== server.id);
    const items = withoutDuplicate.map((item) => (item.id === optimisticId ? server : item));
    return { ...page, items };
  });
  return { ...current, pages };
}

function markFailed(
  current: InfiniteData<CursorPage<ChatMessage>> | undefined,
  optimisticId: string
): InfiniteData<CursorPage<ChatMessage>> | undefined {
  if (!current) return current;
  const pages = current.pages.map((page) => ({
    ...page,
    items: page.items.map((item) =>
      item.id === optimisticId ? { ...item, pending: false, failed: true } : item
    ),
  }));
  return { ...current, pages };
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
