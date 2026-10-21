"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  BellOff,
  Copy,
  MessageSquare,
  Search,
  Settings,
  Shield,
  ShieldOff,
  UserMinus,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { IconButton } from "@/components/ui/IconButton";
import { Popover, popoverItemClasses } from "@/components/ui/Popover";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useConnections } from "@/hooks/useConnections";
import { useBlockedUserIds, useBlockUser, useUnblockUser } from "@/hooks/useBlocks";
import { participantsQueryKey } from "@/hooks/useMessages";
import { connectionHref, roomHref } from "@/lib/appRoute";
import { errorMessage } from "@/lib/errors";
import {
  GROUP_INFO_MEMBER_PREVIEW,
  groupInfoHeadingId,
  groupInfoSectionId,
  memberManagementPermissions,
} from "@/lib/groupInfo";
import { createRoom, removeParticipant, updateParticipant } from "@/lib/services/rooms";
import { connectUser } from "@/lib/services/users";
import { ParticipantResponse, ParticipantRole, PublicUserDto } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MemberSectionProps {
  roomId: string;
  callerRole: ParticipantRole;
  currentUserId: string | null;
  participants: ParticipantResponse[];
  nameOf: (participant: ParticipantResponse) => string;
  profileOf: (userId: string) => PublicUserDto | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  canInvite: boolean;
  searchOpen: boolean;
  onToggleSearch: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  onAddMembers: () => void;
}

export function MemberSection({
  roomId,
  callerRole,
  currentUserId,
  participants,
  nameOf,
  profileOf,
  loading,
  error,
  onRetry,
  canInvite,
  searchOpen,
  onToggleSearch,
  query,
  onQueryChange,
  onAddMembers,
}: MemberSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const needle = query.trim().toLowerCase();
  const matching = useMemo(() => {
    if (!needle) return participants;
    return participants.filter((participant) => {
      const name = nameOf(participant).toLowerCase();
      const handle = `@${name}`;
      return name.includes(needle) || handle.includes(needle);
    });
  }, [nameOf, needle, participants]);

  const hiddenCount = Math.max(participants.length - GROUP_INFO_MEMBER_PREVIEW, 0);
  const showAll = expanded || Boolean(needle);
  const visible = showAll
    ? matching
    : matching.slice(0, GROUP_INFO_MEMBER_PREVIEW);
  const moreCount = Math.max(matching.length - visible.length, 0);

  return (
    <section
      id={groupInfoSectionId("members")}
      aria-labelledby={groupInfoHeadingId("members")}
      className="scroll-mt-[60px]"
    >
      <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-4">
        <h3
          id={groupInfoHeadingId("members")}
          tabIndex={-1}
          className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)] focus:outline-none"
        >
          {participants.length} member{participants.length === 1 ? "" : "s"}
        </h3>
        <IconButton
          surface="pane"
          size="sm"
          touch
          label="Search members"
          tooltip="Search members"
          tooltipSide="bottom-end"
          aria-expanded={searchOpen}
          onClick={onToggleSearch}
        >
          {searchOpen ? (
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          )}
        </IconButton>
      </div>

      {searchOpen && (
        <div className="px-4 pb-2">
          <SearchInput
            id="group-info-member-search"
            tone="light"
            value={query}
            onValueChange={onQueryChange}
            placeholder="Search by name or @username"
            aria-label="Search members"
          />
        </div>
      )}

      {canInvite && (
        <div className="px-2">
          <button
            type="button"
            onClick={onAddMembers}
            className="focus-ring-light flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] px-2 text-left transition-colors duration-150 motion-reduce:transition-none hover:bg-[var(--app-pane-hover)]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-parchment)]">
              <UserPlus size={20} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
              Add members
            </span>
          </button>
        </div>
      )}

      {loading && participants.length === 0 ? (
        <div className="flex flex-col gap-1 px-4 py-1">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : error && participants.length === 0 ? (
        <ErrorBlock
          tone="pane"
          title="Could not load members"
          reason="The member list is unavailable right now."
          onRetry={onRetry}
        />
      ) : visible.length === 0 ? (
        <p className="px-4 py-6 text-center font-ui text-[13px] text-[var(--app-pane-text-soft)]">
          {needle ? `No members match “${query.trim()}”.` : "No members yet."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {visible.map((participant) => (
            <MemberRow
              key={participant.id}
              participant={participant}
              profile={profileOf(participant.userId)}
              name={nameOf(participant)}
              isSelf={participant.userId === currentUserId}
              callerRole={callerRole}
              currentUserId={currentUserId}
              roomId={roomId}
            />
          ))}
        </ul>
      )}

      {!needle && !expanded && hiddenCount > 0 && moreCount > 0 && (
        <div className="px-4">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="focus-ring-light flex min-h-11 w-full items-center rounded-[var(--radius-control)] text-left font-ui text-[14px] font-medium text-[var(--color-forest)] hover:underline"
          >
            See all ({moreCount} more)
          </button>
        </div>
      )}
    </section>
  );
}

