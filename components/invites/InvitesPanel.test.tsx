import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvitesPanel } from "./InvitesPanel";
import { ToastProvider } from "@/components/ui/Toast";
import { PendingInvitationDto } from "@/lib/types";

const INVITATIONS: PendingInvitationDto[] = [
  {
    id: "inv-in",
    roomId: "r-1",
    roomName: "Tea Circle",
    inviterId: "u-bob",
    invitedId: "me",
    status: "PENDING",
    direction: "INCOMING",
    sentAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 3 * 86_400_000).toISOString(),
  },
  {
    id: "inv-out",
    roomId: "r-2",
    roomName: "Verify Group",
    inviterId: "me",
    invitedId: "u-carol",
    status: "PENDING",
    direction: "OUTGOING",
    sentAt: new Date(Date.now() - 120_000).toISOString(),
    expiresAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  },
];

vi.mock("@/hooks/useInvitations", () => ({
  usePendingInvitations: () => ({ data: INVITATIONS, isLoading: false, isError: false, refetch: vi.fn() }),
  useAcceptInvitation: () => ({ mutateAsync: vi.fn().mockResolvedValue({ roomId: "r-1" }) }),
  useRejectInvitation: () => ({ mutateAsync: vi.fn().mockResolvedValue({ roomId: "r-1" }) }),
  pendingInvitationsQueryKey: ["invitations", "pending"],
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: (id: string | null) => ({
    data: id ? { id, username: id === "u-bob" ? "bob" : "carol", profilePictureUrl: null, lastSeen: null } : undefined,
  }),
}));

function renderPanel(activeInvitationId?: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <InvitesPanel activeInvitationId={activeInvitationId} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("InvitesPanel", () => {
  it("lists the inbox as links, with the answers beside the incoming row", () => {
    renderPanel();

    expect(screen.getByRole("tab", { name: /pending/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: /tea circle/i })).toHaveAttribute(
      "href",
      "/app/invites/inv-in"
    );
    expect(screen.getByRole("button", { name: "Accept invitation to Tea Circle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline invitation to Tea Circle" })).toBeInTheDocument();
  });

  it("opens on the section the active invitation belongs to", () => {
    renderPanel("inv-out");

    expect(screen.getByRole("tab", { name: /sent/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: /verify group/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    // An outgoing invitation has nothing to answer.
    expect(screen.queryByRole("button", { name: /accept invitation/i })).toBeNull();
  });

  it("still lets the reader switch sections by hand", async () => {
    renderPanel("inv-out");

    await userEvent.setup().click(screen.getByRole("tab", { name: /pending/i }));
    expect(screen.getByRole("link", { name: /tea circle/i })).toBeInTheDocument();
  });
});
