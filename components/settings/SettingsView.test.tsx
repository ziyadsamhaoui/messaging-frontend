import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsView } from "./SettingsView";
import { ToastProvider } from "@/components/ui/Toast";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    session: { userId: "me" },
    user: {
      id: "me",
      username: "me",
      profilePictureUrl: null,
      description: null,
      createdAt: "2026-01-04T09:00:00.000Z",
    },
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock("@/hooks/useNotifications", () => ({
  useNotificationPreferences: () => ({
    data: { mutedTypes: ["REACTION"], pushEnabled: true },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useUpdateNotificationPreferences: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
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

function renderSettings(section: Parameters<typeof SettingsView>[0]["section"]) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <SettingsView section={section} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("SettingsView", () => {
  it("is an index of sections, each stating its current value", () => {
    renderSettings(null);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /username, photo, about/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /blocked users/i })).toHaveTextContent("1 blocked");
    expect(screen.getByRole("link", { name: /notification preferences/i })).toHaveTextContent(
      "1 type muted"
    );
    expect(screen.getByText("Choose a setting to change")).toBeInTheDocument();
    const signOut = screen.getByRole("button", { name: /sign out/i });
    expect(signOut.parentElement?.className).toContain("md:hidden");
  });

  it("opens the profile editor as a route, with a live preview", () => {
    renderSettings("profile");

    expect(screen.getByLabelText("Username")).toHaveValue("me");
    expect(screen.getByLabelText("About")).toBeInTheDocument();
    expect(screen.getByLabelText("Picture URL")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save profile" })).toBeNull();
  });

  it("only offers to save once the profile differs, and validates the handle", async () => {
    const user = userEvent.setup();
    renderSettings("profile");

    const username = screen.getByLabelText("Username");
    await user.clear(username);
    await user.type(username, "ab");
    expect(screen.getByText("Use at least 3 characters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save profile" })).toBeInTheDocument();

    await user.type(username, "c");
    expect(screen.queryByText("Use at least 3 characters.")).toBeNull();
  });

  it("lists blocked people with an unblock action and a way back on mobile", async () => {
    const user = userEvent.setup();
    renderSettings("blocked");

    expect(await screen.findByText("bob")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unblock" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to settings" }));
    expect(push).toHaveBeenCalledWith("/app/settings");
  });
});
