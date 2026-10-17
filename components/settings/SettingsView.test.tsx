import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsView } from "./SettingsView";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    session: { userId: "me" },
    user: {
      id: "me",
      username: "me",
      profilePictureUrl: null,
      description: null,
    },
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock("@/hooks/useBlocks", () => ({
  useBlockedUserIds: () => ({
    data: ["u-bob"],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUnblockUser: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    variables: undefined,
  }),
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: (id: string | null) => ({
    data: id ? { id, username: "bob", profilePictureUrl: null, lastSeen: null } : undefined,
  }),
}));

function renderSettings() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <SettingsView />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("SettingsView", () => {
  it("is an index of sections rather than one long form", () => {
    renderSettings();

    expect(screen.getByRole("button", { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /blocked users/i })).toBeInTheDocument();
    // Signing out lives in the rail, not buried in a settings editor.
    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
  });

  it("opens the profile editor in place", async () => {
    renderSettings();

    await userEvent.setup().click(screen.getByRole("button", { name: /profile/i }));
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("lists blocked people in Settings with an unblock action", async () => {
    renderSettings();

    await userEvent.setup().click(screen.getByRole("button", { name: /blocked users/i }));

    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unblock" })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Back to settings" }));
    expect(screen.getByRole("link", { name: /notifications/i })).toBeInTheDocument();
  });
});
