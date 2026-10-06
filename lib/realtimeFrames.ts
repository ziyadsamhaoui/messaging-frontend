import {
  MessageDeletedFrame,
  ParticipantFrame,
  ReactionFrame,
  RoomMessageFrame,
} from "./types";

export type RoomFrame =
  | { kind: "message"; frame: RoomMessageFrame }
  | { kind: "reaction"; frame: ReactionFrame }
  | { kind: "deleted"; frame: MessageDeletedFrame }
  | { kind: "participant"; frame: ParticipantFrame };

const PARTICIPANT_EVENTS = new Set([
  "PARTICIPANT_ADDED",
  "PARTICIPANT_REMOVED",
  "PARTICIPANT_MUTED",
  "PARTICIPANT_UNMUTED",
]);

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
