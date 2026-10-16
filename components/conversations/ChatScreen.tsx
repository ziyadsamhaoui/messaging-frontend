"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, UsersRound } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRooms } from "@/hooks/useRooms";
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
import { useSocket } from "@/hooks/useSocket";
import { useUiStore } from "@/store/uiStore";
import { flattenPages } from "@/lib/pagination";
import { errorMessage, isApiError } from "@/lib/errors";
import { STOMP_DESTINATIONS } from "@/lib/stompClient";
import { classifyRoomFrame } from "@/lib/realtimeFrames";
import { derivePresence, formatLastSeen, presenceLabel } from "@/lib/presence";
import { removeParticipant } from "@/lib/services/rooms";
import { getUser } from "@/lib/services/users";
import { CHATS_HREF } from "@/lib/appRoute";
import { ChatMessage, RoomResponse, TypingEvent } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ParticipantsDrawer } from "@/components/chat/ParticipantsDrawer";
import { MainPane } from "@/components/layout/MainPane";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/Avatar";
import { Popover, PopoverItem } from "@/components/ui/Popover";

interface ActiveTyping {
  userId: string;
  label: string;
}

/**
 * Zone three for the conversations destination: the open room.
 *
 * The room comes from the route, and the realtime subscription for it is set up
 * here rather than in the shell, because it is scoped to exactly this view: leaving
 * for another destination unmounts the subscription, which is the same lifetime the
 * socket already had when the open room was component state.
 */
