"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Check, MailPlus, X } from "lucide-react";
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
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import {
  pendingInvitationsQueryKey,
  useAcceptInvitation,
  usePendingInvitations,
  useRejectInvitation,
} from "@/hooks/useInvitations";
import { useUser } from "@/hooks/useUser";
import { errorMessage, isApiError } from "@/lib/errors";
import { formatRelative, isPast } from "@/lib/time";
import { invitationHref } from "@/lib/appRoute";
import { cn } from "@/lib/utils";
import { PendingInvitationDto } from "@/lib/types";

type Segment = "pending" | "sent";

const SEGMENTS_ID = "invites-segments";

function isExpired(invitation: PendingInvitationDto): boolean {
  return isPast(invitation.expiresAt);
}

export function InvitesPanel({
  hideOnNarrow,
  activeInvitationId,
}: {
  hideOnNarrow?: boolean;
  activeInvitationId?: string | null;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const invitationsQuery = usePendingInvitations(true);
  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();
  const [segmentOverride, setSegmentOverride] = useState<{ id: string | null; value: Segment } | null>(
    null
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expiredIds, setExpiredIds] = useState<Record<string, boolean>>({});

  const invitations = useMemo(() => invitationsQuery.data ?? [], [invitationsQuery.data]);
  const incoming = invitations.filter((invitation) => invitation.direction === "INCOMING");
  const outgoing = invitations.filter((invitation) => invitation.direction === "OUTGOING");

  const activeInvitation = invitations.find((invitation) => invitation.id === activeInvitationId);
  const derivedSegment: Segment = activeInvitation?.direction === "OUTGOING" ? "sent" : "pending";
  const segment: Segment =
    segmentOverride && segmentOverride.id === (activeInvitationId ?? null)
      ? segmentOverride.value
      : derivedSegment;

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
        setExpiredIds((previous) => ({ ...previous, [invitation.id]: true }));
        toast.push(errorMessage(error), "warning");
      } else if (
        isApiError(error) &&
        (error.kind === "not-found" || error.code === "INVITATION_ALREADY_HANDLED")
      ) {
        toast.push(errorMessage(error), "warning");
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
          onChange={(value) => setSegmentOverride({ id: activeInvitationId ?? null, value })}
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
                  active={invitation.id === activeInvitationId}
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
  active,
  onRespond,
}: {
  invitation: PendingInvitationDto;
  inbound: boolean;
  expired: boolean;
  busy: boolean;
  active: boolean;
  onRespond: (action: "accept" | "reject") => void;
}) {
  const inviterQuery = useUser(invitation.inviterId);
  const invitedQuery = useUser(inbound ? null : invitation.invitedId);
  const roomName = invitation.roomName ?? "a room";
  const name = (inbound ? inviterQuery.data?.username : invitedQuery.data?.username) ?? "someone";

  return (
    <div
      className={cn(
        "relative flex items-center gap-1 rounded-[var(--radius-control)] transition-colors duration-150 motion-reduce:transition-none",
        active ? "bg-[var(--app-panel-active)]" : "hover:bg-[var(--app-panel-hover)]"
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-sage)]"
        />
      )}
      <Link
        href={invitationHref(invitation.id)}
        aria-current={active ? "page" : undefined}
        className="focus-ring flex min-w-0 flex-1 items-start gap-3 rounded-[var(--radius-control)] px-2 py-2"
      >
        <Avatar name={roomName} seed={invitation.roomId} size={48} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-ui text-[15px] font-medium text-[var(--app-panel-text)]">
            {roomName}
          </span>
          <span className="block truncate font-ui text-xs text-[var(--app-panel-text-soft)]">
            {inbound ? `Invited by @${name}` : `Waiting on @${name}`} ·{" "}
            {formatRelative(invitation.sentAt)}
          </span>
          {expired && inbound && (
            <span className="mt-1 block font-ui text-xs font-medium text-[var(--app-danger-on-dark)]">
              This invitation has expired.
            </span>
          )}
        </span>
      </Link>

      {inbound && !expired && (
        <span className="flex shrink-0 items-center gap-0.5 pr-1.5">
          <IconButton
            surface="panel"
            size="sm"
            label={`Accept invitation to ${roomName}`}
            tooltip="Accept"
            disabled={busy}
            onClick={() => onRespond("accept")}
          >
            <Check size={16} strokeWidth={2} aria-hidden="true" />
          </IconButton>
          <IconButton
            surface="panel"
            size="sm"
            tone="danger"
            label={`Decline invitation to ${roomName}`}
            tooltip="Decline"
            disabled={busy}
            onClick={() => onRespond("reject")}
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </IconButton>
        </span>
      )}
    </div>
  );
}