interface MemberRowProps {
  participant: ParticipantResponse;
  profile?: PublicUserDto;
  name: string;
  isSelf: boolean;
  callerRole: ParticipantRole;
  currentUserId: string | null;
  roomId: string;
}

function MemberRow({
  participant,
  profile,
  name,
  isSelf,
  callerRole,
  currentUserId,
  roomId,
}: MemberRowProps) {
  const isOwner = participant.role === "OWNER";
  const isAdmin = participant.role === "ADMIN";

  const identity = (
    <>
      <Avatar
        name={name}
        seed={participant.userId}
        src={profile?.profilePictureUrl}
        size={40}
        presenceRing="var(--app-pane)"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
            {name}
          </span>
          {isSelf && (
            <span className="shrink-0 font-ui text-[12px] text-[var(--app-pane-text-soft)]">
              (you)
            </span>
          )}
        </span>
        <span className="block truncate font-ui text-[13px] text-[var(--app-pane-text-soft)]">
          @{name}
        </span>
      </span>
    </>
  );

  return (
    <li className="flex min-h-14 items-center gap-1.5 px-2">
      {isSelf ? (
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-2">{identity}</div>
      ) : (
        <Link
          href={connectionHref(participant.userId)}
          className="focus-ring-light flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-control)] px-2 transition-colors duration-150 motion-reduce:transition-none hover:bg-[var(--app-pane-hover)]"
        >
          {identity}
        </Link>
      )}

      {(isOwner || isAdmin) && (
        <span className="shrink-0 rounded-full border border-[var(--app-pane-control-border)] px-2 py-0.5 font-ui text-[11px] font-medium text-[var(--app-pane-text-soft)]">
          {isOwner ? "Owner" : "Admin"}
        </span>
      )}

      {participant.isMuted && (
        <BellOff
          size={14}
          strokeWidth={1.75}
          aria-label="Muted in this group"
          className="shrink-0 text-[var(--app-pane-text-soft)]"
        />
      )}

      <MemberMenu
        participant={participant}
        name={name}
        isSelf={isSelf}
        callerRole={callerRole}
        currentUserId={currentUserId}
        roomId={roomId}
      />
    </li>
  );
}

