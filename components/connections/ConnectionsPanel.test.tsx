import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConnectionsPanel } from "./ConnectionsPanel";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toast";

const PEOPLE: Record<string, string> = { "u-alice": "alice", "u-bob": "bob", "u-carol": "carol" };

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    session: { userId: "me" },
    user: { id: "me", username: "me" },
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock("@/hooks/useConnections", () => ({
  useConnections: () => ({
    data: [{ id: 1, otherUserId: "u-alice", status: "ACCEPTED", direction: "OUTGOING" }],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  usePendingConnections: () => ({
    data: [
      { id: 2, otherUserId: "u-bob", status: "PENDING", direction: "INCOMING" },
      { id: 3, otherUserId: "u-carol", status: "PENDING", direction: "OUTGOING" },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useConnectUser: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useAcceptConnection: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useDeclineConnection: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useRemoveConnection: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false }),
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: (id: string | null) => ({
    data: id
      ? { id, username: PEOPLE[id] ?? id, profilePictureUrl: null, lastSeen: null }
      : undefined,
  }),
}));

function renderPanel() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <ConnectionsPanel />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("ConnectionsPanel", () => {
  it("offers Connected and Requests only — blocked people are not a connection state", () => {
    renderPanel();

    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toContain("Connected");
    expect(tabs[1]).toContain("Requests");
    expect(screen.queryByRole("tab", { name: /blocked/i })).toBeNull();
  });

  it("fills the panel with the add view instead of opening a dialog", async () => {
    renderPanel();

    await userEvent.setup().click(screen.getByRole("button", { name: "Add connection" }));

    expect(screen.getByRole("heading", { name: "Add connection" })).toBeInTheDocument();
    expect(screen.getByLabelText("Find people by username")).toBeInTheDocument();
    // The list is replaced, not stacked behind a dialog.
    expect(screen.queryByRole("tab", { name: /connected/i })).toBeNull();

    await userEvent.setup().click(screen.getByRole("button", { name: "Back to connections" }));
    expect(screen.getByRole("tab", { name: /connected/i })).toBeInTheDocument();
  });

  it("shows both request directions, each under its own heading", async () => {
    renderPanel();

    await userEvent.setup().click(screen.getByRole("tab", { name: /requests/i }));

    expect(screen.getByRole("heading", { name: "Received" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sent" })).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("carol")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
  });

  it("links a connected person to their profile route", () => {
    renderPanel();

    const row = screen.getByRole("link", { name: /alice/i });
    expect(row).toHaveAttribute("href", "/app/connections/u-alice");
  });
});
