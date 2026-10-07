"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { roomsQueryKey, useRooms } from "@/hooks/useRooms";
import {
  messagesQueryKey,
  participantsQueryKey,
  useAddReaction,
  useDeleteMessage,
  useEditMessage,
  useMarkRoomRead,
  useMessages,
  useRemoveReaction,
  useRoomParticipants,
  useSendMessage,
} from "@/hooks/useMessages";
import { useUser } from "@/hooks/useUser";
import { useBlockedUserIds, useBlockUser, useUnblockUser } from "@/hooks/useBlocks";
import { usePendingConnections } from "@/hooks/useConnections";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useSocket } from "@/hooks/useSocket";
import { useUiStore } from "@/store/uiStore";
import { flattenPages } from "@/lib/pagination";
import { errorMessage, isApiError } from "@/lib/errors";
import { STOMP_DESTINATIONS } from "@/lib/stompClient";
import { classifyRoomFrame } from "@/lib/realtimeFrames";
import { derivePresence, formatLastSeen, presenceLabel } from "@/lib/presence";
import { registerServiceWorker } from "@/lib/push";
import { createRoom, removeParticipant } from "@/lib/services/rooms";
import { getUser, updateUser } from "@/lib/services/users";
import {
  ChatMessage,
  ConnectionAcceptedFrame,
  CreateRoomRequest,
  CursorPage,
  InvitationAcceptedFrame,
  InvitationSentFrame,
  RoomResponse,
  TypingEvent,
} from "@/lib/types";
import { AppShell } from "@/components/layout/AppShell";
import { ConversationItem } from "@/components/sidebar/ConversationItem";
import { NewConversationModal } from "@/components/sidebar/NewConversationModal";
import { BlockedUsersModal } from "@/components/sidebar/BlockedUsersModal";
import { ConnectionsModal } from "@/components/sidebar/ConnectionsModal";
import { InvitationsModal } from "@/components/sidebar/InvitationsModal";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { ParticipantsDrawer } from "@/components/chat/ParticipantsDrawer";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";

interface ActiveTyping {
  userId: string;
  label: string;
}

function roomTitle(room: RoomResponse): string {
  if (room.name) return room.name;
  return room.type === "GROUP" ? "Group" : "Direct message";
}

