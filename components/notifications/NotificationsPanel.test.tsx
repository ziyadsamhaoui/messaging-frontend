import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationsPanel } from "./NotificationsPanel";
import { ToastProvider } from "@/components/ui/Toast";
import { NotificationResponse } from "@/lib/types";

const ITEMS: NotificationResponse[] = [
  {
    id: "n-1",
    type: "MESSAGE",
    sourceType: "MESSAGE",
    content: "alice sent you a message",
    createdAt: new Date().toISOString(),
    read: false,
    sourceId: "msg-1",
  },
  {
    id: "n-2",
    type: "INVITATION",
    sourceType: "INVITATION",
    content: "bob invited you to Tea Circle",
    createdAt: new Date().toISOString(),
    read: true,
    sourceId: "inv-1",
  },
];

vi.mock("@/hooks/useNotifications", () => ({
  useNotificationFeed: () => ({
    data: { pages: [{ items: ITEMS, nextCursor: null, hasMore: false }] },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  }),
  useMarkNotificationRead: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }),
  useMarkAllNotificationsRead: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));

function renderPanel() {
  return render(
    <ToastProvider>
      <NotificationsPanel />
    </ToastProvider>
  );
}

describe("NotificationsPanel", () => {
  it("opens on Unread, so the read history is not what the reader lands on", () => {
    renderPanel();

    expect(screen.getByRole("tab", { name: /unread/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("alice sent you a message")).toBeInTheDocument();
    expect(screen.queryByText("bob invited you to Tea Circle")).not.toBeInTheDocument();
  });

  it("offers the read history on All", async () => {
    renderPanel();

    await userEvent.setup().click(screen.getByRole("tab", { name: "All" }));
    expect(screen.getByText("bob invited you to Tea Circle")).toBeInTheDocument();
    expect(screen.getByText("alice sent you a message")).toBeInTheDocument();
  });

  it("has no preferences gear in the panel header", () => {
    renderPanel();
    expect(screen.queryByRole("link", { name: /notification preferences/i })).toBeNull();
  });

  it("draws a message notification with a message icon, not a bell", () => {
    const { container } = renderPanel();

    expect(container.querySelector("svg.lucide-message-square-text")).not.toBeNull();
    expect(container.querySelector("svg.lucide-bell")).toBeNull();
  });

  it("marks unread rows with the left line and no tinted background", () => {
    const { container } = renderPanel();

    const marker = container.querySelector("span.bg-\\[var\\(--color-sage\\)\\]");
    expect(marker, "the unread marker must exist").not.toBeNull();
    expect(marker!.className).toContain("left-0");
    expect(marker!.className).toContain("w-[3px]");
    expect(screen.getByText("alice sent you a message").closest("button, a, div")).not.toHaveClass(
      "bg-[rgba(164,190,123,0.08)]"
    );
  });
});
