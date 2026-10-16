"use client";

import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MailPlus } from "lucide-react";
import {
  SegmentedControl,
  segmentedPanelId,
  segmentedTabId,
} from "@/components/ui/SegmentedControl";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { useToast } from "@/components/ui/Toast";
import {
  pendingInvitationsQueryKey,
  useAcceptInvitation,
  usePendingInvitations,
  useRejectInvitation,
} from "@/hooks/useInvitations";
import { useUser } from "@/hooks/useUser";
import { errorMessage, isApiError } from "@/lib/errors";
import { formatRelative } from "@/lib/time";
import { PendingInvitationDto } from "@/lib/types";

type Segment = "pending" | "sent";

const SEGMENTS_ID = "invites-segments";

function isExpired(invitation: PendingInvitationDto): boolean {
  const expiresAt = Date.parse(invitation.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

/**
 * Zone two for the Invites destination.
 *
 * The inbox is server-truth: `GET /invitations/pending` returns the caller's
 * PENDING invitations in *both* directions, with the room name and the inviter, so
 * the sender's and the recipient's views are the same rows seen from two sides and
 * answering one flips its stored status for both. There is no endpoint that lists
 * accepted, declined or expired invitations, so there is no "Past" segment here —
 * that gap is reported rather than filled with client-side guesswork.
 */
export function InvitesPanel({ hideOnNarrow }: { hideOnNarrow?: boolean }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const invitationsQuery = usePendingInvitations(true);
  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();
  const [segment, setSegment] = useState<Segment>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expiredIds, setExpiredIds] = useState<Record<string, boolean>>({});

  const invitations = useMemo(() => invitationsQuery.data ?? [], [invitationsQuery.data]);
  const incoming = invitations.filter((invitation) => invitation.direction === "INCOMING");
  const outgoing = invitations.filter((invitation) => invitation.direction === "OUTGOING");

  async function respond(invitation: PendingInvitationDto, action: "accept" | "reject") {
    if (busyId === invitation.id) return;
    setBusyId(invitation.id);
    try {
      if (action === "accept") {
        await acceptMutation.mutateAsync(invitation.id);
        toast.push("Invitation accepted.", "success");
      } else {
        await rejectMutation.mutateAsync(invitation.id);
        toast.push("Invitation declined.", "info");
      }
    } catch (error) {
      if (isApiError(error) && error.kind === "invitation-expired") {
        // Still stored as PENDING but past its TTL: keep the row and mark it
        // non-actionable instead of leaving buttons that cannot work.
        setExpiredIds((previous) => ({ ...previous, [invitation.id]: true }));
        toast.push(errorMessage(error), "info");
      } else if (
        isApiError(error) &&
        (error.kind === "not-found" || error.code === "INVITATION_ALREADY_HANDLED")
      ) {
        toast.push(errorMessage(error), "info");
        void queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
      } else {
        toast.push(errorMessage(error), "error");
      }
    } finally {
      setBusyId(null);
    }
  }

  const segments = [
    { value: "pending" as const, label: "Pending", count: incoming.length },
    { value: "sent" as const, label: "Sent", count: outgoing.length },
  ];

  return (
    <SectionPanel
      title="Invites"
      hideOnNarrow={hideOnNarrow}
      toolbar={
        <SegmentedControl
          idBase={SEGMENTS_ID}
          label="Invitation sections"
          options={segments}
          value={segment}
          onChange={setSegment}
        />
      }
    >
      <div
        role="tabpanel"
        id={segmentedPanelId(SEGMENTS_ID)}
        aria-labelledby={segmentedTabId(SEGMENTS_ID, segment)}
        tabIndex={-1}
        className="focus-ring rounded-xl"
      >
        {invitationsQuery.isLoading && invitations.length === 0 ? (
          <div className="flex flex-col gap-1 px-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : invitationsQuery.isError ? (
          <ErrorBlock
            title="Couldn't load invitations"
            reason="The invitation inbox did not come back from the server."
            onRetry={() => void invitationsQuery.refetch()}
          />
        ) : (
          <ul className="flex flex-col gap-1 px-1">
            {(segment === "pending" ? incoming : outgoing).map((invitation) => (
              <li key={invitation.id}>
                <InvitationRow
                  invitation={invitation}
                  inbound={segment === "pending"}
                  expired={Boolean(expiredIds[invitation.id]) || isExpired(invitation)}
                  busy={busyId === invitation.id}
                  onRespond={(action) => void respond(invitation, action)}
                />
              </li>
            ))}
            {(segment === "pending" ? incoming : outgoing).length === 0 && (
              <li>
                <EmptyState
                  icon={<MailPlus size={22} strokeWidth={1.75} />}
                  title={segment === "pending" ? "No pending invitations" : "Nothing sent yet"}
                  description={
                    segment === "pending"
                      ? "Invitations people send you will appear here."
                      : "Invitations you send from a room's details will appear here."
                  }
                />
              </li>
            )}
          </ul>
        )}
      </div>
    </SectionPanel>
  );
}

function InvitationRow({
  invitation,
  inbound,
  expired,
  busy,
  onRespond,
}: {
  invitation: PendingInvitationDto;
  inbound: boolean;
  expired: boolean;
  busy: boolean;
  onRespond: (action: "accept" | "reject") => void;
}) {
  const inviterQuery = useUser(invitation.inviterId);
  const invitedQuery = useUser(inbound ? null : invitation.invitedId);
  const roomName = invitation.roomName ?? "a room";
  const name = (inbound ? inviterQuery.data?.username : invitedQuery.data?.username) ?? "someone";

  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-control)] px-2 py-2">
      <Avatar name={roomName} seed={invitation.roomId} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-ui text-[15px] font-medium text-[var(--app-panel-text)]">
          {roomName}
        </p>
        <p className="truncate font-ui text-xs text-[var(--app-panel-text-soft)]">
          {inbound ? `Invited by @${name}` : `Waiting on @${name}`} · {formatRelative(invitation.sentAt)}
        </p>
        {expired && inbound && (
          <p className="mt-1 font-ui text-xs font-medium text-[var(--app-danger-on-dark)]">
            This invitation has expired.
          </p>
        )}
        {inbound && !expired && (
          <span className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onRespond("accept")}
              disabled={busy}
              className="focus-ring h-8 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-2.5 font-ui text-xs font-semibold text-[var(--color-parchment)] disabled:opacity-60"
            >
              {busy ? "Working…" : "Accept"}
            </button>
            <button
              type="button"
              onClick={() => onRespond("reject")}
              disabled={busy}
              className="focus-ring h-8 rounded-[var(--radius-control)] border border-[var(--app-panel-field-border)] px-2.5 font-ui text-xs text-[var(--app-panel-text)] disabled:opacity-60"
            >
              Decline
            </button>
          </span>
        )}
      </div>

    </div>
  );
}
