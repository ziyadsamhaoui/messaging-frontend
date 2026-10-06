"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import {
  addReaction,
  deleteMessage,
  editMessage,
  listMessages,
  listParticipants,
  markRoomRead,
  removeReaction,
  sendMessage,
} from "@/lib/services/rooms";
import { getUser } from "@/lib/services/users";
import { socketManager } from "@/lib/socketManager";
import { STOMP_DESTINATIONS } from "@/lib/stompClient";
import {
  ChatMessage,
  CursorPage,
  MessageReactionSummary,
  MessageResponse,
  MessageType,
  ReactionFrame,
  RoomMessageFrame,
} from "@/lib/types";

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

  const resolveUsername = useCallback(
    async (userId: string): Promise<string> => {
      if (!userId) return "";
      const cached = queryClient.getQueryData<{ username?: string }>(["user", userId]);
      if (cached?.username) return cached.username;
      try {
        const user = await queryClient.fetchQuery({
          queryKey: ["user", userId],
          queryFn: () => getUser(userId),
          staleTime: 60_000,
        });
        return user?.username ?? "";
      } catch {
        return "";
      }
    },
    [queryClient]
  );

  const applyRoomMessageFrame = useCallback(
    async (frame: RoomMessageFrame) => {
      if (!roomId || !frame.messageId) return;
      const username = await resolveUsername(frame.senderId);
      queryClient.setQueryData<InfiniteData<CursorPage<ChatMessage>>>(
        messagesQueryKey(roomId),
        (current) => {
          if (!current) return current;
          const [first, ...rest] = current.pages;
          if (!first) return current;
          if (first.items.some((item) => item.id === frame.messageId)) return current;
          const message: ChatMessage = {
            id: frame.messageId,
            roomId,
            senderId: frame.senderId,
            senderUsername: username,
            type: frame.type ?? "TEXT",
            content: frame.content ?? "",
            attachmentIds: [],
            isDeleted: false,
            deletedAt: null,
            isEdited: false,
            editedAt: null,
            createdAt: frame.createdAt ?? new Date().toISOString(),
          };
          const items = first.items.filter(
            (item) =>
              !(item.pending && item.senderId === message.senderId && item.content === message.content)
          );
          return { ...current, pages: [{ ...first, items: [message, ...items] }, ...rest] };
        }
      );
    },
    [roomId, queryClient, resolveUsername]
  );

  const applyReactionFrame = useCallback(
    (frame: ReactionFrame) => {
      if (!roomId || !frame.messageId) return;
      queryClient.setQueryData<InfiniteData<CursorPage<ChatMessage>>>(
        messagesQueryKey(roomId),
        (current) =>
          upsertReaction(current, frame.messageId, {
            userId: frame.reactorId,
            emoji: frame.emoji,
            username: frame.reactorUsername,
          })
      );
    },
    [roomId, queryClient]
  );

  const applyMessageDeleted = useCallback(
    (messageId: string) => {
      if (!roomId || !messageId) return;
      queryClient.setQueryData<InfiniteData<CursorPage<ChatMessage>>>(
        messagesQueryKey(roomId),
        (current) => markMessageDeletedById(current, messageId)
      );
    },
    [roomId, queryClient]
  );

  return { ...query, applyRoomMessageFrame, applyReactionFrame, applyMessageDeleted };
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

export function useEditMessage(roomId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, content }: { messageId: string; content: string }) => {
      if (!roomId) throw new Error("No room selected");
      return editMessage(roomId, messageId, content);
    },
    onSuccess: (updated) => {
      if (!roomId || !updated) return;
      queryClient.setQueryData<InfiniteData<CursorPage<ChatMessage>>>(
        messagesQueryKey(roomId),
        (current) => replaceMessageById(current, updated)
      );
    },
  });
}

