import {
  AttachmentsUpdatedFrame,
  ConnectionAcceptedFrame,
  InvitationAcceptedFrame,
  InvitationSentFrame,
  MessageDeletedFrame,
  ParticipantFrame,
  ReactionFrame,
  RoomMessageFrame,
} from "./types";

export type RoomFrame =
  | { kind: "message"; frame: RoomMessageFrame }
  | { kind: "attachments"; frame: AttachmentsUpdatedFrame }
  | { kind: "reaction"; frame: ReactionFrame }
  | { kind: "deleted"; frame: MessageDeletedFrame }
  | { kind: "participant"; frame: ParticipantFrame };

const PARTICIPANT_EVENTS = new Set([
  "PARTICIPANT_ADDED",
  "PARTICIPANT_REMOVED",
  "PARTICIPANT_MUTED",
  "PARTICIPANT_UNMUTED",
]);

/*
 * Frames delivered to `/topic/users/{id}`: the ones the sender or the recipient
 * needs regardless of which room is open. Only the three events the realtime
 * gateway actually forwards are recognised — it does not fan out
 * `INVITATION_REJECTED` or `MESSAGE_DELETED` to a user queue, so a decline reaches
 * the sender as "no longer pending" on the next refetch and nothing here invents a
 * finer-grained signal.
 */
export type UserFrame =
  | { kind: "invitation-sent"; frame: InvitationSentFrame }
  | { kind: "invitation-accepted"; frame: InvitationAcceptedFrame }
  | { kind: "connection-accepted"; frame: ConnectionAcceptedFrame };

export function classifyUserFrame(raw: unknown): UserFrame | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const asString = (candidate: unknown): string | null =>
    typeof candidate === "string" ? candidate : null;

  if (value.eventType === "INVITATION_SENT") {
    const invitationId = asString(value.invitationId);
    const roomId = asString(value.roomId);
    if (!invitationId || !roomId) return null;
    return {
      kind: "invitation-sent",
      frame: {
        eventType: "INVITATION_SENT",
        invitationId,
        roomId,
        invitedId: asString(value.invitedId) ?? "",
        inviterId: asString(value.inviterId) ?? "",
        roomName: asString(value.roomName),
        inviterUsername: asString(value.inviterUsername),
        sentAt: asString(value.sentAt),
      },
    };
  }

  if (value.eventType === "INVITATION_ACCEPTED") {
    const invitationId = asString(value.invitationId);
    const roomId = asString(value.roomId);
    if (!invitationId || !roomId) return null;
    return {
      kind: "invitation-accepted",
      frame: {
        eventType: "INVITATION_ACCEPTED",
        invitationId,
        roomId,
        invitedId: asString(value.invitedId),
        inviterId: asString(value.inviterId) ?? "",
        invitedUsername: asString(value.invitedUsername),
        acceptedAt: asString(value.acceptedAt),
      },
    };
  }

  if (value.eventType === "USER_CONNECTION_ACCEPTED") {
    const userIdA = asString(value.userIdA);
    const userIdB = asString(value.userIdB);
    if (!userIdA || !userIdB) return null;
    return {
      kind: "connection-accepted",
      frame: {
        eventType: "USER_CONNECTION_ACCEPTED",
        userIdA,
        userIdB,
        userAUsername: asString(value.userAUsername),
        userBUsername: asString(value.userBUsername),
        acceptedAt: asString(value.acceptedAt),
      },
    };
  }

  return null;
}

export function classifyRoomFrame(raw: unknown): RoomFrame | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;

  if (typeof value.eventType === "string" && PARTICIPANT_EVENTS.has(value.eventType)) {
    return {
      kind: "participant",
      frame: {
        eventType: value.eventType as ParticipantFrame["eventType"],
        roomId: String(value.roomId ?? ""),
        userId: typeof value.userId === "string" ? value.userId : null,
        role: typeof value.role === "string" ? (value.role as ParticipantFrame["role"]) : undefined,
        muted: typeof value.muted === "boolean" ? value.muted : undefined,
        mutedUntil: typeof value.mutedUntil === "string" ? value.mutedUntil : null,
      },
    };
  }

  if (value.eventType === "MESSAGE_ATTACHMENTS_UPDATED") {
    if (typeof value.messageId !== "string" || typeof value.roomId !== "string") return null;
    const ids = Array.isArray(value.attachmentIds)
      ? value.attachmentIds.filter((entry): entry is string => typeof entry === "string")
      : [];
    return {
      kind: "attachments",
      frame: {
        eventType: "MESSAGE_ATTACHMENTS_UPDATED",
        messageId: value.messageId,
        roomId: value.roomId,
        attachmentIds: ids,
      },
    };
  }

  if (typeof value.messageId !== "string") return null;

  if (typeof value.emoji === "string" && typeof value.reactorId === "string") {
    return {
      kind: "reaction",
      frame: {
        messageId: value.messageId,
        reactorId: value.reactorId,
        reactorUsername:
          typeof value.reactorUsername === "string" ? value.reactorUsername : undefined,
        emoji: value.emoji,
      },
    };
  }

  if (typeof value.senderId === "string") {
    return {
      kind: "message",
      frame: {
        messageId: value.messageId,
        senderId: value.senderId,
        type: typeof value.type === "string" ? (value.type as RoomMessageFrame["type"]) : undefined,
        content: typeof value.content === "string" ? value.content : undefined,
        createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
      },
    };
  }

  if (typeof value.roomId === "string") {
    return { kind: "deleted", frame: { messageId: value.messageId, roomId: value.roomId } };
  }

  return null;
}
