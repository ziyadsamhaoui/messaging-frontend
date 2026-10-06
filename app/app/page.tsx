"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { useRooms, roomsQueryKey } from "../../hooks/useRooms";
import {
  messagesQueryKey,
  useMessages,
  useRoomParticipants,
  useSendMessage,
} from "../../hooks/useMessages";
import { useUser } from "../../hooks/useUser";
import { useSocket } from "../../hooks/useSocket";
import { useUiStore } from "../../store/uiStore";
import { flattenPages } from "../../lib/pagination";
import { errorMessage, isApiError } from "../../lib/errors";
import { STOMP_DESTINATIONS } from "../../lib/stompClient";
import { createRoom, removeParticipant } from "../../lib/services/rooms";
import { updateUser } from "../../lib/services/users";
import {
  CreateRoomRequest,
  CursorPage,
  MessageResponse,
  RoomResponse,
  TypingEvent,
} from "../../lib/types";
import { AppShell } from "../../components/layout/AppShell";
import { ConversationItem } from "../../components/sidebar/ConversationItem";
import { NewConversationModal } from "../../components/sidebar/NewConversationModal";
import { NotificationPanel } from "../../components/notifications/NotificationPanel";
import { MessageList } from "../../components/chat/MessageList";
import { MessageInput } from "../../components/chat/MessageInput";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { useUnreadCount } from "../../hooks/useNotifications";

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

  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [blockedRooms, setBlockedRooms] = useState<Record<string, boolean>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [settingsUsername, setSettingsUsername] = useState("");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsSaving, setSettingsSaving] = useState(false);

  const lastTypingRef = useRef(0);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const currentUserId = auth.session?.userId ?? null;

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
  const messages = useMemo(() => flattenPages(messagesQuery.data?.pages), [messagesQuery.data]);
  const appendRealtimeMessage = messagesQuery.appendRealtimeMessage;

  const participantsQuery = useRoomParticipants(selectedRoomId);
  const participants = useMemo(
    () => participantsQuery.data?.items ?? [],
    [participantsQuery.data]
  );
  const otherParticipant = participants.find((participant) => participant.userId !== currentUserId);
  const otherUserQuery = useUser(otherParticipant?.userId);

  const sendMutation = useSendMessage(selectedRoomId, currentUserId);
  const unread = useUnreadCount(auth.status === "authenticated");

  const handleServerError = useCallback(
    (error: Parameters<typeof errorMessage>[0]) => {
      toast.push(errorMessage(error), "error");
      if (!selectedRoomId) return;
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey(selectedRoomId) });
      if (isApiError(error) && error.isBlocked) {
        setBlockedRooms((prev) => ({ ...prev, [selectedRoomId]: true }));
      }
    },
    [toast, selectedRoomId, queryClient]
  );

  const { subscribe, publish } = useSocket({
    token: auth.session?.accessToken ?? null,
    onServerError: handleServerError,
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
    if (!currentUserId) return;
    return subscribe(STOMP_DESTINATIONS.userEvents(currentUserId), () => {
      void queryClient.invalidateQueries({ queryKey: roomsQueryKey });
      toast.push("New activity in your account.", "info");
    });
  }, [currentUserId, subscribe, queryClient, toast]);

  useEffect(() => {
    if (!selectedRoomId) return;

    const unsubscribeMessages = subscribe(
      STOMP_DESTINATIONS.roomMessages(selectedRoomId),
      (message) => {
        try {
          const payload = JSON.parse(message.body) as MessageResponse;
          appendRealtimeMessage(payload);
          noteRoomActivity(payload.roomId, payload.createdAt);
        } catch {
          void 0;
        }
      }
    );

    const unsubscribeTyping = subscribe(
      STOMP_DESTINATIONS.roomTyping(selectedRoomId),
      (message) => {
        try {
          const event = JSON.parse(message.body) as TypingEvent;
          if (event.userId && event.userId === currentUserId) return;
          const label = event.username ?? "Someone";
          setTypingUsers((prev) => ({ ...prev, [selectedRoomId]: label }));
          clearTimeout(typingTimersRef.current[selectedRoomId]);
          typingTimersRef.current[selectedRoomId] = setTimeout(() => {
            setTypingUsers((prev) => {
              const next = { ...prev };
              delete next[selectedRoomId];
              return next;
            });
          }, 3000);
        } catch {
          void 0;
        }
      }
    );

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [selectedRoomId, subscribe, appendRealtimeMessage, noteRoomActivity, currentUserId]);

  useEffect(() => {
    const timers = typingTimersRef.current;
    return () => {
      Object.values(timers).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const filteredRooms = useMemo(() => {
    if (!query.trim()) return rooms;
    const needle = query.toLowerCase();
    return rooms.filter((room) => roomTitle(room).toLowerCase().includes(needle));
  }, [rooms, query]);

  const draft = selectedRoomId ? drafts[selectedRoomId] ?? "" : "";
  const isBlocked = selectedRoomId ? Boolean(blockedRooms[selectedRoomId]) : false;

  const selectedTitle = selectedRoom
    ? selectedRoom.type === "DIRECT"
      ? otherUserQuery.data?.username ?? "Direct message"
      : roomTitle(selectedRoom)
    : "";
  const selectedInitial = selectedTitle.charAt(0).toUpperCase() || "?";

  const handleSend = useCallback(
    async (content: string) => {
      if (!selectedRoomId) return;
      try {
        await sendMutation.mutateAsync({ content });
        clearDraft(selectedRoomId);
        noteRoomActivity(selectedRoomId, new Date().toISOString());
      } catch (error) {
        toast.push(errorMessage(error), "error");
        if (isApiError(error) && error.isBlocked) {
          setBlockedRooms((prev) => ({ ...prev, [selectedRoomId]: true }));
        }
      }
    },
    [selectedRoomId, sendMutation, clearDraft, noteRoomActivity, toast]
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
    setSettingsDescription(auth.user?.description ?? "");
    setSettingsOpen(true);
  }, [auth.user]);

  const handleSaveProfile = useCallback(async () => {
    if (!currentUserId) return;
    setSettingsSaving(true);
    try {
      await updateUser(currentUserId, {
        username: settingsUsername.trim(),
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
  }, [currentUserId, settingsUsername, settingsDescription, auth, toast]);

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

  if (auth.status !== "authenticated") {
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
            className="relative rounded-full border border-[rgba(229,217,182,0.25)] px-3 py-1 text-xs text-[rgba(229,217,182,0.8)]"
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
          className="h-12 rounded-xl border border-[rgba(164,190,123,0.15)] bg-gradient-to-r from-[rgba(46,94,55,0.6)] to-[rgba(95,141,78,0.2)] text-lg text-[var(--color-parchment)] placeholder:text-[rgba(164,190,123,0.5)]"
        />
      </div>

      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-13 w-full rounded-xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-4 py-2 text-lg font-medium text-[var(--color-parchment)] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          + New Chat
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
          className="mx-4 mb-4 rounded-xl border border-[rgba(229,217,182,0.25)] px-4 py-2 text-sm text-[rgba(229,217,182,0.7)]"
        >
          Load more
        </button>
      )}

      <div className="mt-auto border-t border-[rgba(229,217,182,0.1)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] text-lg font-semibold text-[var(--color-parchment)]">
              {(auth.user?.username ?? "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold text-[var(--color-parchment)]">
                {auth.user?.username ?? "Signed in"}
              </div>
              <div className="text-sm text-[rgba(164,190,123,0.7)]">
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
            ⚙
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

      <header className="flex items-center justify-between border-b border-[rgba(40,84,48,0.15)] bg-gradient-to-r from-[rgba(212,200,158,0.9)] to-[rgba(229,217,182,0.95)] px-6 py-4">
        {selectedRoom ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-fern)] to-[var(--color-forest)] text-sm font-semibold text-[var(--color-parchment)]">
              {selectedInitial}
            </div>
            <div>
              <div className="font-display text-base text-[var(--color-forest)]">{selectedTitle}</div>
              <div className="text-xs text-[rgba(95,141,78,0.7)]">
                {typingUsers[selectedRoom.id] ? `${typingUsers[selectedRoom.id]} is typing…` : selectedRoom.type === "GROUP" ? "Group chat" : "Direct chat"}
              </div>
            </div>
          </div>
        ) : (
          <div />
        )}
        {selectedRoom && (
          <button
            type="button"
            onClick={handleLeaveRoom}
            className="rounded-xl border border-[rgba(40,84,48,0.2)] px-3 py-1 text-xs text-[rgba(40,84,48,0.7)]"
          >
            Leave
          </button>
        )}
      </header>

      {selectedRoom ? (
        <>
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            loading={messagesQuery.isLoading}
            hasMore={Boolean(messagesQuery.hasNextPage)}
            onLoadMore={() => messagesQuery.fetchNextPage()}
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
                ← Back
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
              className="rounded-xl border border-[rgba(229,217,182,0.25)] px-4 py-2 text-sm text-[rgba(229,217,182,0.8)]"
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
