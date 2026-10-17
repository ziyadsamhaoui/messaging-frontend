"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import {
  ArrowLeft,
  BellOff,
  Copy,
  LogOut,
  MessageSquare,
  Shield,
  ShieldOff,
  UserMinus,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconButton } from "@/components/ui/IconButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { UserSearchCombobox } from "@/components/ui/UserSearchCombobox";
import { buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Popover, popoverItemClasses } from "@/components/ui/Popover";
import { useToast } from "@/components/ui/Toast";
import { useConnections } from "@/hooks/useConnections";
import { useBlockedUserIds, useBlockUser, useUnblockUser } from "@/hooks/useBlocks";
import { connectionHref, roomHref } from "@/lib/appRoute";
import { pendingInvitationsQueryKey, usePendingInvitations } from "@/hooks/useInvitations";
import { participantsQueryKey, useRoomParticipants } from "@/hooks/useMessages";
import { useUser } from "@/hooks/useUser";
import { errorMessage } from "@/lib/errors";
import { createRoom, inviteToRoom, removeParticipant, updateParticipant } from "@/lib/services/rooms";
import { connectUser, getUser } from "@/lib/services/users";
import { formatCalendarDate, parseTimestamp } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ParticipantResponse, ParticipantRole, PublicUserDto, RoomResponse } from "@/lib/types";

/** Id of the panel heading, so the shell and the header's trigger can point at it. */
export const GROUP_INFO_PANEL_ID = "group-info-panel";
export const GROUP_INFO_HEADING_ID = "group-info-heading";

/** Above this many members the list gets its own search field. */
const MEMBER_SEARCH_THRESHOLD = 8;

interface GroupInfoPanelProps {
  room: RoomResponse;
  currentUserId: string | null;
  onClose: () => void;
  onLeft: () => void;
}

/**
 * Group info as a panel beside the conversation, not a modal over it.
 *
 * The panel states each fact once: the room's name and member count live in the
 * conversation's own header, so they are not repeated here. What belongs to this
 * panel is what the header cannot show — the group's identity (avatar, name, kind,
 * creation), who is in it, a way to add people, and the single destructive action of
 * leaving. Every per-member control is behind one gear menu, which is what keeps a
 * hundred-member group from becoming a hundred rows of selects and buttons.
 */
