import { describe, expect, it } from "vitest";
import { classifyRoomFrame } from "./realtimeFrames";

describe("classifyRoomFrame", () => {
  it("recognises an attachment update and keeps only string ids", () => {
    const classified = classifyRoomFrame({
      eventType: "MESSAGE_ATTACHMENTS_UPDATED",
      messageId: "m-1",
      roomId: "r-1",
      attachmentIds: ["a-1", 42, null, "a-2"],
    });

    expect(classified).toEqual({
      kind: "attachments",
      frame: {
        eventType: "MESSAGE_ATTACHMENTS_UPDATED",
        messageId: "m-1",
        roomId: "r-1",
        attachmentIds: ["a-1", "a-2"],
      },
    });
  });

  it("drops an attachment update without a message or room", () => {
    expect(classifyRoomFrame({ eventType: "MESSAGE_ATTACHMENTS_UPDATED", attachmentIds: [] })).toBeNull();
  });

  it("still classifies a live sent message", () => {
    expect(
      classifyRoomFrame({
        messageId: "m-2",
        senderId: "u-1",
        type: "TEXT",
        content: "hello",
        createdAt: "2026-10-17T10:00:00Z",
      })
    ).toEqual({
      kind: "message",
      frame: {
        messageId: "m-2",
        senderId: "u-1",
        type: "TEXT",
        content: "hello",
        createdAt: "2026-10-17T10:00:00Z",
      },
    });
  });

  it("returns null for an empty object", () => {
    expect(classifyRoomFrame({})).toBeNull();
  });
});
