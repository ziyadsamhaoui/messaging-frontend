"use client";

import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";
import {
  notificationsQueryKey,
  unreadCountQueryKey,
  useNotificationFeed,
} from "../../hooks/useNotifications";
import { roomsQueryKey } from "../../hooks/useRooms";
import { useUiStore } from "../../store/uiStore";
import { acceptInvitation, rejectInvitation } from "../../lib/services/rooms";
import { errorMessage, isApiError } from "../../lib/errors";
import { NotificationResponse } from "../../lib/types";

interface InboxItem {
  invitationId: string;
  label: string;
  createdAt: string;
  roomId: string | null;
}

interface InvitationsModalProps {
  open: boolean;
  onClose: () => void;
}

function isPendingInvitationNotification(notification: NotificationResponse): boolean {
  return (
    notification.type === "INVITATION" &&
    notification.sourceType === "INVITATION" &&
    !notification.sourceId.endsWith(":accepted")
  );
}

export function InvitationsModal({ open, onClose }: InvitationsModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const feed = useNotificationFeed(open);
  const drafts = useUiStore((state) => state.pendingInvitations);
  const removeDraft = useUiStore((state) => state.removeInvitation);
  const [expiredIds, setExpiredIds] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const items = useMemo<InboxItem[]>(() => {
    const fromDrafts = drafts.map<InboxItem>((draft) => ({
      invitationId: draft.invitationId,
      label: `${draft.inviterUsername ?? "Someone"} invited you to ${draft.roomName ?? "a room"}`,
      createdAt: draft.sentAt,
      roomId: draft.roomId,
    }));
    const draftIds = new Set(fromDrafts.map((item) => item.invitationId));
    const fromFeed = (feed.data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter(isPendingInvitationNotification)
      .filter((notification) => !draftIds.has(notification.sourceId))
      .map<InboxItem>((notification) => ({
        invitationId: notification.sourceId,
        label: notification.content,
        createdAt: notification.createdAt,
        roomId: null,
      }));
    return [...fromDrafts, ...fromFeed];
  }, [drafts, feed.data]);

  async function respond(item: InboxItem, action: "accept" | "reject") {
    setBusyId(item.invitationId);
    try {
      if (action === "accept") {
        await acceptInvitation(item.invitationId);
        toast.push("Invitation accepted.", "success");
        void queryClient.invalidateQueries({ queryKey: roomsQueryKey });
      } else {
        await rejectInvitation(item.invitationId);
        toast.push("Invitation rejected.", "info");
      }
      removeDraft(item.invitationId);
      void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
    } catch (error) {
      if (isApiError(error) && error.kind === "invitation-expired") {
        setExpiredIds((prev) => ({ ...prev, [item.invitationId]: true }));
        removeDraft(item.invitationId);
      } else {
        toast.push(errorMessage(error), "error");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Room invitations">
      <div className="flex flex-col gap-3">
        {feed.isLoading && items.length === 0 && (
          <div className="text-sm text-[rgba(164,190,123,0.7)]">Loading…</div>
        )}

        {!feed.isLoading && items.length === 0 && (
          <div className="py-6 text-center text-sm text-[rgba(164,190,123,0.7)]">
            No pending invitations.
          </div>
        )}

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {items.map((item) => {
            const expired = expiredIds[item.invitationId];
            return (
              <div
                key={item.invitationId}
                className="rounded-xl border border-[rgba(164,190,123,0.2)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[var(--color-parchment)]">{item.label}</span>
                  <span className="text-[10px] text-[rgba(164,190,123,0.6)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                {expired ? (
                  <div className="mt-2 rounded-lg border border-[rgba(163,124,44,0.5)] bg-[rgba(163,124,44,0.15)] px-3 py-2 text-xs text-[rgba(233,196,106,0.95)]">
                    This invitation has expired. It can no longer be accepted — ask the group admin
                    to invite you again.
                  </div>
                ) : (
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void respond(item, "reject")}
                      disabled={busyId === item.invitationId}
                      className="rounded-lg border border-[rgba(164,190,123,0.35)] px-2 py-1 text-xs text-[var(--color-parchment)] disabled:opacity-60"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => void respond(item, "accept")}
                      disabled={busyId === item.invitationId}
                      className="rounded-lg bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-2 py-1 text-xs font-semibold text-[var(--color-parchment)] disabled:opacity-60"
                    >
                      {busyId === item.invitationId ? "Working…" : "Accept"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {feed.hasNextPage && (
          <button
            type="button"
            onClick={() => feed.fetchNextPage()}
            className="rounded-xl border border-[rgba(229,217,182,0.25)] px-4 py-2 text-sm text-[rgba(229,217,182,0.7)]"
          >
            Load more
          </button>
        )}
      </div>
    </Modal>
  );
}