export function useDeleteMessage(roomId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => {
      if (!roomId) throw new Error("No room selected");
      return deleteMessage(roomId, messageId);
    },
    onSuccess: (_data, messageId) => {
      if (!roomId) return;
      queryClient.setQueryData<InfiniteData<CursorPage<ChatMessage>>>(
        messagesQueryKey(roomId),
        (current) => markMessageDeletedById(current, messageId)
      );
    },
  });
}

export function useAddReaction(roomId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!roomId) throw new Error("No room selected");
      return addReaction(roomId, messageId, emoji);
    },
    onSuccess: (reaction, variables) => {
      if (!roomId || !reaction) return;
      queryClient.setQueryData<InfiniteData<CursorPage<ChatMessage>>>(
        messagesQueryKey(roomId),
        (current) =>
          upsertReaction(current, variables.messageId, {
            userId: reaction.userId,
            emoji: reaction.emoji,
          })
      );
    },
  });
}

export function useRemoveReaction(roomId: string | null, currentUserId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) => {
      if (!roomId) throw new Error("No room selected");
      return removeReaction(roomId, messageId);
    },
    onSuccess: (_data, messageId) => {
      if (!roomId || !currentUserId) return;
      queryClient.setQueryData<InfiniteData<CursorPage<ChatMessage>>>(
        messagesQueryKey(roomId),
        (current) => removeUserReaction(current, messageId, currentUserId)
      );
    },
  });
}

export function useMarkRoomRead(roomId: string | null) {
  const lastMarkedRef = useRef<string | null>(null);

  return useCallback(
    async (lastReadMessageId: string | null | undefined) => {
      if (!roomId || !lastReadMessageId) return;
      if (lastMarkedRef.current === lastReadMessageId) return;
      lastMarkedRef.current = lastReadMessageId;
      try {
        await markRoomRead(roomId, lastReadMessageId);
      } catch {
        lastMarkedRef.current = null;
      }
    },
    [roomId]
  );
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

function replaceMessageById(
  current: InfiniteData<CursorPage<ChatMessage>> | undefined,
  server: MessageResponse
): InfiniteData<CursorPage<ChatMessage>> | undefined {
  if (!current) return current;
  const pages = current.pages.map((page) => {
    if (!page.items.some((item) => item.id === server.id)) return page;
    return {
      ...page,
      items: page.items.map((item) =>
        item.id === server.id ? { ...server, reactions: item.reactions } : item
      ),
    };
  });
  return { ...current, pages };
}

function markMessageDeletedById(
  current: InfiniteData<CursorPage<ChatMessage>> | undefined,
  messageId: string
): InfiniteData<CursorPage<ChatMessage>> | undefined {
  if (!current) return current;
  const pages = current.pages.map((page) => ({
    ...page,
    items: page.items.map((item) =>
      item.id === messageId ? { ...item, isDeleted: true, deletedAt: new Date().toISOString() } : item
    ),
  }));
  return { ...current, pages };
}

function upsertReaction(
  current: InfiniteData<CursorPage<ChatMessage>> | undefined,
  messageId: string,
  reaction: MessageReactionSummary
): InfiniteData<CursorPage<ChatMessage>> | undefined {
  if (!current) return current;
  const pages = current.pages.map((page) => {
    if (!page.items.some((item) => item.id === messageId)) return page;
    return {
      ...page,
      items: page.items.map((item) => {
        if (item.id !== messageId) return item;
        const others = (item.reactions ?? []).filter((entry) => entry.userId !== reaction.userId);
        return { ...item, reactions: [...others, reaction] };
      }),
    };
  });
  return { ...current, pages };
}

function removeUserReaction(
  current: InfiniteData<CursorPage<ChatMessage>> | undefined,
  messageId: string,
  userId: string
): InfiniteData<CursorPage<ChatMessage>> | undefined {
  if (!current) return current;
  const pages = current.pages.map((page) => {
    if (!page.items.some((item) => item.id === messageId)) return page;
    return {
      ...page,
      items: page.items.map((item) =>
        item.id === messageId
          ? { ...item, reactions: (item.reactions ?? []).filter((entry) => entry.userId !== userId) }
          : item
      ),
    };
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