export default function MessagingApp() {
  const auth = useAuth();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const selectedRoomId = useUiStore((state) => state.selectedRoomId);
  const selectRoom = useUiStore((state) => state.selectRoom);
  const drafts = useUiStore((state) => state.drafts);
  const setDraft = useUiStore((state) => state.setDraft);
  const clearDraft = useUiStore((state) => state.clearDraft);
  const roomActivity = useUiStore((state) => state.roomActivity);
  const noteRoomActivity = useUiStore((state) => state.noteRoomActivity);
  const socketState = useUiStore((state) => state.socketState);
  const setSocketState = useUiStore((state) => state.setSocketState);
  const pendingInvitations = useUiStore((state) => state.pendingInvitations);
  const addInvitation = useUiStore((state) => state.addInvitation);
  const blockedRooms = useUiStore((state) => state.blockedRooms);
  const markBlockedRoom = useUiStore((state) => state.markBlockedRoom);

  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, ActiveTyping>>({});
  const [settingsUsername, setSettingsUsername] = useState("");
  const [settingsAvatarUrl, setSettingsAvatarUrl] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);

  const lastTypingRef = useRef(0);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const userLabelsRef = useRef<Record<string, string>>({});

  const currentUserId = auth.session?.userId ?? null;
  const authenticated = auth.status === "authenticated";

  const roomsQuery = useRooms();
  const rooms = useMemo(() => {
    const items = flattenPages(roomsQuery.data?.pages);
    return [...items].sort((a, b) => {
      const left = roomActivity[a.id] ?? a.createdAt;
      const right = roomActivity[b.id] ?? b.createdAt;
      return new Date(right).getTime() - new Date(left).getTime();
    });
  }, [roomsQuery.data, roomActivity]);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? null;

  const messagesQuery = useMessages(selectedRoomId);
  const messages = useMemo(
    () => flattenPages(messagesQuery.data?.pages) as ChatMessage[],
    [messagesQuery.data]
  );
  const applyRoomMessageFrame = messagesQuery.applyRoomMessageFrame;
  const applyReactionFrame = messagesQuery.applyReactionFrame;
  const applyMessageDeleted = messagesQuery.applyMessageDeleted;

  const participantsQuery = useRoomParticipants(selectedRoomId);
  const participants = useMemo(
    () => participantsQuery.data?.items ?? [],
    [participantsQuery.data]
  );
  const otherParticipant = participants.find((participant) => participant.userId !== currentUserId);
  const myParticipant = participants.find((participant) => participant.userId === currentUserId);
  const otherUserQuery = useUser(selectedRoom?.type === "DIRECT" ? otherParticipant?.userId : null);

  const blockedIdsQuery = useBlockedUserIds(authenticated ? currentUserId : null);
  const blockedIds = useMemo(() => new Set(blockedIdsQuery.data ?? []), [blockedIdsQuery.data]);
  const pendingConnectionsQuery = usePendingConnections(authenticated);

  const sendMutation = useSendMessage(selectedRoomId, currentUserId);
  const editMutation = useEditMessage(selectedRoomId);
  const deleteMutation = useDeleteMessage(selectedRoomId);
  const addReactionMutation = useAddReaction(selectedRoomId);
  const removeReactionMutation = useRemoveReaction(selectedRoomId, currentUserId);
  const markRoomRead = useMarkRoomRead(selectedRoomId);
  const blockMutation = useBlockUser(currentUserId);
  const unblockMutation = useUnblockUser(currentUserId);
  const unread = useUnreadCount(authenticated);

  const markRoomServerError = useCallback(
    (error: Parameters<typeof errorMessage>[0]) => {
      toast.push(errorMessage(error), "error");
      if (!selectedRoomId) return;
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey(selectedRoomId) });
      if (isApiError(error) && error.isBlocked) {
        markBlockedRoom(selectedRoomId, true);
      }
    },
    [toast, selectedRoomId, queryClient, markBlockedRoom]
  );

  const { subscribe, publish } = useSocket({
    token: auth.session?.accessToken ?? null,
    onServerError: markRoomServerError,
  });

  useEffect(() => {
    setSocketState(socketState);
  }, [socketState, setSocketState]);

  useEffect(() => {
    if (auth.status === "unauthenticated") {
      router.replace("/login");
    }
  }, [auth.status, router]);

  useEffect(() => {
    if (!authenticated) return;
    void registerServiceWorker();
  }, [authenticated]);

  const resolveUserLabel = useCallback(
    async (userId: string): Promise<string> => {
      if (userLabelsRef.current[userId]) return userLabelsRef.current[userId];
      try {
        const user = await queryClient.fetchQuery({
          queryKey: ["user", userId],
          queryFn: () => getUser(userId),
          staleTime: 60_000,
        });
        const label = user?.username ?? "Someone";
        userLabelsRef.current[userId] = label;
        return label;
      } catch {
        return "Someone";
      }
    },
    [queryClient]
  );

  useEffect(() => {
    if (!currentUserId) return;

    const unsubscribeUserEvents = subscribe(
      STOMP_DESTINATIONS.userEvents(currentUserId),
      (message) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(message.body);
        } catch {
          return;
        }
        const frame = parsed as Record<string, unknown>;
        const eventType = typeof frame.eventType === "string" ? frame.eventType : null;
        if (eventType === "INVITATION_SENT") {
          const invitation = frame as unknown as InvitationSentFrame;
          addInvitation({
            invitationId: invitation.invitationId,
            roomId: invitation.roomId ?? null,
            roomName: invitation.roomName ?? null,
            inviterUsername: invitation.inviterUsername ?? null,
            sentAt: invitation.sentAt ?? new Date().toISOString(),
          });
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          toast.push("You received a room invitation.", "info");
        } else if (eventType === "INVITATION_ACCEPTED") {
          const accepted = frame as unknown as InvitationAcceptedFrame;
          toast.push(
            `${accepted.invitedUsername ?? "Someone"} accepted your invitation.`,
            "success"
          );
        } else if (eventType === "USER_CONNECTION_ACCEPTED") {
          const connection = frame as unknown as ConnectionAcceptedFrame;
          const otherName =
            connection.userIdA === currentUserId
              ? connection.userBUsername
              : connection.userAUsername;
          toast.push(`${otherName ?? "Someone"} accepted your connection request.`, "success");
          void queryClient.invalidateQueries({ queryKey: ["connections"] });
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      }
    );

    return () => {
      unsubscribeUserEvents();
    };
  }, [currentUserId, subscribe, queryClient, addInvitation, toast]);

  useEffect(() => {
    if (!selectedRoomId) return;

    const unsubscribeMessages = subscribe(
      STOMP_DESTINATIONS.roomMessages(selectedRoomId),
      (message) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(message.body);
        } catch {
          return;
        }
        const classified = classifyRoomFrame(parsed);
        if (!classified) return;
        if (classified.kind === "message") {
          void applyRoomMessageFrame(classified.frame);
          noteRoomActivity(
            selectedRoomId,
            classified.frame.createdAt ?? new Date().toISOString()
          );
        } else if (classified.kind === "reaction") {
          applyReactionFrame(classified.frame);
        } else if (classified.kind === "deleted") {
          applyMessageDeleted(classified.frame.messageId);
        } else if (classified.kind === "participant") {
          void queryClient.invalidateQueries({
            queryKey: participantsQueryKey(selectedRoomId),
          });
          void queryClient.invalidateQueries({ queryKey: roomsQueryKey });
        }
      }
    );

    const unsubscribeTyping = subscribe(
      STOMP_DESTINATIONS.roomTyping(selectedRoomId),
      (message) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(message.body);
        } catch {
          return;
        }
        const event = parsed as Partial<TypingEvent>;
        if (!event.senderId || event.senderId === currentUserId) return;
        const senderId = event.senderId;
        void resolveUserLabel(senderId).then((label) => {
          setTypingUsers((prev) => ({ ...prev, [selectedRoomId]: { userId: senderId, label } }));
          clearTimeout(typingTimersRef.current[selectedRoomId]);
          typingTimersRef.current[selectedRoomId] = setTimeout(() => {
            setTypingUsers((prev) => {
              const next = { ...prev };
              delete next[selectedRoomId];
              return next;
            });
          }, 3000);
        });
      }
    );

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [
    selectedRoomId,
    subscribe,
    applyRoomMessageFrame,
    applyReactionFrame,
    applyMessageDeleted,
    noteRoomActivity,
    currentUserId,
    queryClient,
    resolveUserLabel,
  ]);

  useEffect(() => {
    const timers = typingTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    const newest = messages.find((message) => !message.pending && !message.failed);
    if (!newest) return;
    void markRoomRead(newest.id);
  }, [messages, selectedRoomId, markRoomRead]);

  const filteredRooms = useMemo(() => {
    if (!query.trim()) return rooms;
    const needle = query.toLowerCase();
    return rooms.filter((room) => roomTitle(room).toLowerCase().includes(needle));
  }, [rooms, query]);

  const draft = selectedRoomId ? drafts[selectedRoomId] ?? "" : "";
  const derivedBlocked =
    selectedRoom?.type === "DIRECT" && otherParticipant
      ? blockedIds.has(otherParticipant.userId)
      : false;
  const learnedBlocked = selectedRoomId ? Boolean(blockedRooms[selectedRoomId]) : false;
  const isBlocked = derivedBlocked || learnedBlocked;
  const isMuted = Boolean(myParticipant?.isMuted);

  const selectedTitle = selectedRoom
    ? selectedRoom.type === "DIRECT"
      ? otherUserQuery.data?.username ?? "Direct message"
      : roomTitle(selectedRoom)
    : "";
  const otherPresence = derivePresence(otherUserQuery.data?.lastSeen);
  const activeTyping = selectedRoomId ? typingUsers[selectedRoomId] : undefined;

  const headerSubtitle = activeTyping
    ? `${activeTyping.label} is typing…`
    : selectedRoom?.type === "DIRECT"
      ? otherUserQuery.data?.lastSeen
        ? `${presenceLabel(otherPresence)} · ${formatLastSeen(otherUserQuery.data.lastSeen)}`
        : presenceLabel(otherPresence)
      : `${participants.length} member${participants.length === 1 ? "" : "s"}`;

  const handleSend = useCallback(
    async (content: string) => {
      if (!selectedRoomId) return;
      try {
        await sendMutation.mutateAsync({ content });
        clearDraft(selectedRoomId);
        noteRoomActivity(selectedRoomId, new Date().toISOString());
      } catch (error) {
        markRoomServerError(error);
      }
    },
    [selectedRoomId, sendMutation, clearDraft, noteRoomActivity, markRoomServerError]
  );

  const handleTyping = useCallback(() => {
    if (!selectedRoomId) return;
    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;
    publish(STOMP_DESTINATIONS.typing, { roomId: selectedRoomId });
  }, [selectedRoomId, publish]);

  const handleCreateRoom = useCallback(
    async (body: CreateRoomRequest) => {
      const room = await createRoom(body);
      queryClient.setQueryData<InfiniteData<CursorPage<RoomResponse>>>(
        roomsQueryKey,
        (current) => {
          if (!current || current.pages.length === 0) {
            return {
              pageParams: [undefined],
              pages: [{ items: [room], nextCursor: null, hasMore: false }],
            };
          }
          const [first, ...rest] = current.pages;
          if (first.items.some((item) => item.id === room.id)) return current;
          return { ...current, pages: [{ ...first, items: [room, ...first.items] }, ...rest] };
        }
      );
      selectRoom(room.id);
      noteRoomActivity(room.id, room.createdAt);
    },
    [queryClient, selectRoom, noteRoomActivity]
  );

  const handleOpenSettings = useCallback(() => {
    setSettingsUsername(auth.user?.username ?? "");
    setSettingsAvatarUrl(auth.user?.profilePictureUrl ?? "");
    setSettingsDescription(auth.user?.description ?? "");
    setSettingsOpen(true);
  }, [auth.user]);

  const handleSaveProfile = useCallback(async () => {
    if (!currentUserId) return;
    setSettingsSaving(true);
    try {
      await updateUser(currentUserId, {
        username: settingsUsername.trim(),
        profilePictureUrl: settingsAvatarUrl.trim() || null,
        description: settingsDescription.trim() || null,
      });
      await auth.refreshUser();
      toast.push("Profile updated.", "success");
      setSettingsOpen(false);
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setSettingsSaving(false);
    }
  }, [currentUserId, settingsUsername, settingsAvatarUrl, settingsDescription, auth, toast]);

  const handleLeaveRoom = useCallback(async () => {
    if (!selectedRoomId || !currentUserId) return;
    try {
      await removeParticipant(selectedRoomId, currentUserId);
      selectRoom(null);
      await queryClient.invalidateQueries({ queryKey: roomsQueryKey });
      toast.push("Left conversation.", "success");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }, [selectedRoomId, currentUserId, selectRoom, queryClient, toast]);

  const handleEditMessage = useCallback(
    async (messageId: string, content: string) => {
      try {
        await editMutation.mutateAsync({ messageId, content });
      } catch (error) {
        toast.push(errorMessage(error), "error");
      }
    },
    [editMutation, toast]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await deleteMutation.mutateAsync(messageId);
      } catch (error) {
        toast.push(errorMessage(error), "error");
      }
    },
    [deleteMutation, toast]
  );

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await addReactionMutation.mutateAsync({ messageId, emoji });
      } catch (error) {
        toast.push(errorMessage(error), "error");
      }
    },
    [addReactionMutation, toast]
  );

  const handleRemoveReaction = useCallback(
    async (messageId: string) => {
      try {
        await removeReactionMutation.mutateAsync(messageId);
      } catch (error) {
        toast.push(errorMessage(error), "error");
      }
    },
    [removeReactionMutation, toast]
  );

  const handleBlock = useCallback(async () => {
    if (!otherParticipant) return;
    try {
      await blockMutation.mutateAsync(otherParticipant.userId);
      if (selectedRoomId) markBlockedRoom(selectedRoomId, true);
      toast.push("User blocked. Messaging is disabled for this conversation.", "success");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }, [otherParticipant, blockMutation, selectedRoomId, markBlockedRoom, toast]);

  const handleUnblock = useCallback(async () => {
    if (!otherParticipant) return;
    try {
      await unblockMutation.mutateAsync(otherParticipant.userId);
      if (selectedRoomId) markBlockedRoom(selectedRoomId, false);
      toast.push("User unblocked.", "success");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }, [otherParticipant, unblockMutation, selectedRoomId, markBlockedRoom, toast]);

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--color-sage)] border-t-transparent" />
          <p className="text-sm text-[var(--color-text-muted)]">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-[rgba(229,217,182,0.1)] px-5 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/favicon.png" width={44} height={44} alt="BadrLink favicon" className="inline-block" />
            <div className="font-display bg-gradient-to-r from-[var(--color-parchment)] to-[var(--color-sage)] bg-clip-text text-3xl text-transparent">
              BadrLink
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="relative rounded-full border border-[var(--color-border-strong)] px-3 py-1 text-xs text-[rgba(229,217,182,0.8)]"
          >
            Alerts
            {(unread.data?.count ?? 0) > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-fern)] px-1 text-[10px] font-bold text-[var(--color-parchment)]">
                {unread.data!.count > 99 ? "99+" : unread.data!.count}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 pt-6">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter conversations"
          className="h-12 rounded-xl border border-[var(--color-border-subtle)] bg-gradient-to-r from-[rgba(46,94,55,0.6)] to-[rgba(95,141,78,0.2)] text-lg text-[var(--color-parchment)] placeholder:text-[rgba(164,190,123,0.75)]"
        />
      </div>

      <div className="flex items-center gap-2 px-4 pt-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-13 flex-1 rounded-xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-4 py-2 text-lg font-medium text-[var(--color-parchment)] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="inline h-4 w-4" aria-hidden="true" /> New Chat
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 pt-2 text-xs">
        <button
          type="button"
          onClick={() => setConnectionsOpen(true)}
          className="rounded-full border border-[var(--color-border-strong)] px-3 py-1 text-[rgba(229,217,182,0.8)]"
        >
          People
          {(pendingConnectionsQuery.data?.length ?? 0) > 0 && (
            <span className="ml-1 text-[var(--color-sage)]">
              ({pendingConnectionsQuery.data!.length})
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setInvitesOpen(true)}
          className="relative rounded-full border border-[var(--color-border-strong)] px-3 py-1 text-[rgba(229,217,182,0.8)]"
        >
          Invites
          {pendingInvitations.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-fern)] px-1 text-[9px] font-bold text-[var(--color-parchment)]">
              {pendingInvitations.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setBlockedOpen(true)}
          className="rounded-full border border-[var(--color-border-strong)] px-3 py-1 text-[rgba(229,217,182,0.8)]"
        >
          Blocked
        </button>
      </div>

      <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {roomsQuery.isLoading && rooms.length === 0 ? (
          <div className="space-y-2 px-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14" />
            ))}
          </div>
        ) : roomsQuery.isError ? (
          <div className="px-3 text-sm text-red-300">
            Could not load conversations.
            <button type="button" onClick={() => roomsQuery.refetch()} className="ml-2 underline">
              Retry
            </button>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="px-3 text-lg text-[rgba(164,190,123,0.6)]">No conversations yet.</div>
        ) : (
          filteredRooms.map((room) => (
            <ConversationItem
              key={room.id}
              room={room}
              title={roomTitle(room)}
              active={selectedRoomId === room.id}
              onClick={() => selectRoom(room.id)}
            />
          ))
        )}
      </div>

      {roomsQuery.hasNextPage && (
        <button
          type="button"
          onClick={() => roomsQuery.fetchNextPage()}
          className="mx-4 mb-4 rounded-xl border border-[var(--color-border-strong)] px-4 py-2 text-sm text-[rgba(229,217,182,0.7)]"
        >
          Load more
        </button>
      )}

      <div className="mt-auto border-t border-[rgba(229,217,182,0.1)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={auth.user?.username ?? "?"} status={socketState === "connected" ? "ONLINE" : "OFFLINE"} />
            <div>
              <div className="text-lg font-semibold text-[var(--color-parchment)]">
                {auth.user?.username ?? "Signed in"}
              </div>                <div className="text-sm text-[rgba(164,190,123,0.9)]">
                {socketState === "connected" ? "Online" : "Reconnecting…"}
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Settings"
            onClick={handleOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--color-forest)]"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  const mainContent = (
    <div className="flex h-full flex-col bg-gradient-to-br from-[rgba(229,217,182,0.95)] to-[rgba(212,200,158,0.9)]">
      {socketState !== "connected" && socketState !== "offline" && (
        <div className="bg-[rgba(95,141,78,0.2)] px-6 py-1 text-center text-xs text-[var(--color-forest)]">
          {socketState === "connecting" ? "Connecting…" : "Reconnecting…"}
        </div>
      )}

      {isBlocked && (
        <div className="border-b border-[rgba(192,57,43,0.3)] bg-[rgba(192,57,43,0.14)] px-6 py-2 text-center text-xs text-[rgba(120,30,20,0.95)]">
          This conversation is blocked. Messaging is disabled until the block is lifted.
        </div>
      )}

      <header className="flex items-center justify-between border-b border-[rgba(40,84,48,0.15)] bg-gradient-to-r from-[rgba(212,200,158,0.9)] to-[rgba(229,217,182,0.95)] px-6 py-4">
        {selectedRoom ? (
          <div className="flex items-center gap-3">
            <Avatar
              name={selectedTitle || "?"}
              status={
                selectedRoom.type === "DIRECT"
                  ? socketState === "connected" && otherPresence === "ONLINE"
                    ? "ONLINE"
                    : otherPresence
                  : undefined
              }
            />
            <div>
              <div className="font-display text-base text-[var(--color-forest)]">{selectedTitle}</div>
              <div className="text-xs text-[rgba(95,141,78,0.7)]">{headerSubtitle}</div>
            </div>
          </div>
        ) : (
          <div />
        )}
        {selectedRoom && (
          <div className="flex items-center gap-2">
            {selectedRoom.type === "DIRECT" && otherParticipant && (
              <button
                type="button"
                onClick={isBlocked ? handleUnblock : handleBlock}
                disabled={blockMutation.isPending || unblockMutation.isPending}
                className="rounded-xl border border-[rgba(40,84,48,0.2)] px-3 py-1 text-xs text-[rgba(40,84,48,0.7)] disabled:opacity-60"
              >
                {isBlocked ? "Unblock" : "Block"}
              </button>
            )}
            {selectedRoom.type === "GROUP" && (
              <button
                type="button"
                onClick={() => setParticipantsOpen(true)}
                className="rounded-xl border border-[rgba(40,84,48,0.2)] px-3 py-1 text-xs text-[rgba(40,84,48,0.7)]"
              >
                Members
              </button>
            )}
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="rounded-xl border border-[rgba(40,84,48,0.2)] px-3 py-1 text-xs text-[rgba(40,84,48,0.7)]"
            >
              Leave
            </button>
          </div>
        )}
      </header>

      {selectedRoom ? (
        <>
          <MessageList
            roomId={selectedRoom.id}
            messages={messages}
            currentUserId={currentUserId}
            roomCreatedById={selectedRoom.createdBy}
            loading={messagesQuery.isLoading}
            hasMore={Boolean(messagesQuery.hasNextPage)}
            onLoadMore={() => messagesQuery.fetchNextPage()}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
            onReact={handleReact}
            onRemoveReaction={handleRemoveReaction}
          />
          {messagesQuery.isError && (
            <div className="px-6 py-2 text-center text-xs text-red-500">Could not load messages.</div>
          )}
          <MessageInput
            value={draft}
            onChange={(value) => setDraft(selectedRoom.id, value)}
            onSend={handleSend}
            onTyping={handleTyping}
            blocked={isBlocked}
            muted={isMuted}
            sending={sendMutation.isPending}
          />
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-[rgba(40,84,48,0.7)]">
          <div className="text-2xl font-semibold text-[var(--color-forest)]">No chat selected</div>
          <div className="text-base text-[rgba(40,84,48,0.6)]">
            Choose a conversation or start a new one.
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-2xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-6 py-2 font-semibold text-[var(--color-parchment)]"
          >
            New conversation
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-dvh">
      <div className="h-full lg:hidden">
        {selectedRoom ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3 border-b border-[rgba(40,84,48,0.15)] bg-gradient-to-r from-[rgba(212,200,158,0.9)] to-[rgba(229,217,182,0.95)] px-4 py-3">
              <button
                type="button"
                onClick={() => selectRoom(null)}
                className="rounded-xl border border-[rgba(40,84,48,0.2)] px-3 py-1 text-xs text-[rgba(40,84,48,0.7)]"
              >
                <ArrowLeft className="inline h-3 w-3" aria-hidden="true" /> Back
              </button>
            </div>
            {mainContent}
          </div>
        ) : (
          <div className="h-full">{sidebarContent}</div>
        )}
      </div>

      <div className="hidden h-full lg:block">
        <AppShell sidebar={sidebarContent} main={mainContent} />
      </div>

      <NewConversationModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={handleCreateRoom} />
      <NotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
      <ConnectionsModal open={connectionsOpen} onClose={() => setConnectionsOpen(false)} />
      <BlockedUsersModal open={blockedOpen} onClose={() => setBlockedOpen(false)} currentUserId={currentUserId} />
      <InvitationsModal open={invitesOpen} onClose={() => setInvitesOpen(false)} />
      {selectedRoom && selectedRoom.type === "GROUP" && (
        <ParticipantsDrawer
          open={participantsOpen}
          onClose={() => setParticipantsOpen(false)}
          room={selectedRoom}
          currentUserId={currentUserId}
          onLeaveRoom={() => selectRoom(null)}
        />
      )}

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <div className="flex flex-col gap-4">
          <Input
            label="Username"
            value={settingsUsername}
            onChange={(event) => setSettingsUsername(event.target.value)}
            placeholder="Your username"
            className="bg-[rgba(26,58,32,0.6)]"
          />
          <Input
            label="Profile picture URL"
            value={settingsAvatarUrl}
            onChange={(event) => setSettingsAvatarUrl(event.target.value)}
            placeholder="https://example.com/avatar.png"
            className="bg-[rgba(26,58,32,0.6)]"
          />
          <Input
            label="Description"
            value={settingsDescription}
            onChange={(event) => setSettingsDescription(event.target.value)}
            placeholder="A short bio"
            className="bg-[rgba(26,58,32,0.6)]"
          />
          <div className="flex justify-between gap-2">
            <button
              type="button"
              onClick={async () => {
                await auth.logout();
                router.replace("/login");
              }}
              className="rounded-xl border border-[var(--color-border-strong)] px-4 py-2 text-sm text-[rgba(229,217,182,0.8)]"
            >
              Log out
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="text-sm text-[rgba(229,217,182,0.6)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={settingsSaving}
                className="rounded-xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-4 py-2 text-sm font-semibold text-[var(--color-parchment)] disabled:opacity-60"
              >
                {settingsSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
