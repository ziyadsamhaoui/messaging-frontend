"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Hourglass, MailPlus, Users } from "lucide-react";
import {
  useAcceptInvitation,
  usePendingInvitations,
  useRejectInvitation,
  useResendInvitation,
} from "@/hooks/useInvitations";
import { useRoomParticipants } from "@/hooks/useMessages";
import { useRoom } from "@/hooks/useRooms";
import { useUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/Toast";
import { MainPane } from "@/components/layout/MainPane";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { buttonClasses } from "@/components/ui/Button";
import { errorMessage } from "@/lib/errors";
import { formatUntil, isPast } from "@/lib/time";
import { connectionHref, roomHref } from "@/lib/appRoute";
import { cn } from "@/lib/utils";


const ONE_HOUR_MS = 60 * 60 * 1000;

const SCROLL_CLASS =
  "app-scroll-light min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-4 md:px-6 md:pb-12 md:pt-12";

const CARD_CLASS =
  "flex w-full max-w-[560px] flex-col gap-6 rounded-2xl border border-[rgba(40,84,48,0.12)] bg-[var(--app-pane-raised)] p-6 shadow-[0_18px_40px_-24px_rgba(4,16,8,0.45)]";

const DANGER_OUTLINE_CLASS =
  "focus-ring-light inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--app-danger-on-light)] bg-transparent px-4 font-ui text-sm font-semibold text-[var(--app-danger-on-light)] transition-colors duration-200 hover:bg-[rgba(143,42,27,0.08)] active:bg-[rgba(143,42,27,0.16)] disabled:cursor-not-allowed disabled:opacity-50 md:h-[var(--control-height-md)] md:w-auto md:min-w-[160px]";

const ACTION_SIZE_CLASS = "h-11 w-full md:h-[var(--control-height-md)] md:w-auto md:min-w-[160px]";

function useNow(intervalMs: number) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function exactTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function sentDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function lifetimePercent(sentAt: string, expiresAt: string, now: number): number {
  const start = new Date(sentAt).getTime();
  const end = new Date(expiresAt).getTime();
  const total = end - start;
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, ((end - now) / total) * 100));
}

function GroupMark({
  name,
  seed,
  size,
  className,
}: {
  name: string;
  seed: string;
  size: 72 | 88;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <Avatar name={name} seed={seed} size={size} presenceRing="var(--app-pane-raised)" />
      <span
        aria-hidden="true"
        className={cn(
          "absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-2 border-[var(--app-pane-raised)] bg-[var(--color-forest)] text-[var(--color-parchment)]",
          size === 88 ? "h-8 w-8" : "h-7 w-7"
        )}
      >
        <Users size={14} strokeWidth={2} />
      </span>
    </span>
  );
}

function StatusPill({ expired }: { expired: boolean }) {
  if (expired) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(60,60,54,0.16)] px-3 py-1 font-ui text-[13px] font-semibold text-[#3E3D37]">
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(224,165,59,0.24)] px-3 py-1 font-ui text-[13px] font-semibold text-[#6B4500]">
      <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-[#B7791F]" />
      Pending
    </span>
  );
}