function MemberMenu({
  participant,
  name,
  isSelf,
  callerRole,
  currentUserId,
  roomId,
}: Omit<MemberRowProps, "profile">) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<null | "remove" | "block">(null);

  const connections = useConnections(true);
  const blocked = useBlockedUserIds(currentUserId);
  const blockUser = useBlockUser(currentUserId);
  const unblockUser = useUnblockUser(currentUserId);

  const connected = (connections.data ?? []).some(
    (connection) =>
      connection.otherUserId === participant.userId && connection.status === "ACCEPTED"
  );
  const isBlocked = (blocked.data ?? []).includes(participant.userId);

  const permissions = memberManagementPermissions(callerRole, participant.role, isSelf);

  const invalidateParticipants = () =>
    queryClient.invalidateQueries({ queryKey: participantsQueryKey(roomId) });

  async function run(
    key: string,
    action: () => Promise<unknown>,
    success: string,
    after?: () => Promise<unknown>
  ): Promise<void> {
    setBusy(key);
    try {
      await action();
      toast.push(success, "success");
      setOpen(false);
      if (after) await after();
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setBusy(null);
    }
  }

  async function message(): Promise<void> {
    setBusy("message");
    try {
      const room = await createRoom({ type: "DIRECT", participantIds: [participant.userId] });
      setOpen(false);
      window.location.assign(roomHref(room.id));
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setBusy(null);
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')
    );
    if (items.length === 0) return;
    event.preventDefault();
    const active = document.activeElement;
    const index = items.findIndex((item) => item === active);
    let next = 0;
    if (event.key === "End") next = items.length - 1;
    else if (event.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % items.length;
    else if (event.key === "ArrowUp")
      next = index <= 0 ? items.length - 1 : index - 1;
    items[next]?.focus({ preventScroll: true });
  }

  const itemClass = (key?: string, danger = false) =>
    popoverItemClasses({
      danger,
      className: cn(
        busy !== null && "pointer-events-none",
        busy === key && "opacity-60"
      ),
    });

  const management = permissions.canToggleAdmin || permissions.canMute;
  const social = !isSelf;

  return (
    <>
      <IconButton
        ref={setTrigger}
        surface="pane"
        size="sm"
        touch
        label={`Member options for ${name}`}
        tooltip="Member options"
        tooltipSide="bottom-end"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Settings size={16} strokeWidth={1.75} aria-hidden="true" />
      </IconButton>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={trigger}
        label={`Member options for ${name}`}
        role="menu"
        align="end"
      >
        <div role="none" onKeyDown={handleMenuKeyDown}>
          {permissions.canToggleAdmin && (
            <button
              type="button"
              role="menuitem"
              disabled={busy !== null}
              className={itemClass("role")}
              onClick={() =>
                void run(
                  "role",
                  () =>
                    updateParticipant(roomId, participant.userId, {
                      role: participant.role === "ADMIN" ? "GUEST" : "ADMIN",
                    }),
                  participant.role === "ADMIN"
                    ? `${name} is no longer an admin.`
                    : `${name} is now an admin.`,
                  invalidateParticipants
                )
              }
            >
              {participant.role === "ADMIN" ? (
                <ShieldOff size={16} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Shield size={16} strokeWidth={1.75} aria-hidden="true" />
              )}
              {participant.role === "ADMIN" ? "Remove admin" : "Make admin"}
            </button>
          )}

          {permissions.canMute && (
            <button
              type="button"
              role="menuitem"
              disabled={busy !== null}
              className={itemClass("mute")}
              onClick={() =>
                void run(
                  "mute",
                  () =>
                    updateParticipant(roomId, participant.userId, {
                      isMuted: !participant.isMuted,
                    }),
                  participant.isMuted
                    ? `${name} can send messages again.`
                    : `${name} can no longer send messages.`,
                  invalidateParticipants
                )
              }
            >
              <BellOff size={16} strokeWidth={1.75} aria-hidden="true" />
              {participant.isMuted ? "Unmute" : "Mute"}
            </button>
          )}

          {management && social && (
            <div className="my-1 h-px bg-[var(--app-pane-divider)]" role="separator" />
          )}

          {social && (
            <button
              type="button"
              role="menuitem"
              disabled={busy !== null}
              className={itemClass("message")}
              onClick={() => void message()}
            >
              <MessageSquare size={16} strokeWidth={1.75} aria-hidden="true" />
              Message
            </button>
          )}

          {social && (
            <Link
              href={connectionHref(participant.userId)}
              role="menuitem"
              className={popoverItemClasses({
                className: busy !== null ? "pointer-events-none" : undefined,
              })}
              onClick={() => setOpen(false)}
            >
              <UserRound size={16} strokeWidth={1.75} aria-hidden="true" />
              View profile
            </Link>
          )}

          {social && !connected && (
            <button
              type="button"
              role="menuitem"
              disabled={busy !== null}
              className={itemClass("connect")}
              onClick={() =>
                void run(
                  "connect",
                  () => connectUser(participant.userId),
                  `Connection request sent to ${name}.`,
                  () => queryClient.invalidateQueries({ queryKey: ["connections", "pending"] })
                )
              }
            >
              <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" />
              Add as connection
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            disabled={busy !== null}
            className={itemClass("copy")}
            onClick={async () => {
              setBusy("copy");
              try {
                await navigator.clipboard.writeText(`@${name}`);
                toast.push("Username copied.", "success");
              } catch {
                toast.push("Could not copy the username.", "error");
              } finally {
                setBusy(null);
                setOpen(false);
              }
            }}
          >
            <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
            Copy username
          </button>

          {!isSelf && (
            <div className="my-1 h-px bg-[var(--app-pane-divider)]" role="separator" />
          )}

          {permissions.canRemove && (
            <button
              type="button"
              role="menuitem"
              disabled={busy !== null}
              className={itemClass("remove", true)}
              onClick={() => {
                setOpen(false);
                setConfirming("remove");
              }}
            >
              <UserMinus size={16} strokeWidth={1.75} aria-hidden="true" />
              Remove from group
            </button>
          )}

          {social && (
            <button
              type="button"
              role="menuitem"
              disabled={busy !== null}
              className={itemClass("block", true)}
              onClick={() => {
                setOpen(false);
                if (isBlocked) {
                  void run(
                    "block",
                    () => unblockUser.mutateAsync(participant.userId),
                    `${name} is unblocked.`,
                    invalidateParticipants
                  );
                } else {
                  setConfirming("block");
                }
              }}
            >
              <Ban size={16} strokeWidth={1.75} aria-hidden="true" />
              {isBlocked ? "Unblock" : "Block"}
            </button>
          )}
        </div>
      </Popover>

      <ConfirmDialog
        open={confirming === "remove"}
        title={`Remove ${name} from the group?`}
        description="They lose access to the conversation and its history. You can invite them again."
        confirmLabel="Remove"
        danger
        onConfirm={() => {
          setConfirming(null);
          void run(
            "remove",
            () => removeParticipant(roomId, participant.userId),
            `${name} was removed from the group.`,
            invalidateParticipants
          );
        }}
        onCancel={() => setConfirming(null)}
      />

      <ConfirmDialog
        open={confirming === "block"}
        title={`Block ${name}?`}
        description="They will not be able to message you, and this conversation will be shown as blocked."
        confirmLabel="Block"
        danger
        onConfirm={() => {
          setConfirming(null);
          void run(
            "block",
            () => blockUser.mutateAsync(participant.userId),
            `${name} is blocked.`,
            invalidateParticipants
          );
        }}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
