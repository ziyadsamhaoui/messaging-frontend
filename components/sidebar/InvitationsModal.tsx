"use client";

import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  pendingInvitationsQueryKey,
  useAcceptInvitation,
  usePendingInvitations,
  useRejectInvitation,
} from "@/hooks/useInvitations";
import { useUser } from "@/hooks/useUser";
import { errorMessage, isApiError } from "@/lib/errors";
import { PendingInvitationDto } from "@/lib/types";

interface InvitationsModalProps {
  open: boolean;
  onClose: () => void;
}

function isExpired(invitation: PendingInvitationDto): boolean {
  return new Date(invitation.expiresAt).getTime() <= Date.now();
}

function RoomLabel({ roomName }: { roomName: string | null }) {
  return <>{roomName ?? "a room"}</>;
}

/**
 * The invitation inbox is server-truth: Chat's `GET /invitations/pending` returns
 * the caller's PENDING invitations in both directions, so the sender sees their
 * outgoing invitation and the recipient sees the same one as incoming. Answering
 * an invitation flips its stored status, and the refetch removes the row for both
 * users — including after a refresh or re-login.
 */
export function InvitationsModal({ open, onClose }: InvitationsModalProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const invitationsQuery = usePendingInvitations(open);
  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();
  const [expiredIds, setExpiredIds] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const invitations = useMemo(() => invitationsQuery.data ?? [], [invitationsQuery.data]);
  const incoming = useMemo(
    () => invitations.filter((invitation) => invitation.direction === "INCOMING"),
    [invitations]
  );
  const outgoing = useMemo(
    () => invitations.filter((invitation) => invitation.direction === "OUTGOING"),
    [invitations]
  );

  async function respond(invitation: PendingInvitationDto, action: "accept" | "reject") {
    setBusyId(invitation.id);
    try {
      if (action === "accept") {
        await acceptMutation.mutateAsync(invitation.id);
        toast.push("Invitation accepted.", "success");
      } else {
        await rejectMutation.mutateAsync(invitation.id);
        toast.push("Invitation rejected.", "info");
      }
      // The mutation invalidates the inbox; the refetch drops the answered row.
    } catch (error) {
      if (isApiError(error) && error.kind === "invitation-expired") {
        // Still PENDING in storage but past its TTL: keep the row, mark it non-actionable.
        setExpiredIds((prev) => ({ ...prev, [invitation.id]: true }));
        toast.push(errorMessage(error), "info");
      } else if (
        isApiError(error) &&
        (error.kind === "not-found" || error.code === "INVITATION_ALREADY_HANDLED")
      ) {
        // Already answered elsewhere: the stale row is no longer valid, so refetch.
        toast.push(errorMessage(error), "info");
        void queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
      } else {
        toast.push(errorMessage(error), "error");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Room invitations">
      <div className="flex flex-col gap-4">
        {invitationsQuery.isLoading && invitations.length === 0 && (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
        )}

        {invitationsQuery.isError && (
          <div className="text-sm text-red-300">
            Could not load invitations.
            <button type="button" onClick={() => invitationsQuery.refetch()} className="ml-2 underline">
              Retry
            </button>
          </div>
        )}

        {!invitationsQuery.isLoading && !invitationsQuery.isError && invitations.length === 0 && (
          <div className="py-6 text-center text-sm text-[var(--color-text-secondary-soft)]">
            No pending invitations.
          </div>
        )}

        {incoming.length > 0 && (
          <section className="flex flex-col gap-2">
            <h4 className="text-xs uppercase tracking-wide text-[rgba(164,190,123,0.8)]">Incoming</h4>
            {incoming.map((invitation) => (
              <IncomingInvitationRow
                key={invitation.id}
                invitation={invitation}
                expired={expiredIds[invitation.id] || isExpired(invitation)}
                busy={busyId === invitation.id}
                onRespond={respond}
              />
            ))}
          </section>
        )}

        {outgoing.length > 0 && (
          <section className="flex flex-col gap-2">
            <h4 className="text-xs uppercase tracking-wide text-[rgba(164,190,123,0.8)]">Sent by you</h4>
            {outgoing.map((invitation) => (
              <OutgoingInvitationRow key={invitation.id} invitation={invitation} />
            ))}
          </section>
        )}
      </div>
    </Modal>
  );
}

interface IncomingInvitationRowProps {
  invitation: PendingInvitationDto;
  expired: boolean;
  busy: boolean;
  onRespond: (invitation: PendingInvitationDto, action: "accept" | "reject") => void;
}

function IncomingInvitationRow({ invitation, expired, busy, onRespond }: IncomingInvitationRowProps) {
  const inviterQuery = useUser(invitation.inviterId);
  const inviter = inviterQuery.data?.username ?? "Someone";

  return (
    <div className="rounded-xl border border-[rgba(164,190,123,0.2)] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[var(--color-parchment)]">
          {inviter} invited you to <RoomLabel roomName={invitation.roomName} />
        </span>
        <span className="text-[10px] text-[rgba(164,190,123,0.6)]">
          {new Date(invitation.sentAt).toLocaleString()}
        </span>
      </div>
      {expired ? (
        <div className="mt-2 rounded-lg border border-[rgba(163,124,44,0.5)] bg-[rgba(163,124,44,0.15)] px-3 py-2 text-xs text-[rgba(233,196,106,0.95)]">
          This invitation has expired. It can no longer be accepted — ask the group admin to invite
          you again.
        </div>
      ) : (
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onRespond(invitation, "reject")}
            disabled={busy}
            className="rounded-lg border border-[rgba(164,190,123,0.35)] px-2 py-1 text-xs text-[var(--color-parchment)] disabled:opacity-60"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onRespond(invitation, "accept")}
            disabled={busy}
            className="rounded-lg bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-2 py-1 text-xs font-semibold text-[var(--color-parchment)] disabled:opacity-60"
          >
            {busy ? "Working…" : "Accept"}
          </button>
        </div>
      )}
    </div>
  );
}

function OutgoingInvitationRow({ invitation }: { invitation: PendingInvitationDto }) {
  const invitedQuery = useUser(invitation.invitedId);
  const invited = invitedQuery.data?.username ?? "Someone";

  return (
    <div className="rounded-xl border border-[rgba(164,190,123,0.2)] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-[var(--color-parchment)]">
          You invited {invited} to <RoomLabel roomName={invitation.roomName} />
        </span>
        <span className="text-[10px] text-[rgba(164,190,123,0.6)]">
          {new Date(invitation.sentAt).toLocaleString()}
        </span>
      </div>
      <div className="mt-2 flex justify-end">
        <span className="rounded-lg border border-[rgba(164,190,123,0.25)] px-2 py-1 text-[10px] uppercase tracking-wide text-[rgba(164,190,123,0.85)]">
          Pending
        </span>
      </div>
    </div>
  );
}
