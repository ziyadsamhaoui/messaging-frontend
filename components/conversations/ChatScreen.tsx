"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MoreVertical, UserRound, UsersRound } from "lucide-react";
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
import { invalidateRoomMedia, useAttachmentLookup } from "@/hooks/useAttachments";
import { useUser } from "@/hooks/useUser";
import { useBlockedUserIds, useBlockUser, useUnblockUser } from "@/hooks/useBlocks";
import { useSocket } from "@/hooks/useSocket";
import { useUiStore } from "@/store/uiStore";
import { flattenPages } from "@/lib/pagination";
import { errorMessage, isApiError } from "@/lib/errors";
import { STOMP_DESTINATIONS } from "@/lib/stompClient";
import { classifyRoomFrame } from "@/lib/realtimeFrames";
import { derivePresence, formatLastSeen, presenceLabel } from "@/lib/presence";
import { removeParticipant, sendMessage as sendRoomMessage } from "@/lib/services/rooms";
import { getAttachment } from "@/lib/services/attachments";
import { kindOf, messageTypeOf, prepareUpload } from "@/lib/attachments/compress";
import { uploadAttachment } from "@/lib/attachments/upload";
import { getUser } from "@/lib/services/users";
import { CHATS_HREF, connectionHref } from "@/lib/appRoute";
import {
  AttachmentResponse,
  ChatMessage,
  PendingAttachmentUpload,
  RoomResponse,
  TypingEvent,
} from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { GroupInfoPanel, GROUP_INFO_PANEL_ID } from "@/components/chat/GroupInfoPanel";
import { DirectInfoPanel, DIRECT_INFO_PANEL_ID } from "@/components/chat/DirectInfoPanel";
import { MainPane } from "@/components/layout/MainPane";
import { IconButton } from "@/components/ui/IconButton";
import { Avatar } from "@/components/ui/Avatar";
import { Popover, PopoverItem, popoverItemClasses } from "@/components/ui/Popover";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface ActiveTyping {
  userId: string;
  label: string;
}

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
  const [pendingUploads, setPendingUploads] = useState<Record<string, PendingAttachmentUpload>>(
    {}
  );
  const uploadFilesRef = useRef(new Map<string, File>());
  const statusChecksRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTrigger, setDetailsTrigger] = useState<HTMLButtonElement | null>(null);
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
  const {
    applyRoomMessageFrame,
    applyReactionFrame,
    applyMessageDeleted,
    applyAttachmentsUpdated,
    appendMessage,
  } = messagesQuery;

  const attachmentIds = useMemo(
    () => messages.flatMap((message) => message.attachmentIds),
    [messages]
  );
  const attachmentLookup = useAttachmentLookup(roomId, attachmentIds);
  const attachmentMap = useMemo(() => {
    const entries = (attachmentLookup.data ?? []).map(
      (attachment) => [attachment.id, attachment] as const
    );
    return Object.fromEntries(entries) as Record<string, AttachmentResponse>;
  }, [attachmentLookup.data]);

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
      } else if (classified.kind === "attachments") {
        applyAttachmentsUpdated(classified.frame);
        void queryClient.invalidateQueries({ queryKey: ["attachments"] });
        void invalidateRoomMedia(queryClient, roomId);
        setPendingUploads((current) => {
          if (!current[classified.frame.messageId]) return current;
          const next = { ...current };
          delete next[classified.frame.messageId];
          return next;
        });
        uploadFilesRef.current.delete(classified.frame.messageId);
        const timer = statusChecksRef.current.get(classified.frame.messageId);
        if (timer) {
          clearTimeout(timer);
          statusChecksRef.current.delete(classified.frame.messageId);
        }
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
    applyAttachmentsUpdated,
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

  const patchPending = useCallback(
    (messageId: string, patch: Partial<PendingAttachmentUpload>) => {
      setPendingUploads((current) =>
        current[messageId]
          ? { ...current, [messageId]: { ...current[messageId], ...patch } }
          : current
      );
    },
    []
  );

  const uploadToMessage = useCallback(
    async (messageId: string, file: File) => {
      try {
        const prepared = await prepareUpload(file);
        patchPending(messageId, {
          fileName: prepared.fileName,
          kind: prepared.kind,
          status: "uploading",
          error: undefined,
        });
        const confirmed = await uploadAttachment(roomId, messageId, prepared);
        patchPending(messageId, {
          attachmentId: confirmed.id,
          status: "scanning",
          error: undefined,
        });

        const existing = statusChecksRef.current.get(messageId);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(async () => {
          statusChecksRef.current.delete(messageId);
          try {
            const metadata = await getAttachment(confirmed.id);
            if (metadata.status === "READY") {
              applyAttachmentsUpdated({
                eventType: "MESSAGE_ATTACHMENTS_UPDATED",
                messageId,
                roomId,
                attachmentIds: [confirmed.id],
              });
              void queryClient.invalidateQueries({ queryKey: ["attachments"] });
              void invalidateRoomMedia(queryClient, roomId);
              setPendingUploads((current) => {
                if (!current[messageId]) return current;
                const next = { ...current };
                delete next[messageId];
                return next;
              });
              uploadFilesRef.current.delete(messageId);
            } else if (metadata.status === "REJECTED") {
              patchPending(messageId, {
                status: "failed",
                error: "This file was rejected and was not attached.",
              });
            }
          } catch {
            patchPending(messageId, { status: "scanning" });
          }
        }, 45_000);
        statusChecksRef.current.set(messageId, timer);
      } catch (error) {
        patchPending(messageId, { status: "failed", error: errorMessage(error) });
        toast.push(errorMessage(error), "error");
      }
    },
    [applyAttachmentsUpdated, patchPending, queryClient, roomId, toast]
  );

  const handleSendAttachment = useCallback(
    async (file: File) => {
      try {
        const kind = kindOf(file.type);
        const created = await sendRoomMessage(roomId, {
          type: messageTypeOf(kind),
          content: "",
        });
        appendMessage(created);
        uploadFilesRef.current.set(created.id, file);
        setPendingUploads((current) => ({
          ...current,
          [created.id]: {
            messageId: created.id,
            attachmentId: null,
            fileName: file.name,
            kind,
            status: "preparing",
          },
        }));
        await uploadToMessage(created.id, file);
      } catch (error) {
        toast.push(errorMessage(error), "error");
      }
    },
    [appendMessage, roomId, toast, uploadToMessage]
  );

  const handleRetryUpload = useCallback(
    (messageId: string) => {
      const file = uploadFilesRef.current.get(messageId);
      if (!file) return;
      void uploadToMessage(messageId, file);
    },
    [uploadToMessage]
  );

  useEffect(
    () => () => {
      statusChecksRef.current.forEach((timer) => clearTimeout(timer));
      statusChecksRef.current.clear();
    },
    []
  );

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
  const isGroup = room?.type === "GROUP";

  function closeDetails() {
    setDetailsOpen(false);
    detailsTrigger?.focus({ preventScroll: true });
  }

  return (
    <MainPane>
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
          aria-label="Back to chats"
        >
          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        {room?.type === "DIRECT" && otherParticipant ? (
          <Link
            href={connectionHref(otherParticipant.userId)}
            className="focus-ring-light flex min-w-0 items-center gap-3 rounded-[var(--radius-control)]"
          >
            <Avatar
              name={title}
              seed={otherParticipant.userId}
              src={otherUserQuery.data?.profilePictureUrl}
              size={40}
              status={peerPresence ?? undefined}
              presenceRing="var(--app-pane)"
            />
            <span className="min-w-0">
              <h2 className="truncate font-ui text-[20px] font-semibold text-[var(--app-pane-text)]">
                {title}
              </h2>
              {statusLine && (
                <span className="block truncate font-ui text-[13px] text-[var(--app-pane-text-soft)]">
                  {statusLine}
                </span>
              )}
            </span>
          </Link>
        ) : (
          <>
            <Avatar name={title} seed={roomId} size={40} presenceRing="var(--app-pane)" />
            <div className="min-w-0">
              <h2 className="truncate font-ui text-[20px] font-semibold text-[var(--app-pane-text)]">
                {title}
              </h2>
              {statusLine && (
                <p className="truncate font-ui text-[13px] text-[var(--app-pane-text-soft)]">
                  {statusLine}
                </p>
              )}
            </div>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {(isGroup || room?.type === "DIRECT") && (
            <IconButton
              ref={setDetailsTrigger}
              surface="pane"
              size="sm"
              label={
                room?.type === "DIRECT"
                  ? detailsOpen
                    ? "Hide contact info"
                    : "Show contact info"
                  : detailsOpen
                    ? "Hide group info"
                    : "Show group info"
              }
              tooltip={room?.type === "DIRECT" ? "Contact info" : "Group info"}
              aria-expanded={detailsOpen}
              aria-controls={room?.type === "DIRECT" ? DIRECT_INFO_PANEL_ID : GROUP_INFO_PANEL_ID}
              onClick={() => (detailsOpen ? closeDetails() : setDetailsOpen(true))}
            >
              <UsersRound size={20} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
          )}
          <RoomMenu
            isDirect={room?.type === "DIRECT"}
            isGroup={isGroup}
            isBlocked={isBlocked}
            peerHref={
              room?.type === "DIRECT" && otherParticipant
                ? connectionHref(otherParticipant.userId)
                : null
            }
            onOpenDetails={() => setDetailsOpen(true)}
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
        isGroupRoom={room?.type === "GROUP"}
        typingLabel={typing ? (room?.type === "GROUP" ? typing.label : "Someone") : null}
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
        attachments={attachmentMap}
        pendingUploads={pendingUploads}
        onRetryUpload={handleRetryUpload}
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
        onSendAttachment={handleSendAttachment}
        onTyping={handleTyping}
        blocked={isBlocked}
        muted={isMuted}
        sending={sendMutation.isPending}
        blockedAction={
          isBlocked && otherParticipant ? (
            <button
              type="button"
              onClick={async () => {
                try {
                  await unblockMutation.mutateAsync(otherParticipant.userId);
                  markBlockedRoom(roomId, false);
                  toast.push("User unblocked.", "success");
                } catch (error) {
                  toast.push(errorMessage(error), "error");
                }
              }}
              className="focus-ring-light h-9 rounded-[var(--radius-control)] border border-[var(--app-pane-control-border)] px-3 font-ui text-[13px] font-medium text-[var(--app-pane-text)]"
            >
              Unblock
            </button>
          ) : undefined
        }
      />

        </div>

        {isGroup && detailsOpen && room && (
          <GroupInfoPanel
            key={room.id}
            room={room}
            currentUserId={currentUserId}
            onClose={closeDetails}
            onLeft={() => setDetailsOpen(false)}
          />
        )}
        {room?.type === "DIRECT" && detailsOpen && otherParticipant && (
          <DirectInfoPanel
            key={room.id}
            room={room}
            peerUserId={otherParticipant.userId}
            peerName={title}
            peerPictureUrl={otherUserQuery.data?.profilePictureUrl}
            peerPresence={peerPresence}
            peerLoading={otherUserQuery.isLoading && !otherUserQuery.data}
            isBlocked={isBlocked}
            onToggleBlock={async () => {
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
            onClose={closeDetails}
          />
        )}
      </div>
    </MainPane>
  );
}

function RoomMenu({
  isDirect,
  isGroup,
  isBlocked,
  peerHref,
  onOpenDetails,
  onToggleBlock,
  onLeave,
}: {
  isDirect: boolean;
  isGroup: boolean;
  isBlocked: boolean;
  peerHref: string | null;
  onOpenDetails: () => void;
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
        {peerHref && (
          <Link href={peerHref} className={popoverItemClasses()} onClick={close}>
            <UserRound size={16} strokeWidth={1.75} aria-hidden="true" />
            View profile
          </Link>
        )}
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
          <PopoverItem
            onClick={() => {
              close();
              onOpenDetails();
            }}
          >
            <UsersRound size={16} strokeWidth={1.75} aria-hidden="true" />
            Group info
          </PopoverItem>
        )}
        {isGroup && (
          <PopoverItem
            danger
            onClick={() => {
              setOpen(false);
              setConfirming(true);
            }}
          >
            Leave group
          </PopoverItem>
        )}
      </Popover>

      <ConfirmDialog
        open={confirming}
        title="Leave this group?"
        description="You will stop receiving its messages. The group and its history stay for everyone else."
        confirmLabel="Leave group"
        danger
        onConfirm={() => {
          setConfirming(false);
          void onLeave();
        }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
