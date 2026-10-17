"use client";

import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconButton } from "@/components/ui/IconButton";
import { UserSearchCombobox } from "@/components/ui/UserSearchCombobox";
import { buttonClasses } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { pendingInvitationsQueryKey } from "@/hooks/useInvitations";
import { useRoomParticipants } from "@/hooks/useMessages";
import { useUser } from "@/hooks/useUser";
import { errorMessage, isApiError } from "@/lib/errors";
import { inviteToRoom, removeParticipant, updateParticipant } from "@/lib/services/rooms";
import { cn } from "@/lib/utils";
import {
  ParticipantResponse,
  ParticipantRole,
  PublicUserDto,
  RoomResponse,
} from "@/lib/types";

/** Id of the panel heading, so the shell and the header's trigger can point at it. */
export const GROUP_INFO_PANEL_ID = "group-info-panel";
export const GROUP_INFO_HEADING_ID = "group-info-heading";

interface GroupInfoPanelProps {
  room: RoomResponse;
  currentUserId: string | null;
  onClose: () => void;
  onLeft: () => void;
}

/**
 * Group info as a panel beside the conversation, not a modal over it.
 *
 * The members list, the invite field and the role controls all act on the room that
 * is open in the pane next to them, so covering that room with a dialog hid exactly
 * the context the controls were about. It is a real details pane: an `aside` with its
 * own heading and scroll, side by side from `lg` up and a full-pane overlay below it.
 *
 * Focus moves to the heading when it opens, which is how a keyboard user learns the
 * pane appeared; the trigger takes focus back on close (see ChatScreen).
 */
