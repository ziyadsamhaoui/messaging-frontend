import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageList } from "./MessageList";
import { ToastProvider } from "@/components/ui/Toast";
import { ChatMessage } from "@/lib/types";

const BASE: ChatMessage = {
  id: "m-1",
  roomId: "r-1",
  senderId: "me",
  senderUsername: "me",
  type: "TEXT",
  content: "hello there",
  attachmentIds: [],
  isDeleted: false,
  deletedAt: null,
  isEdited: false,
  editedAt: null,
  createdAt: new Date("2026-10-17T10:00:00Z").toISOString(),
  reactions: [],
};

function deletedMessage(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    ...BASE,
    id: "m-deleted",
    content: "",
    isDeleted: true,
    deletedAt: new Date("2026-10-17T10:01:00Z").toISOString(),
    ...overrides,
  };
}

function renderList(messages: ChatMessage[]) {
  return render(
    <ToastProvider>
      <MessageList
        roomId="r-1"
        messages={messages}
        currentUserId="me"
        isGroupRoom
        loading={false}
        hasMore={false}
        onLoadMore={vi.fn()}
      />
    </ToastProvider>
  );
}

describe("MessageList tombstones", () => {
  it("draws a deleted message from the other side in a received bubble", () => {
    renderList([
      BASE,
      deletedMessage({
        id: "m-deleted-other",
        senderId: "u-bob",
        senderUsername: "bob",
        createdAt: new Date("2026-10-17T10:02:00Z").toISOString(),
      }),
    ]);

    const label = screen.getByText("Message deleted");
    const bubble = label.closest("div");
    expect(bubble?.className).toContain("bg-[var(--app-bubble-in)]");
    const row = label.closest(".group\\/message");
    expect(row?.className).toContain("flex-row");
    expect(row?.className).not.toContain("flex-row-reverse");
  });

  it("draws the sender's own deleted message in their outgoing bubble", () => {
    renderList([deletedMessage({ id: "m-deleted-own", senderId: "me" })]);

    const label = screen.getByText("Message deleted");
    expect(label.closest("div")?.className).toContain("bg-[var(--app-bubble-out)]");
    expect(label.closest(".group\\/message")?.className).toContain("flex-row-reverse");
  });

  it("keeps consecutive deletions as separate bubbles instead of one notice", () => {
    renderList([
      deletedMessage({ id: "d-1", senderId: "u-bob", senderUsername: "bob" }),
      deletedMessage({ id: "d-2", senderId: "u-bob", senderUsername: "bob" }),
    ]);

    expect(screen.getAllByText("Message deleted")).toHaveLength(2);
    expect(screen.queryByText(/2 messages deleted/)).toBeNull();
  });
});