export function ChatScreen({ roomId }: { roomId: string }) {
  const auth = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const currentUserId = auth.session?.userId ?? null;

  const drafts = useUiStore((state) => state.drafts);
  const setDraft = useUiStore((state) => state.setDraft);
  const clearDraft = useUiStore((state) => state.clearDraft);
  const noteRoomActivity = useUiStore((state) => state.noteRoomActivity);
  const socketState = useUiStore((state) => state.socketState);
  const blockedRooms = useUiStore((state) => state.blockedRooms);
  const markBlockedRoom = useUiStore((state) => state.markBlockedRoom);

  const [typing, setTyping] = useState<ActiveTyping | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const lastTypingRef = useRef(0);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userLabelsRef = useRef<Record<string, string>>({});

  const roomsQuery = useRooms();
  const rooms = useMemo(() => flattenPages(roomsQuery.data?.pages) as RoomResponse[], [roomsQuery.data]);
  const room = rooms.find((candidate) => candidate.id === roomId) ?? null;

  const messagesQuery = useMessages(roomId);
  const messages = useMemo(
    () => flattenPages(messagesQuery.data?.pages) as ChatMessage[],
    [messagesQuery.data]
  );
  const { applyRoomMessageFrame, applyReactionFrame, applyMessageDeleted } = messagesQuery;

  const participantsQuery = useRoomParticipants(roomId);
  const participants = useMemo(() => participantsQuery.data?.items ?? [], [participantsQuery.data]);
  const otherParticipant = participants.find((participant) => participant.userId !== currentUserId);
  const myParticipant = participants.find((participant) => participant.userId === currentUserId);
  const otherUserQuery = useUser(room?.type === "DIRECT" ? otherParticipant?.userId : null);

  const blockedIdsQuery = useBlockedUserIds(currentUserId);
  const blockedIds = useMemo(() => new Set(blockedIdsQuery.data ?? []), [blockedIdsQuery.data]);

  const sendMutation = useSendMessage(roomId, currentUserId);
  const editMutation = useEditMessage(roomId);
  const deleteMutation = useDeleteMessage(roomId);
  const addReactionMutation = useAddReaction(roomId);
  const removeReactionMutation = useRemoveReaction(roomId, currentUserId);
  const markRoomRead = useMarkRoomRead(roomId);
  const blockMutation = useBlockUser(currentUserId);
  const unblockMutation = useUnblockUser(currentUserId);

  const { subscribe, publish } = useSocket({
    token: auth.session?.accessToken ?? null,
    onServerError: (error) => {
      toast.push(errorMessage(error), "error");
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey(roomId) });
      if (isApiError(error) && error.isBlocked) markBlockedRoom(roomId, true);
    },
  });

  const resolveUserLabel = useCallback(
    async (userId: string): Promise<string> => {
      const cached = userLabelsRef.current[userId];
      if (cached) return cached;
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
    const unsubscribeMessages = subscribe(STOMP_DESTINATIONS.roomMessages(roomId), (message) => {
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
        noteRoomActivity(roomId, classified.frame.createdAt ?? new Date().toISOString());
      } else if (classified.kind === "reaction") {
        applyReactionFrame(classified.frame);
      } else if (classified.kind === "deleted") {
        applyMessageDeleted(classified.frame.messageId);
      } else if (classified.kind === "participant") {
        void queryClient.invalidateQueries({ queryKey: participantsQueryKey(roomId) });
        void queryClient.invalidateQueries({ queryKey: ["rooms"] });
      }
    });

    const unsubscribeTyping = subscribe(STOMP_DESTINATIONS.roomTyping(roomId), (message) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(message.body);
      } catch {
        return;
      }
      const event = parsed as Partial<TypingEvent>;
      if (!event.senderId || event.senderId === currentUserId) return;
      void resolveUserLabel(event.senderId).then((label) => {
        setTyping({ userId: event.senderId as string, label });
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTyping(null), 3000);
      });
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      setTyping(null);
    };
  }, [
    roomId,
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
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    const newest = messages.find((message) => !message.pending && !message.failed);
    if (!newest) return;
    void markRoomRead(newest.id);
  }, [messages, markRoomRead]);

  const handleSend = useCallback(
    async (content: string) => {
      try {
        await sendMutation.mutateAsync({ content });
        clearDraft(roomId);
        noteRoomActivity(roomId, new Date().toISOString());
      } catch (error) {
        toast.push(errorMessage(error), "error");
        void queryClient.invalidateQueries({ queryKey: messagesQueryKey(roomId) });
        if (isApiError(error) && error.isBlocked) markBlockedRoom(roomId, true);
      }
    },
    [sendMutation, clearDraft, noteRoomActivity, roomId, toast, queryClient, markBlockedRoom]
  );

  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingRef.current < 2000) return;
    lastTypingRef.current = now;
    publish(STOMP_DESTINATIONS.typing, { roomId });
  }, [publish, roomId]);

  const handleLeave = useCallback(async () => {
    if (!currentUserId) return;
    try {
      await removeParticipant(roomId, currentUserId);
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.push("Left conversation.", "success");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }, [roomId, currentUserId, queryClient, toast]);

  const derivedBlocked =
    room?.type === "DIRECT" && otherParticipant ? blockedIds.has(otherParticipant.userId) : false;
  const isBlocked = derivedBlocked || Boolean(blockedRooms[roomId]);
  const isMuted = Boolean(myParticipant?.isMuted);

  const title =
    room?.type === "DIRECT" ? otherUserQuery.data?.username ?? "Conversation" : room?.name ?? "Group";
  const peerLastSeen = otherUserQuery.data?.lastSeen ?? null;
  const peerPresence = peerLastSeen ? derivePresence(peerLastSeen) : null;

  /*
   * One status line, in priority order: who is typing, then for a direct chat the
   * other person's presence, then the member count for a group. The presence text
   * only claims what `lastSeen` supports — when the profile has not loaded yet the
   * line stays empty rather than asserting "Offline".
   */
  const statusLine = typing
    ? room?.type === "GROUP"
      ? `${typing.label} is typing…`
      : "typing…"
    : room?.type === "DIRECT"
      ? peerPresence === "ONLINE"
        ? "Online"
        : peerLastSeen
          ? `${presenceLabel(peerPresence ?? "OFFLINE")} · ${formatLastSeen(peerLastSeen)}`
          : ""
      : room
        ? `${participants.length} member${participants.length === 1 ? "" : "s"}`
        : "";

  const draft = drafts[roomId] ?? "";

  return (
    <MainPane>
      {socketState !== "connected" && socketState !== "offline" && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 bg-[rgba(224,165,59,0.16)] px-4 py-1 font-ui text-xs text-[var(--app-pane-text)]"
        >
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--app-warning-dot)]" />
          {socketState === "connecting" ? "Connecting…" : "Reconnecting…"}
        </p>
      )}

      <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[var(--app-pane-divider)] px-4">
        <Link
          href={CHATS_HREF}
          className="focus-ring-light flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--app-pane-text-soft)] md:hidden"
          aria-label="Back to conversations"
        >
          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <Avatar
          name={title}
          seed={room?.type === "DIRECT" ? otherParticipant?.userId ?? roomId : roomId}
          src={room?.type === "DIRECT" ? otherUserQuery.data?.profilePictureUrl : undefined}
          size={40}
          status={room?.type === "DIRECT" ? peerPresence ?? undefined : undefined}
          presenceRing="var(--app-pane)"
        />
        <div className="min-w-0">
          <h1 className="truncate font-display text-[17px] font-semibold text-[var(--app-pane-text)]">
            {title}
          </h1>
          {statusLine && (
            <p className="truncate font-ui text-[13px] text-[var(--app-pane-text-soft)]">{statusLine}</p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <IconButton
            surface="pane"
            size="sm"
            label="Room details"
            tooltip="Room details"
            onClick={() => setMembersOpen(true)}
          >
            <UsersRound size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
          <RoomMenu
            isDirect={room?.type === "DIRECT"}
            isGroup={room?.type === "GROUP"}
            isBlocked={isBlocked}
            onToggleBlock={async () => {
              if (!otherParticipant) return;
              try {
                if (isBlocked) {
                  await unblockMutation.mutateAsync(otherParticipant.userId);
                  markBlockedRoom(roomId, false);
                  toast.push("User unblocked.", "success");
                } else {
                  await blockMutation.mutateAsync(otherParticipant.userId);
                  markBlockedRoom(roomId, true);
                  toast.push("User blocked.", "success");
                }
              } catch (error) {
                toast.push(errorMessage(error), "error");
              }
            }}
            onLeave={handleLeave}
          />
        </div>
      </header>

      {isBlocked && (
        <p className="border-b border-[rgba(143,42,27,0.3)] bg-[rgba(143,42,27,0.08)] px-4 py-2 text-center font-ui text-[13px] text-[var(--app-danger-on-light)]">
          This conversation is blocked. Messaging is disabled until the block is lifted.
        </p>
      )}

      <MessageList
        roomId={roomId}
        messages={messages}
        currentUserId={currentUserId}
        roomCreatedById={room?.createdBy}
        loading={messagesQuery.isLoading}
        hasMore={Boolean(messagesQuery.hasNextPage)}
        onLoadMore={() => messagesQuery.fetchNextPage()}
        onEdit={async (messageId, content) => {
          try {
            await editMutation.mutateAsync({ messageId, content });
          } catch (error) {
            toast.push(errorMessage(error), "error");
          }
        }}
        onDelete={async (messageId) => {
          try {
            await deleteMutation.mutateAsync(messageId);
          } catch (error) {
            toast.push(errorMessage(error), "error");
          }
        }}
        onReact={async (messageId, emoji) => {
          try {
            await addReactionMutation.mutateAsync({ messageId, emoji });
          } catch (error) {
            toast.push(errorMessage(error), "error");
          }
        }}
        onRemoveReaction={async (messageId) => {
          try {
            await removeReactionMutation.mutateAsync(messageId);
          } catch (error) {
            toast.push(errorMessage(error), "error");
          }
        }}
      />

      <MessageInput
        value={draft}
        onChange={(value) => setDraft(roomId, value)}
        onSend={handleSend}
        onTyping={handleTyping}
        blocked={isBlocked}
        muted={isMuted}
        sending={sendMutation.isPending}
      />

      {room?.type === "GROUP" && (
        <ParticipantsDrawer
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          room={room}
          currentUserId={currentUserId}
          onLeaveRoom={() => setMembersOpen(false)}
        />
      )}
    </MainPane>
  );
}