export function GroupInfoPanel({ room, currentUserId, onClose, onLeft }: GroupInfoPanelProps) {
  const toast = useToast();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const participantsQuery = useRoomParticipants(room.id);
  const participants = participantsQuery.data?.items ?? [];
  const callerRole = room.callerRole;
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";
  const isOwner = callerRole === "OWNER";

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  async function changeRole(participant: ParticipantResponse, role: ParticipantRole) {
    try {
      await updateParticipant(room.id, participant.userId, { role });
      toast.push("Participant role updated.", "success");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }

  async function toggleMute(participant: ParticipantResponse) {
    try {
      await updateParticipant(room.id, participant.userId, { isMuted: !participant.isMuted });
      toast.push(participant.isMuted ? "Participant unmuted." : "Participant muted.", "success");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }

  async function remove(participant: ParticipantResponse) {
    try {
      await removeParticipant(room.id, participant.userId);
      toast.push("Participant removed.", "success");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }

  async function leave() {
    if (!currentUserId) return;
    try {
      await removeParticipant(room.id, currentUserId);
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
      <div className="flex h-[72px] shrink-0 items-center justify-between gap-2 border-b border-[var(--app-pane-divider)] px-4">
        <div className="min-w-0">
          <h2
            ref={headingRef}
            id={GROUP_INFO_HEADING_ID}
            tabIndex={-1}
            className="truncate font-ui text-[20px] font-semibold text-[var(--app-pane-text)] focus:outline-none"
          >
            Group info
          </h2>
          {/*
            The room's name is stated once, here — the chat pane's own heading is the
            room name too, so repeating it as this pane's heading would have put the same
            `h2` twice in the outline.
          */}
          <p className="truncate font-ui text-[13px] text-[var(--app-pane-text-soft)]">
            {room.name ?? "Untitled group"}
          </p>
        </div>
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

      <div className="app-scroll-light flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <p className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">
          {participants.length} member{participants.length === 1 ? "" : "s"} · you are{" "}
          {callerRole.toLowerCase()}
        </p>

        <InviteByUsername roomId={room.id} />

        <section className="flex flex-col gap-1">
          <h3 className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)]">
            Members
          </h3>
          {participantsQuery.isLoading && participants.length === 0 ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {participants.map((participant) => (
                <ParticipantRow
                  key={participant.id}
                  participant={participant}
                  isSelf={participant.userId === currentUserId}
                  canManage={canManage}
                  isOwner={isOwner}
                  onChangeRole={changeRole}
                  onToggleMute={toggleMute}
                  onRemove={remove}
                />
              ))}
            </ul>
          )}
        </section>

        <div className="mt-auto border-t border-[var(--app-pane-divider)] pt-4">
          <button
            type="button"
            onClick={() => void leave()}
            className={buttonClasses({ variant: "danger", size: "md", tone: "light" })}
          >
            Leave group
          </button>
        </div>
      </div>
    </aside>
  );
}

interface ParticipantRowProps {
  participant: ParticipantResponse;
  isSelf: boolean;
  canManage: boolean;
  isOwner: boolean;
  onChangeRole: (participant: ParticipantResponse, role: ParticipantRole) => void;
  onToggleMute: (participant: ParticipantResponse) => void;
  onRemove: (participant: ParticipantResponse) => void;
}

function ParticipantRow({
  participant,
  isSelf,
  canManage,
  isOwner,
  onChangeRole,
  onToggleMute,
  onRemove,
}: ParticipantRowProps) {
  const userQuery = useUser(participant.userId);
  const user = userQuery.data;
  const username = user?.username ?? participant.userId.slice(0, 8);
  const targetIsOwner = participant.role === "OWNER";
  const manageable = canManage && !targetIsOwner && !isSelf;

  return (
    <li className="flex flex-col gap-2 rounded-[var(--radius-control)] px-1 py-1.5">
      <div className="flex items-center gap-3">
        <Avatar
          name={username}
          seed={participant.userId}
          src={user?.profilePictureUrl}
          size={40}
          presenceRing="var(--app-pane)"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
            {username}
            {isSelf && <span className="ml-1 font-ui text-xs opacity-70">(you)</span>}
          </p>
          <p className="truncate font-ui text-xs text-[var(--app-pane-text-soft)]">
            {participant.role}
            {participant.isMuted && " · muted"}
          </p>
        </div>
      </div>

      {manageable && (
        <div className="flex flex-wrap items-center gap-1.5 pl-1">
          <label className="sr-only" htmlFor={`role-${participant.id}`}>
            Role for {username}
          </label>
          <select
            id={`role-${participant.id}`}
            value={participant.role}
            onChange={(event) => onChangeRole(participant, event.target.value as ParticipantRole)}
            className="focus-ring-light h-8 rounded-[var(--radius-control)] border border-[var(--app-pane-control-border)] bg-[var(--app-pane-raised)] px-2 font-ui text-[13px] text-[var(--app-pane-text)]"
          >
            <option value="ADMIN">Admin</option>
            <option value="GUEST">Guest</option>
          </select>
          <button
            type="button"
            onClick={() => onToggleMute(participant)}
            className="focus-ring-light h-8 rounded-[var(--radius-control)] border border-[var(--app-pane-control-border)] px-2.5 font-ui text-[13px] text-[var(--app-pane-text)] hover:bg-[var(--app-pane-hover)]"
          >
            {participant.isMuted ? "Unmute" : "Mute"}
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => onRemove(participant)}
              className="focus-ring-light h-8 rounded-[var(--radius-control)] px-2.5 font-ui text-[13px] text-[var(--app-danger-on-light)] hover:bg-[rgba(143,42,27,0.12)]"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function InviteByUsername({ roomId }: { roomId: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);

  async function invite(user: PublicUserDto) {
    setInvitingId(user.id);
    try {
      await inviteToRoom(roomId, user.id);
      // The sender's outgoing invitation is now pending; refresh the shared inbox.
      void queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
      toast.push(`Invitation sent to @${user.username}.`, "success");
      setQuery("");
    } catch (error) {
      if (isApiError(error)) {
        toast.push(errorMessage(error), "error");
      } else {
        toast.push("Could not send the invitation.", "error");
      }
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)]">
        Invite someone
      </h3>
      <UserSearchCombobox
        variant="search"
        tone="light"
        label="Invite by username"
        value={query}
        onValueChange={setQuery}
        onSelect={(user) => void invite(user)}
        placeholder="Type at least 2 characters"
        inputClassName="bg-[var(--app-pane-raised)]"
        renderOption={(user) => (
          <>
            <span className="truncate font-ui text-sm text-[var(--app-pane-text)]">
              @{user.username}
            </span>
            <span className="font-ui text-xs font-semibold text-[var(--app-pane-text-soft)]">
              {invitingId === user.id ? "Sending…" : "Invite"}
            </span>
          </>
        )}
      />
      <p className="font-ui text-xs text-[var(--app-pane-text-soft)]">
        They receive a pending invitation they can accept or decline.
      </p>
    </section>
  );
}
