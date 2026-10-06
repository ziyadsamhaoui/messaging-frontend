"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Avatar } from "../ui/Avatar";
import { Skeleton } from "../ui/Skeleton";
import { useToast } from "../ui/Toast";
import { useRoomParticipants } from "../../hooks/useMessages";
import { useUserSearch } from "../../hooks/useUserSearch";
import { useUser } from "../../hooks/useUser";
import { errorMessage, isApiError } from "../../lib/errors";
import { inviteToRoom, removeParticipant, updateParticipant } from "../../lib/services/rooms";
import {
  ParticipantResponse,
  ParticipantRole,
  PublicUserDto,
  RoomResponse,
} from "../../lib/types";

interface ParticipantsDrawerProps {
  open: boolean;
  onClose: () => void;
  room: RoomResponse;
  currentUserId: string | null;
  onLeaveRoom: () => void;
}

export function ParticipantsDrawer({
  open,
  onClose,
  room,
  currentUserId,
  onLeaveRoom,
}: ParticipantsDrawerProps) {
  const toast = useToast();
  const participantsQuery = useRoomParticipants(open ? room.id : null);
  const participants = participantsQuery.data?.items ?? [];
  const callerRole = room.callerRole;
  const canManage = callerRole === "OWNER" || callerRole === "ADMIN";
  const isOwner = callerRole === "OWNER";

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
      onLeaveRoom();
      onClose();
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Members of ${room.name ?? "group"}`}>
      <div className="flex flex-col gap-4">
        <InviteByUsername roomId={room.id} />

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {participantsQuery.isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          )}
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
        </div>

        <div className="flex justify-between border-t border-[rgba(164,190,123,0.15)] pt-3">
          <button
            type="button"
            onClick={leave}
            className="rounded-xl border border-[rgba(192,57,43,0.4)] px-3 py-1.5 text-xs text-[rgba(192,57,43,0.85)]"
          >
            Leave room
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[rgba(229,217,182,0.6)] hover:text-[var(--color-parchment)]"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
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
  const targetIsOwner = participant.role === "OWNER";
  const manageable = canManage && !targetIsOwner && !isSelf;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[rgba(164,190,123,0.15)] px-3 py-2">
      <Avatar name={user?.username ?? "?"} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--color-parchment)]">
          {user?.username ?? participant.userId.slice(0, 8)}
          {isSelf && <span className="ml-1 text-xs font-normal opacity-60">(you)</span>}
        </div>
        <div className="text-xs text-[rgba(164,190,123,0.7)]">
          {participant.role}
          {participant.isMuted && " · muted"}
        </div>
      </div>
      {manageable && (
        <div className="flex items-center gap-1">
          {userQuery.isLoading ? (
            <span className="text-xs text-[rgba(164,190,123,0.6)]">…</span>
          ) : (
            <>
              <select
                value={participant.role}
                onChange={(event) => onChangeRole(participant, event.target.value as ParticipantRole)}
                className="rounded-lg border border-[rgba(164,190,123,0.25)] bg-[rgba(26,58,32,0.8)] px-2 py-1 text-xs text-[var(--color-parchment)]"
                aria-label={`Role for ${user?.username ?? "participant"}`}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="GUEST">GUEST</option>
              </select>
              <button
                type="button"
                onClick={() => onToggleMute(participant)}
                className="rounded-lg border border-[rgba(164,190,123,0.25)] px-2 py-1 text-xs text-[var(--color-parchment)]"
              >
                {participant.isMuted ? "Unmute" : "Mute"}
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => onRemove(participant)}
                  className="rounded-lg border border-[rgba(192,57,43,0.4)] px-2 py-1 text-xs text-[rgba(192,57,43,0.85)]"
                >
                  Remove
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function InviteByUsername({ roomId }: { roomId: string }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const search = useUserSearch(query);

  async function invite(user: PublicUserDto) {
    setInvitingId(user.id);
    try {
      await inviteToRoom(roomId, user.id);
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
    <div className="flex flex-col gap-2 rounded-xl border border-[rgba(164,190,123,0.15)] p-3">
      <Input
        label="Invite by username"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Type at least 2 characters"
        className="bg-[rgba(26,58,32,0.6)]"
      />
      {search.isFetching && <div className="text-xs text-[rgba(164,190,123,0.7)]">Searching…</div>}
      {search.data && search.data.length > 0 && (
        <div className="max-h-40 overflow-y-auto">
          {search.data.map((user) => (
            <div key={user.id} className="flex items-center justify-between gap-2 py-1">
              <span className="truncate text-sm text-[var(--color-parchment)]">@{user.username}</span>
              <button
                type="button"
                onClick={() => void invite(user)}
                disabled={invitingId === user.id}
                className="rounded-lg bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-2 py-1 text-xs font-semibold text-[var(--color-parchment)] disabled:opacity-60"
              >
                {invitingId === user.id ? "Sending…" : "Invite"}
              </button>
            </div>
          ))}
        </div>
      )}
      <span className="text-[11px] text-[rgba(164,190,123,0.6)]">
        Invited users receive a pending invitation they can accept or reject.
      </span>
    </div>
  );
}