/**
 * The chat's overflow actions.
 *
 * Only what the API supports is offered: blocking is a direct-chat action, leaving
 * is a group action, and leaving asks before it acts because it cannot be undone
 * from the UI. There is deliberately no "mute notifications" entry — muting is the
 * participant `isMuted` flag, which the backend uses to stop *you sending*, and
 * only an owner or admin may change it, so offering it here would misrepresent what
 * it does.
 */
function RoomMenu({
  isDirect,
  isGroup,
  isBlocked,
  onToggleBlock,
  onLeave,
}: {
  isDirect: boolean;
  isGroup: boolean;
  isBlocked: boolean;
  onToggleBlock: () => Promise<void>;
  onLeave: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  if (!isDirect && !isGroup) return null;

  return (
    <>
      <IconButton
        ref={setTrigger}
        surface="pane"
        size="sm"
        label="More actions"
        tooltip="More actions"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <MoreVertical size={20} strokeWidth={1.75} aria-hidden="true" />
      </IconButton>
      <Popover open={open} onClose={close} anchor={trigger} label="Chat actions" align="end">
        {confirming ? (
          <div className="flex flex-col gap-2 p-1">
            <p className="font-ui text-[13px] text-[var(--app-pane-text)]">Leave this chat?</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  close();
                  void onLeave();
                }}
                className="focus-ring-light h-8 rounded-lg bg-[var(--app-danger-on-light)] px-2.5 font-ui text-[13px] font-semibold text-[var(--color-parchment-elevated)]"
              >
                Leave
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="focus-ring-light h-8 rounded-lg border border-[var(--app-pane-control-border)] px-2.5 font-ui text-[13px] text-[var(--app-pane-text)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {isDirect && (
              <PopoverItem
                danger={!isBlocked}
                onClick={() => {
                  close();
                  void onToggleBlock();
                }}
              >
                {isBlocked ? "Unblock" : "Block"}
              </PopoverItem>
            )}
            {isGroup && (
              <PopoverItem danger onClick={() => setConfirming(true)}>
                Leave chat
              </PopoverItem>
            )}
          </>
        )}
      </Popover>
    </>
  );
}