export function GroupInfoPanel({ room, currentUserId, onClose, onLeft }: GroupInfoPanelProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const participantsQuery = useRoomParticipants(room.id);
  const participants = useMemo(
    () => participantsQuery.data?.items ?? [],
    [participantsQuery.data]
  );
  const [view, setView] = useState<"info" | "add">("info");
  const [memberQuery, setMemberQuery] = useState("");
  const [confirmingLeave, setConfirmingLeave] = useState(false);

  const callerRole = room.callerRole;
  const canInvite = callerRole === "OWNER" || callerRole === "ADMIN";

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  /*
   * Members are ordered owner, then admins, then everyone else by name. The name is not
   * on the participant record — the chat service stores ids and the user service owns
   * profiles — so the profiles are fetched here, in one hook call, and the list is
   * re-sorted as they arrive. A row whose profile has not arrived yet shows its id
   * fragment rather than being hidden.
   */
  const { profileOf } = useMemberProfiles(participants);

  const nameOf = useCallback(
    (participant: ParticipantResponse) =>
      profileOf(participant.userId)?.username ??
      participant.nickname ??
      participant.userId.slice(0, 6),
    [profileOf]
  );

  const sorted = useMemo(() => {
    const rank = (participant: ParticipantResponse) =>
      participant.role === "OWNER" ? 0 : participant.role === "ADMIN" ? 1 : 2;
    return [...participants].sort((left, right) => {
      const byRank = rank(left) - rank(right);
      if (byRank !== 0) return byRank;
      return nameOf(left).localeCompare(nameOf(right), undefined, { sensitivity: "base" });
    });
  }, [participants, nameOf]);

  const visible = useMemo(() => {
    const needle = memberQuery.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter((participant) => nameOf(participant).toLowerCase().includes(needle));
  }, [sorted, memberQuery, nameOf]);

  // Invitations this caller has pending for this room, from the shared inbox.
  const invitations = usePendingInvitations(true);
  const roomInvitations = useMemo(
    () =>
      (invitations.data ?? []).filter(
        (invitation) => invitation.roomId === room.id && invitation.direction === "OUTGOING"
      ),
    [invitations.data, room.id]
  );

  async function leave() {
    if (!currentUserId) return;
    try {
      await removeParticipant(room.id, currentUserId);
      await queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.push("You left the group.", "success");
      onLeft();
      onClose();
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }

  return (
    <aside
      id={GROUP_INFO_PANEL_ID}
      /*
       * `role="complementary"` is stated rather than left to the element: an `aside`
       * inside `main` is not exposed as a landmark by browsers, so the label alone did
       * not make this pane reachable from a screen reader's landmark list.
       */
      role="complementary"
      aria-label={`Group info for ${room.name ?? "this group"}`}
      className={cn(
        "absolute inset-0 z-20 flex h-full w-full shrink-0 flex-col border-[var(--app-pane-divider)] bg-[var(--app-pane)]",
        "lg:static lg:z-auto lg:w-[340px] lg:border-l"
      )}
    >
      <div className="flex h-[72px] shrink-0 items-center gap-2 border-b border-[var(--app-pane-divider)] px-3">
        {view === "add" && (
          <IconButton
            surface="pane"
            size="sm"
            label="Back to group info"
            tooltip={null}
            onClick={() => setView("info")}
            className="-ml-1"
          >
            <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        )}
        <h2
          ref={headingRef}
          id={GROUP_INFO_HEADING_ID}
          tabIndex={-1}
          className="min-w-0 flex-1 truncate font-ui text-[20px] font-semibold text-[var(--app-pane-text)] focus:outline-none"
        >
          {view === "add" ? "Add members" : "Group info"}
        </h2>
        <IconButton
          surface="pane"
          size="sm"
          label="Close group info"
          tooltip={null}
          onClick={onClose}
        >
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      </div>

      {view === "add" ? (
        <AddMembersView
          roomId={room.id}
          memberIds={participants.map((participant) => participant.userId)}
          invitedIds={roomInvitations.map((invitation) => invitation.invitedId)}
          onDone={() => setView("info")}
        />
      ) : (
        <>
          <div className="app-scroll-light flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5">
            <IdentityBlock room={room} />

            <section className="flex min-h-0 flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)]">
                  {participants.length} member{participants.length === 1 ? "" : "s"}
                </h3>
                {canInvite && (
                  <button
                    type="button"
                    onClick={() => setView("add")}
                    className={buttonClasses({ variant: "secondary", size: "sm", tone: "pane" })}
                  >
                    <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" />
                    Add
                  </button>
                )}
              </div>

              {participants.length > MEMBER_SEARCH_THRESHOLD && (
                <SearchInput
                  tone="light"
                  value={memberQuery}
                  onValueChange={setMemberQuery}
                  placeholder="Search members"
                  aria-label="Search members"
                />
              )}

              {participantsQuery.isLoading && participants.length === 0 ? (
                <div className="flex flex-col gap-1">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-14 rounded-xl" />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <p className="py-6 text-center font-ui text-[13px] text-[var(--app-pane-text-soft)]">
                  No members match “{memberQuery}”.
                </p>
              ) : (
                <ul className="flex flex-col">
                  {visible.map((participant) => (
                    <MemberRow
                      key={participant.id}
                      participant={participant}
                      profile={profileOf(participant.userId)}
                      isSelf={participant.userId === currentUserId}
                      callerRole={callerRole}
                      currentUserId={currentUserId}
                      roomId={room.id}
                    />
                  ))}
                </ul>
              )}
            </section>

            {roomInvitations.length > 0 && (
              <section className="flex flex-col gap-2">
                <h3 className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)]">
                  Invitations ({roomInvitations.length})
                </h3>
                <ul className="flex flex-col">
                  {roomInvitations.map((invitation) => (
                    <InvitationRow key={invitation.id} userId={invitation.invitedId} />
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="shrink-0 border-t border-[var(--app-pane-divider)] p-2">
            {/*
              Leaving is a ghost row with an icon, not a filled red button: it is a
              normal, reversible-by-invitation action, and a solid danger block at the
              bottom of the panel read as the panel's primary purpose.
            */}
            <button
              type="button"
              onClick={() => setConfirmingLeave(true)}
              className="focus-ring-light flex h-11 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 font-ui text-[15px] font-medium text-[var(--app-danger-on-light)] transition-colors duration-150 motion-reduce:transition-none hover:bg-[rgba(143,42,27,0.12)]"
            >
              <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
              Leave group
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmingLeave}
        title="Leave this group?"
        description="You will stop receiving its messages. The group and its history stay for everyone else."
        confirmLabel="Leave group"
        danger
        onConfirm={() => {
          setConfirmingLeave(false);
          void leave();
        }}
        onCancel={() => setConfirmingLeave(false)}
      />
    </aside>
  );
}

/** Avatar, name, kind and creation. One statement per fact. */
function IdentityBlock({ room }: { room: RoomResponse }) {
  const creator = useUser(room.createdBy ?? null);
  // A calendar date, not "Today": this is when the group was made, not how old it is.
  const createdLabel = parseTimestamp(room.createdAt) ? formatCalendarDate(room.createdAt) : null;

  return (
    <section className="flex flex-col items-center gap-2 text-center">
      <Avatar name={room.name ?? "Group"} seed={room.id} size={96} presenceRing="var(--app-pane)" />
      <div className="min-w-0">
        <h2 className="truncate font-ui text-[20px] font-semibold text-[var(--app-pane-text)]">
          {room.name ?? "Untitled group"}
        </h2>
        <p className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">
          Group · {room.callerRole === "OWNER" ? "you are the owner" : `you are ${room.callerRole.toLowerCase()}`}
        </p>
        {createdLabel && (
          <p className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">
            Created {createdLabel}
            {creator.data ? ` by ${creator.data.username}` : ""}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * One `useQueries` call for every participant's profile.
 *
 * The alternative — a `useUser` per row — works, but it cannot drive the order of the
 * list, because the order is computed above the rows. `useQueries` subscribes to all of
 * them at once, so names arrive (and the list re-sorts) without a second source of
 * truth. Query keys match `useUser`, so the cache is shared and nothing is fetched
 * twice.
 *
 * The platform has no batch profile endpoint today: `GET /users/{id}` is per user, so
 * a hundred-member group makes a hundred requests, deduplicated and cached by React
 * Query. A `GET /users?ids=` endpoint would be the fix; see the report.
 */
function useMemberProfiles(participants: ParticipantResponse[]) {
  const results = useQueries({
    queries: participants.map((participant) => ({
      queryKey: ["user", participant.userId],
      queryFn: () => getUser(participant.userId),
      staleTime: 60_000,
    })),
  });

  const byId = new Map<string, PublicUserDto>();
  results.forEach((result, index) => {
    const data = result.data;
    if (data) byId.set(participants[index].userId, data);
  });

  return {
    profileOf: (userId: string) => byId.get(userId),
    loading: results.some((result) => result.isLoading),
  };
}

function InvitationRow({ userId }: { userId: string }) {
  const userQuery = useUser(userId);
  const username = userQuery.data?.username ?? userId.slice(0, 8);

  return (
    <li className="flex h-12 items-center gap-3">
      <Avatar name={username} seed={userId} src={userQuery.data?.profilePictureUrl} size={28} />
      <span className="min-w-0 flex-1 truncate font-ui text-[15px] text-[var(--app-pane-text)]">
        {username}
      </span>
      <span className="shrink-0 rounded-full bg-[rgba(40,84,48,0.12)] px-2 py-0.5 font-ui text-[12px] font-medium text-[var(--app-pane-text-soft)]">
        Invited
      </span>
    </li>
  );
}

interface MemberRowProps {
  participant: ParticipantResponse;
  profile?: PublicUserDto;
  isSelf: boolean;
  callerRole: ParticipantRole;
  currentUserId: string | null;
  roomId: string;
}

function MemberRow({ participant, profile, isSelf, callerRole, currentUserId, roomId }: MemberRowProps) {
  const isOwner = participant.role === "OWNER";
  const isAdmin = participant.role === "ADMIN";
  const username = profile?.username ?? participant.userId.slice(0, 8);

  return (
    <li className="flex h-14 items-center gap-3">
      <Avatar
        name={username}
        seed={participant.userId}
        src={profile?.profilePictureUrl}
        size={40}
        presenceRing="var(--app-pane)"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
            {username}
          </span>
          {isSelf && (
            <span className="shrink-0 font-ui text-[12px] text-[var(--app-pane-text-soft)]">(you)</span>
          )}
          {(isOwner || isAdmin) && (
            <span className="shrink-0 rounded-full border border-[var(--app-pane-control-border)] px-1.5 py-0.5 font-ui text-[11px] font-medium text-[var(--app-pane-text-soft)]">
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
        </span>
        <span className="block truncate font-ui text-[12px] text-[var(--app-pane-text-soft)]">
          @{username}
        </span>
      </span>
      <MemberMenu
        participant={participant}
        username={username}
        isSelf={isSelf}
        callerRole={callerRole}
        currentUserId={currentUserId}
        roomId={roomId}
      />
    </li>
  );
}

/**
 * One gear per member instead of a role select, a Mute button and a Remove link.
 *
 * Every item is gated on what the backend actually allows, which was read from
 * `RoomService.updateParticipant` / `removeParticipant` rather than guessed:
 *
 *   - the owner cannot be modified at all (`OWNER_IMMUTABLE`);
 *   - only the owner may modify another admin (`ADMIN_MODIFICATION_DENIED`);
 *   - only the owner may grant admin (`ADMIN_GRANT_DENIED`);
 *   - only the owner may remove someone else (`OWNER_ROLE_REQUIRED`);
 *   - a participant cannot change their own role (`SELF_ROLE_CHANGE_DENIED`).
 *
 * There is deliberately no "Transfer ownership": `ROLE_NOT_ASSIGNABLE` says ownership
 * cannot be set through this endpoint, and no other endpoint offers it.
 */
function MemberMenu({
  participant,
  username,
  isSelf,
  callerRole,
  currentUserId,
  roomId,
}: Omit<MemberRowProps, "profile"> & { username: string }) {
  const name = username;
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

  const isOwnerCaller = callerRole === "OWNER";
  const isAdminCaller = callerRole === "ADMIN";
  const targetIsOwner = participant.role === "OWNER";
  const targetIsAdmin = participant.role === "ADMIN";
  const targetIsSelf = isSelf;

  /*
   * Management, exactly as the backend allows it (`ADMIN_GRANT_DENIED`: only the owner
   * grants admin; `ADMIN_MODIFICATION_DENIED`: only the owner touches another admin;
   * `OWNER_IMMUTABLE`: nobody touches the owner; `SELF_ROLE_CHANGE_DENIED`: not self).
   */
  const canMakeAdmin = isOwnerCaller && !targetIsSelf && !targetIsOwner && !targetIsAdmin;
  const canRemoveAdmin = isOwnerCaller && !targetIsSelf && targetIsAdmin;
  const canMute =
    !targetIsSelf && !targetIsOwner && (isOwnerCaller || (isAdminCaller && !targetIsAdmin));
  const canRemove = !targetIsSelf && !targetIsOwner && isOwnerCaller;

  const connected = (connections.data ?? []).some(
    (connection) =>
      connection.otherUserId === participant.userId && connection.status === "ACCEPTED"
  );
  const isBlocked = (blocked.data ?? []).includes(participant.userId);

  async function run(
    key: string,
    action: () => Promise<unknown>,
    success: string
  ): Promise<void> {
    setBusy(key);
    try {
      await action();
      toast.push(success, "success");
      setOpen(false);
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

  const itemClass = (danger = false) =>
    popoverItemClasses({ danger, className: busy ? "pointer-events-none opacity-60" : undefined });

  return (
    <>
      <IconButton
        ref={setTrigger}
        surface="pane"
        size="sm"
        label={`Member options for ${name}`}
        tooltip="Member options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Shield size={16} strokeWidth={1.75} aria-hidden="true" />
      </IconButton>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={trigger}
        label={`Member options for ${name}`}
        role="menu"
        align="end"
      >
        <div role="none">
          {(canMakeAdmin || canRemoveAdmin) && (
            <button
              type="button"
              role="menuitem"
              className={itemClass()}
              onClick={() =>
                void run(
                  "role",
                  () => updateParticipant(roomId, participant.userId, { role: canRemoveAdmin ? "GUEST" : "ADMIN" }),
                  canRemoveAdmin ? `${name} is no longer an admin.` : `${name} is now an admin.`
                ).then(() =>
                  queryClient.invalidateQueries({ queryKey: participantsQueryKey(roomId) })
                )
              }
            >
              {canRemoveAdmin ? (
                <ShieldOff size={16} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Shield size={16} strokeWidth={1.75} aria-hidden="true" />
              )}
              {canRemoveAdmin ? "Remove admin" : "Make admin"}
            </button>
          )}

          {canMute && (
            <button
              type="button"
              role="menuitem"
              className={itemClass()}
              onClick={() =>
                void run(
                  "mute",
                  () => updateParticipant(roomId, participant.userId, { isMuted: !participant.isMuted }),
                  participant.isMuted ? `${name} can send messages again.` : `${name} can no longer send messages.`
                ).then(() =>
                  queryClient.invalidateQueries({ queryKey: participantsQueryKey(roomId) })
                )
              }
            >
              <BellOff size={16} strokeWidth={1.75} aria-hidden="true" />
              {participant.isMuted ? "Unmute" : "Mute"}
            </button>
          )}

          {canRemove && (
            <>
              <div className="my-1 h-px bg-[var(--app-pane-divider)]" role="separator" />
              <button
                type="button"
                role="menuitem"
                className={itemClass(true)}
                onClick={() => {
                  setOpen(false);
                  setConfirming("remove");
                }}
              >
                <UserMinus size={16} strokeWidth={1.75} aria-hidden="true" />
                Remove from group
              </button>
            </>
          )}

          {!targetIsSelf && (canMakeAdmin || canMute || canRemove) && (
            <div className="my-1 h-px bg-[var(--app-pane-divider)]" role="separator" />
          )}

          {!targetIsSelf && connected && (
            <button
              type="button"
              role="menuitem"
              className={itemClass()}
              onClick={() => void message()}
            >
              <MessageSquare size={16} strokeWidth={1.75} aria-hidden="true" />
              Message
            </button>
          )}

          {!targetIsSelf && (
            <Link
              href={connectionHref(participant.userId)}
              role="menuitem"
              className={popoverItemClasses()}
              onClick={() => setOpen(false)}
            >
              <UserRound size={16} strokeWidth={1.75} aria-hidden="true" />
              View profile
            </Link>
          )}

          {!targetIsSelf && !connected && (
            <button
              type="button"
              role="menuitem"
              className={itemClass()}
              onClick={() =>
                void run(
                  "connect",
                  () => connectUser(participant.userId),
                  `Connection request sent to ${name}.`
                ).then(() =>
                  queryClient.invalidateQueries({ queryKey: ["connections", "pending"] })
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
            className={itemClass()}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`@${username}`);
                toast.push("Username copied.", "success");
              } catch {
                toast.push("Could not copy the username.", "error");
              }
              setOpen(false);
            }}
          >
            <Copy size={16} strokeWidth={1.75} aria-hidden="true" />
            Copy username
          </button>

          {!targetIsSelf && (
            <>
              <div className="my-1 h-px bg-[var(--app-pane-divider)]" role="separator" />
              <button
                type="button"
                role="menuitem"
                className={itemClass(true)}
                onClick={() => {
                  setOpen(false);
                  if (isBlocked) {
                    void run(
                      "block",
                      () => unblockUser.mutateAsync(participant.userId),
                      `${name} is unblocked.`
                    );
                  } else {
                    setConfirming("block");
                  }
                }}
              >
                {isBlocked ? "Unblock" : "Block"}
              </button>
            </>
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
            `${name} was removed from the group.`
          ).then(() => queryClient.invalidateQueries({ queryKey: participantsQueryKey(roomId) }));
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
          void run("block", () => blockUser.mutateAsync(participant.userId), `${name} is blocked.`);
        }}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}

interface AddMembersViewProps {
  roomId: string;
  memberIds: string[];
  invitedIds: string[];
  onDone: () => void;
}

/**
 * Adding members replaces the panel's contents instead of opening a dialog: it is the
 * same errand as the member list, one level in, and the explanation sentence lives
 * here rather than beside the field it used to sit above.
 */
function AddMembersView({ roomId, memberIds, invitedIds, onDone }: AddMembersViewProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const connections = useConnections(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, PublicUserDto>>({});
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const members = useMemo(() => new Set(memberIds), [memberIds]);
  const invited = useMemo(() => new Set(invitedIds), [invitedIds]);
  const accepted = useMemo(
    () => (connections.data ?? []).filter((connection) => connection.status === "ACCEPTED"),
    [connections.data]
  );
  const known = useMemo(() => {
    const map = new Map<string, string>();
    for (const connection of accepted) map.set(connection.otherUserId, connection.otherUserId);
    for (const id of memberIds) map.set(id, id);
    return map;
  }, [accepted, memberIds]);

  function toggle(userId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function send() {
    if (selected.size === 0) return;
    setSending(true);
    setErrors({});
    const failures: Record<string, string> = {};
    for (const userId of selected) {
      try {
        await inviteToRoom(roomId, userId);
      } catch (error) {
        failures[userId] = errorMessage(error);
      }
    }
    setSending(false);
    await queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
    const sent = selected.size - Object.keys(failures).length;
    if (sent > 0) {
      toast.push(`${sent} invitation${sent === 1 ? "" : "s"} sent.`, "success");
    }
    if (Object.keys(failures).length > 0) {
      setErrors(failures);
      setSelected(new Set(Object.keys(failures)));
      return;
    }
    onDone();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pt-4">
        <p className="font-ui text-[13px] leading-relaxed text-[var(--app-pane-text-soft)]">
          They&apos;ll get an invitation they can accept or decline.
        </p>
        <UserSearchCombobox
          variant="search"
          tone="light"
          label="Find someone by username"
          value={query}
          onValueChange={setQuery}
          onSelect={(user) => {
            setResults((current) => ({ ...current, [user.id]: user }));
            toggle(user.id);
          }}
          placeholder="Search connections or type a username"
          closeOnSelect={false}
          renderOption={(user) => (
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar name={user.username} seed={user.id} src={user.profilePictureUrl} size={28} />
              <span className="truncate">@{user.username}</span>
            </span>
          )}
        />
      </div>

      <div className="app-scroll-light min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {connections.isLoading ? (
          <div className="flex flex-col gap-1 px-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : accepted.length === 0 && Object.keys(results).length === 0 ? (
          <p className="px-2 py-6 text-center font-ui text-[13px] text-[var(--app-pane-text-soft)]">
            You have no connections yet. Search for a username above to invite someone.
          </p>
        ) : (
          <ul className="flex flex-col">
            {[
              ...accepted.map((connection) => connection.otherUserId),
              ...Object.keys(results).filter((id) => !known.has(id)),
            ].map((userId) => (
              <AddMemberRow
                key={userId}
                userId={userId}
                checked={selected.has(userId)}
                disabled={members.has(userId) ? "Member" : invited.has(userId) ? "Invited" : null}
                error={errors[userId]}
                onToggle={() => toggle(userId)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--app-pane-divider)] p-3">
        <button
          type="button"
          disabled={selected.size === 0 || sending}
          onClick={() => void send()}
          className={cn(
            buttonClasses({ variant: "primary", size: "md", tone: "pane" }),
            "w-full justify-center"
          )}
        >
          {sending
            ? "Sending…"
            : `Send invitation${selected.size === 1 ? "" : "s"}${selected.size > 0 ? ` (${selected.size})` : ""}`}
        </button>
      </div>
    </div>
  );
}

function AddMemberRow({
  userId,
  checked,
  disabled,
  error,
  onToggle,
}: {
  userId: string;
  checked: boolean;
  disabled: string | null;
  error?: string;
  onToggle: () => void;
}) {
  const userQuery = useUser(userId);
  const username = userQuery.data?.username ?? userId.slice(0, 8);

  return (
    <li className="flex flex-col">
      <label
        className={cn(
          "flex h-12 items-center gap-3 rounded-xl px-2",
          disabled ? "opacity-70" : "cursor-pointer hover:bg-[var(--app-pane-hover)]"
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={Boolean(disabled)}
          onChange={onToggle}
          className="focus-ring-light h-4 w-4 shrink-0 accent-[var(--color-fern)]"
          aria-label={username}
        />
        <Avatar name={username} seed={userId} src={userQuery.data?.profilePictureUrl} size={28} />
        <span className="min-w-0 flex-1 truncate font-ui text-[15px] text-[var(--app-pane-text)]">
          {username}
        </span>
        {disabled && (
          <span className="shrink-0 font-ui text-[12px] font-medium text-[var(--app-pane-text-soft)]">
            {disabled}
          </span>
        )}
      </label>
      {error && (
        <p role="alert" className="px-2 pb-1 font-ui text-[12px] text-[var(--app-danger-on-light)]">
          {error}
        </p>
      )}
    </li>
  );
}