export function InvitationDetail({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const toast = useToast();
  const invitationsQuery = usePendingInvitations(true);
  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();
  const resendMutation = useResendInvitation();
  const [busy, setBusy] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const now = useNow(30_000);

  const invitation = (invitationsQuery.data ?? []).find((item) => item.id === invitationId) ?? null;
  const inbound = invitation?.direction === "INCOMING";
  const inviterQuery = useUser(invitation?.inviterId);
  const invitedQuery = useUser(invitation && !inbound ? invitation.invitedId : null);
  const counterparty = inbound ? inviterQuery.data : invitedQuery.data;
  const membersQuery = useRoomParticipants(invitation && !inbound ? invitation.roomId : null);
  const roomQuery = useRoom(invitation?.roomId);
  const creatorQuery = useUser(roomQuery.data?.createdBy);
  const expired = invitation ? isPast(invitation.expiresAt) : false;

  async function respond(action: "accept" | "reject") {
    if (!invitation || busy) return;
    setBusy(true);
    try {
      if (action === "accept") {
        const accepted = await acceptMutation.mutateAsync(invitation.id);
        toast.push("Invitation accepted.", "success");
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

  async function cancelInvitation() {
    if (!invitation || busy) return;
    setBusy(true);
    try {
      await rejectMutation.mutateAsync(invitation.id);
      toast.push("Invitation cancelled.", "info");
      router.push("/app/invites");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  async function sendAgain() {
    if (!invitation || busy) return;
    setBusy(true);
    try {
      await resendMutation.mutateAsync({
        roomId: invitation.roomId,
        invitedUserId: invitation.invitedId,
      });
      toast.push("Invitation sent again.", "success");
      router.push("/app/invites");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setBusy(false);
    }
  }

  if (invitationsQuery.isLoading) {
    return (
      <MainPane>
        <div className={SCROLL_CLASS}>
          <div
            role="status"
            aria-label="Loading invitation"
            className={cn(CARD_CLASS, "mx-auto")}
          >
            <div className="flex items-center gap-4">
              <Skeleton className="h-[72px] w-[72px] shrink-0 rounded-full md:h-[88px] md:w-[88px]" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="h-11 w-full" />
          </div>
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
  const who = counterparty ? `@${counterparty.username}` : null;
  const expiresSoon = !expired && invitation.expiresAt
    ? new Date(invitation.expiresAt).getTime() - now < ONE_HOUR_MS
    : false;
  const percent = lifetimePercent(invitation.sentAt, invitation.expiresAt, now);
  const memberCount = membersQuery.data ? membersQuery.data.items.length : null;
  const memberLabel =
    memberCount === null
      ? null
      : `${memberCount}${membersQuery.data?.hasMore ? "+" : ""} ${memberCount === 1 ? "member" : "members"}`;
  const expiryText = expired
    ? "Expired"
    : expiresSoon
      ? `Expires soon · ${formatUntil(invitation.expiresAt)}`
      : `Expires ${formatUntil(invitation.expiresAt)}`;

  return (
    <MainPane>
      <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[var(--app-pane-divider)] px-6">
        <Link
          href="/app/invites"
          aria-label="Back to invites"
          className="focus-ring-light flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--app-pane-text-soft)] transition-colors hover:bg-[var(--app-pane-hover)] hover:text-[var(--app-pane-text)] md:hidden"
        >
          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <h2 className="font-ui text-[20px] font-semibold text-[var(--app-pane-text)]">
          Invitation
        </h2>
      </header>

      <div className={SCROLL_CLASS}>
        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
          <Link
            href="/app/invites"
            className={cn(
              buttonClasses({ variant: "ghost", size: "sm", tone: "pane" }),
              "hidden w-fit md:inline-flex"
            )}
          >
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            Back to invites
          </Link>

          <section aria-label="Invitation details" className={cn(CARD_CLASS, "invite-card-in")}>
            <div className="flex flex-col gap-4">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[rgba(40,84,48,0.1)] px-2.5 py-1 font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)]">
                <Users size={14} strokeWidth={1.75} aria-hidden="true" />
                Group invitation
              </span>
              <div className="flex items-center gap-4">
                <GroupMark name={roomName} seed={invitation.roomId} size={72} className="md:hidden" />
                <GroupMark
                  name={roomName}
                  seed={invitation.roomId}
                  size={88}
                  className="hidden md:inline-flex"
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <h3 className="break-words font-ui text-[24px] font-semibold leading-tight text-[var(--app-pane-text)]">
                    {roomName}
                  </h3>
                  <p className="font-ui text-[14px] text-[var(--app-pane-text-soft)]">
                    {inbound
                      ? `${who ?? "Someone"} invited you to join this group`
                      : `You invited ${who ?? "the recipient"} to join this group`}
                  </p>
                  {memberLabel && (
                    <p className="inline-flex items-center gap-1.5 font-ui text-[13px] text-[var(--app-pane-text-soft)]">
                      <Users size={14} strokeWidth={1.75} aria-hidden="true" />
                      {memberLabel}
                    </p>
                  )}
                  {creatorQuery.data && (
                    <p className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">
                      Created by @{creatorQuery.data.username}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-[var(--app-pane-divider)] pt-6">
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <StatusPill expired={expired} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-ui text-[13px] text-[var(--app-pane-text-soft)]">
                  <time
                    dateTime={invitation.sentAt}
                    title={exactTime(invitation.sentAt)}
                    className="inline-flex items-center gap-1.5"
                  >
                    <CalendarClock size={15} strokeWidth={1.75} aria-hidden="true" />
                    Sent {sentDay(invitation.sentAt)}
                  </time>
                  <time
                    dateTime={invitation.expiresAt}
                    title={`Expires ${exactTime(invitation.expiresAt)}`}
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      (expiresSoon || expired) && "font-semibold",
                      expiresSoon && "text-[var(--app-danger-on-light)]"
                    )}
                  >
                    <Hourglass size={15} strokeWidth={1.75} aria-hidden="true" />
                    {expiryText}
                  </time>
                </div>
              </div>

              {!expired && (
                <div
                  role="progressbar"
                  aria-label="Time left to answer"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(percent)}
                  aria-valuetext={expiryText}
                  className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(40,84,48,0.14)]"
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: expiresSoon ? "var(--app-danger-on-light)" : "var(--color-primary)",
                    }}
                  />
                </div>
              )}

              {!inbound && !expired && (
                <p className="flex flex-wrap items-center gap-x-1.5 gap-y-2 font-ui text-[15px] text-[var(--app-pane-text)]">
                  Waiting for
                  {counterparty && who ? (
                    <Link
                      href={connectionHref(invitation.invitedId)}
                      className="focus-ring-light inline-flex items-center gap-2 rounded-full border border-[var(--app-pane-control-border)] py-0.5 pl-0.5 pr-3 text-[14px] font-semibold text-[var(--app-pane-text)] transition-colors hover:bg-[var(--app-pane-hover)]"
                    >
                      <Avatar name={counterparty.username} seed={invitation.invitedId} size={28} />
                      {who}
                    </Link>
                  ) : (
                    <span>the recipient</span>
                  )}
                  to accept
                </p>
              )}

              {expired && (
                <p
                  role="status"
                  className="rounded-[var(--radius-control)] border border-[rgba(224,165,59,0.4)] bg-[rgba(224,165,59,0.12)] px-4 py-3 font-ui text-[13px] text-[var(--app-pane-text)]"
                >
                  {inbound
                    ? `This invitation expired. Ask ${who ?? "the sender"} for a new one.`
                    : `This invitation expired without an answer. Send it again to invite ${who ?? "the recipient"}.`}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-[var(--app-pane-divider)] pt-6 md:flex-row md:justify-end">
                {inbound && !expired && (
                  <>
                    <button
                      type="button"
                      onClick={() => void respond("accept")}
                      disabled={busy}
                      className={cn(buttonClasses({ variant: "primary", size: "md", tone: "pane" }), ACTION_SIZE_CLASS)}
                    >
                      {busy ? "Working…" : "Accept and open chat"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void respond("reject")}
                      disabled={busy}
                      className={cn(buttonClasses({ variant: "secondary", size: "md", tone: "pane" }), ACTION_SIZE_CLASS)}
                    >
                      Decline
                    </button>
                  </>
                )}

                {!inbound && (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmOpen(true)}
                      disabled={expired || busy}
                      className={DANGER_OUTLINE_CLASS}
                    >
                      Cancel invitation
                    </button>
                    {expired && (
                      <button
                        type="button"
                        onClick={() => void sendAgain()}
                        disabled={busy}
                        className={cn(buttonClasses({ variant: "primary", size: "md", tone: "pane" }), ACTION_SIZE_CLASS)}
                      >
                        {busy ? "Sending…" : "Send again"}
                      </button>
                    )}
                  </>
                )}
            </div>
          </section>
        </div>
      </div>

      {!inbound && (
        <ConfirmDialog
          open={confirmOpen}
          title="Cancel this invitation?"
          description={`${who ?? "The recipient"} will no longer be able to join.`}
          confirmLabel="Cancel invitation"
          cancelLabel="Keep invitation"
          danger
          busy={busy}
          onConfirm={() => void cancelInvitation()}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </MainPane>
  );
}
