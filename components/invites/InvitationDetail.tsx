"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, MailPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAcceptInvitation, usePendingInvitations, useRejectInvitation } from "@/hooks/useInvitations";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/Toast";
import { MainPane } from "@/components/layout/MainPane";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { buttonClasses } from "@/components/ui/Button";
import { errorMessage } from "@/lib/errors";
import { formatRelative, formatUntil, isPast } from "@/lib/time";
import { roomHref } from "@/lib/appRoute";

/**
 * The open invitation, addressed by `/app/invites/<invitationId>`.
 *
 * This is the destination notification rows already linked to: an INVITATION
 * notification carries the invitation id, so `invitationHref()` was pointing at a
 * route that did not exist and those rows 404'd. The panel beside it is the inbox, so
 * answering here updates the list without a round trip through a dialog.
 *
 * There is no endpoint that returns one invitation, so the row is read from the same
 * pending-invitation query the inbox uses — one source, no second shape.
 */
export function InvitationDetail({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const toast = useToast();
  const auth = useAuth();
  const invitationsQuery = usePendingInvitations(true);
  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();
  const [busy, setBusy] = React.useState(false);

  const invitation = (invitationsQuery.data ?? []).find((item) => item.id === invitationId) ?? null;
  const inbound = invitation?.direction === "INCOMING";
  const inviterQuery = useUser(invitation?.inviterId);
  const invitedQuery = useUser(invitation && !inbound ? invitation.invitedId : null);
  const counterparty = inbound ? inviterQuery.data : invitedQuery.data;
  const expired = invitation ? isPast(invitation.expiresAt) : false;
  const isMine = auth.session?.userId
    ? invitation?.invitedId === auth.session.userId || invitation?.inviterId === auth.session.userId
    : false;

  async function respond(action: "accept" | "reject") {
    if (!invitation || busy) return;
    setBusy(true);
    try {
      if (action === "accept") {
        const accepted = await acceptMutation.mutateAsync(invitation.id);
        toast.push("Invitation accepted.", "success");
        // Accepting adds you to the room, so the useful place to be is the room.
        router.push(roomHref(accepted?.roomId ?? invitation.roomId));
      } else {
        await rejectMutation.mutateAsync(invitation.id);
        toast.push("Invitation declined.", "info");
        router.push("/app/invites");
      }
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  if (invitationsQuery.isLoading) {
    return (
      <MainPane>
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </MainPane>
    );
  }

  if (invitationsQuery.isError) {
    return (
      <MainPane>
        <ErrorBlock
          title="Couldn't load this invitation"
          reason="The invitation inbox did not come back from the server."
          onRetry={() => void invitationsQuery.refetch()}
        />
      </MainPane>
    );
  }

  if (!invitation) {
    return (
      <MainPane>
        <EmptyState
          tone="pane"
          className="m-auto"
          icon={<MailPlus size={22} strokeWidth={1.75} />}
          title="This invitation is no longer pending"
          description="It was accepted, declined or expired. The inbox shows what is still open."
          action={
            <Link
              href="/app/invites"
              className={buttonClasses({ variant: "secondary", size: "md", tone: "pane" })}
            >
              Back to invites
            </Link>
          }
        />
      </MainPane>
    );
  }

  const roomName = invitation.roomName ?? "a room";
  const name = counterparty?.username ?? "someone";

  return (
    <MainPane>
      <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[var(--app-pane-divider)] px-6">
        {/* The pane is the whole screen below `md`, so it carries its own way back. */}
        <Link
          href="/app/invites"
          aria-label="Back to invites"
          className="focus-ring-light flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--app-pane-text-soft)] md:hidden"
        >
          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <h2 className="font-ui text-[20px] font-semibold text-[var(--app-pane-text)]">
          Invitation
        </h2>
      </header>

      <div className="app-scroll-light min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={roomName} seed={invitation.roomId} size={96} presenceRing="var(--app-pane)" />
            <div className="min-w-0">
              <h3 className="truncate font-ui text-[24px] font-semibold text-[var(--app-pane-text)]">
                {roomName}
              </h3>
              <p className="font-ui text-sm text-[var(--app-pane-text-soft)]">
                {inbound ? `Invited by @${name}` : `Waiting on @${name}`}
              </p>
            </div>
          </div>

          {!expired && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-ui text-[13px] text-[var(--app-pane-text-soft)]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={16} strokeWidth={1.75} aria-hidden="true" />
                Sent {formatRelative(invitation.sentAt)}
              </span>
              <span>Expires {formatUntil(invitation.expiresAt)}</span>
            </p>
          )}

          {expired && (
            <p
              role="status"
              className="rounded-[var(--radius-control)] border border-[rgba(224,165,59,0.4)] bg-[rgba(224,165,59,0.12)] px-4 py-3 font-ui text-[13px] text-[var(--app-pane-text)]"
            >
              This invitation expired. Ask {inbound ? `@${name}` : "the room's owner"} for a new
              one.
            </p>
          )}

          {inbound && !expired && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void respond("accept")}
                disabled={busy}
                className={buttonClasses({ variant: "primary", size: "md", tone: "pane" })}
              >
                {busy ? "Working…" : "Accept and open chat"}
              </button>
              <button
                type="button"
                onClick={() => void respond("reject")}
                disabled={busy}
                className={buttonClasses({ variant: "secondary", size: "md", tone: "pane" })}
              >
                Decline
              </button>
            </div>
          )}

          {!inbound && !expired && (
            <p className="font-ui text-[15px] text-[var(--app-pane-text)]">
              You are waiting for {invitedQuery.data ? `@${name}` : "the recipient"} to answer.
            </p>
          )}

          {isMine && !expired && !inbound && (
            <p className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">
              You can cancel an invitation by declining it from the inbox.
            </p>
          )}

          <p className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">
            <Link href="/app/invites" className="focus-ring-light rounded underline">
              Back to invites
            </Link>
          </p>
        </div>
      </div>
    </MainPane>
  );
}
