import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageBubble } from "./MessageBubble";
import { ToastProvider } from "@/components/ui/Toast";
import { ChatMessage } from "@/lib/types";

const MESSAGE: ChatMessage = {
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

beforeEach(() => {
  // jsdom has no clipboard; the menu's copy entry needs one to call.
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  });
});

function renderBubble(overrides: Partial<React.ComponentProps<typeof MessageBubble>> = {}) {
  const props: React.ComponentProps<typeof MessageBubble> = {
    message: MESSAGE,
    isOwn: true,
    showSenderName: false,
    isFirstOfGroup: true,
    currentUserId: "me",
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onReact: vi.fn(),
    onRemoveReaction: vi.fn(),
    ...overrides,
  };
  return render(
    <ToastProvider>
      <MessageBubble {...props} />
    </ToastProvider>
  );
}

describe("MessageBubble controls", () => {
  it("offers a react button and an options button, and nothing else", () => {
    renderBubble();

    expect(screen.getByRole("button", { name: "React to this message" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Message options" })).toBeInTheDocument();
    // The old four-button toolbar must not come back.
    expect(screen.queryByRole("button", { name: "Copy message" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit message" })).toBeNull();
  });

  it("shows the time instead of asking for it, and marks an edited message", () => {
    renderBubble({ message: { ...MESSAGE, isEdited: true } });

    const bubble = screen.getByText("hello there").closest("p");
    expect(bubble?.textContent).toContain("edited");
    // No leading zero in the 12-hour clock.
    expect(bubble?.textContent).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    // A leading zero ("01:29 AM") is the bug this formatter exists to prevent.
    expect(bubble?.textContent).not.toMatch(/\b0\d:\d{2} (AM|PM)/);
  });

  it("opens the reaction bar from the smiley and reacts with one click", async () => {
    const onReact = vi.fn();
    renderBubble({ onReact });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "React to this message" }));

    const bar = screen.getByRole("group", { name: "Reactions" });
    await user.click(within(bar).getByRole("button", { name: "React with 👍" }));
    expect(onReact).toHaveBeenCalledWith("m-1", "👍");
    expect(screen.queryByRole("group", { name: "Reactions" })).toBeNull();
  });

  it("keeps the wider reaction set behind the + control", async () => {
    renderBubble();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "React to this message" }));
    const plus = screen.getByRole("button", { name: "More reactions" });
    expect(plus).toHaveAttribute("aria-expanded", "false");

    await user.click(plus);
    expect(screen.getByRole("button", { name: "React with 🌿" })).toBeInTheDocument();
  });

  it("opens a menu from the chevron with React, Copy, Edit and Delete in that order", async () => {
    renderBubble();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Message options" }));

    const menu = screen.getByRole("menu", { name: "Message options" });
    const items = within(menu).getAllByRole("menuitem").map((item) => item.textContent);
    expect(items).toEqual(["React", "Copy", "Edit", "Delete"]);
  });

  it("offers React in the menu for touch screens, which opens the picker", async () => {
    renderBubble();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Message options" }));
    await user.click(screen.getByRole("menuitem", { name: "React" }));

    expect(screen.getByRole("group", { name: "Reactions" })).toBeInTheDocument();
  });

  it("asks for confirmation inside the menu before deleting", async () => {
    const onDelete = vi.fn();
    renderBubble({ onDelete });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Message options" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText("Delete this message?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("m-1");
  });

  it("offers no delete entry when the reader may not delete", async () => {
    renderBubble({ isOwn: false, canDeleteAsOwner: false, onDelete: undefined });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Message options" }));

    expect(screen.queryByRole("menuitem", { name: "Delete" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeInTheDocument();
  });

  it("starts the inline editor from the menu", async () => {
    renderBubble();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Message options" }));
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));

    expect(screen.getByLabelText("Edit message")).toBeInTheDocument();
  });

  it("toggles an existing reaction off when it is the reader's own", async () => {
    const onRemoveReaction = vi.fn();
    renderBubble({
      onRemoveReaction,
      message: {
        ...MESSAGE,
        reactions: [{ userId: "me", emoji: "👍" }],
      },
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "👍 reaction" }));
    expect(onRemoveReaction).toHaveBeenCalledWith("m-1");
  });

  it("counts a reaction only when more than one person used it", () => {
    renderBubble({
      message: {
        ...MESSAGE,
        reactions: [
          { userId: "me", emoji: "👍" },
          { userId: "other", emoji: "👍" },
        ],
      },
      isOwn: false,
    });

    expect(screen.getByRole("button", { name: "👍 reaction, 2" })).toBeInTheDocument();
  });

  it("shows the sender name inside the first bubble of a received group", () => {
    renderBubble({ isOwn: false, showSenderName: true, senderName: "Amina" });
    expect(screen.getByText("Amina")).toBeInTheDocument();
  });

  it("shows no controls on a tombstone, but still renders it as a bubble", () => {
    renderBubble({ message: { ...MESSAGE, isDeleted: true }, isOwn: false });

    expect(screen.queryByRole("button", { name: "React to this message" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Message options" })).toBeNull();

    const text = screen.getByText("Message deleted");
    // The tombstone is the received bubble, not a bare paragraph, and it keeps a time.
    const bubble = text.closest("div");
    expect(bubble?.className).toContain("bg-[var(--app-bubble-in)]");
    expect(text.textContent).toMatch(/Message deleted\s*\d/);
  });

  it("offers Retry on a failed message instead of controls", async () => {
    const onRetry = vi.fn();
    renderBubble({ message: { ...MESSAGE, failed: true }, onRetry });

    expect(screen.queryByRole("button", { name: "Message options" })).toBeNull();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledWith("m-1");
  });
});
