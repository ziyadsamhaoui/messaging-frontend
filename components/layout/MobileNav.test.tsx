import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MobileNav } from "./MobileNav";
import { parseAppRoute } from "@/lib/appRoute";

vi.mock("@/hooks/useNotifications", () => ({
  useUnreadCount: () => ({ data: { count: 4 } }),
}));
vi.mock("@/hooks/useInvitations", () => ({
  usePendingInvitations: () => ({
    data: [{ direction: "INCOMING" }, { direction: "OUTGOING" }],
  }),
}));
vi.mock("@/hooks/useConnections", () => ({
  usePendingConnections: () => ({ data: [{ direction: "INCOMING" }] }),
}));

function renderNav(pathname: string) {
  return render(<MobileNav route={parseAppRoute(pathname)} />);
}

describe("MobileNav", () => {
  it("is the primary landmark with one tab per destination plus settings", () => {
    renderNav("/app/chats");

    const nav = screen.getByRole("navigation", { name: "Primary" });
    const tabs = within(nav).getAllByRole("link");
    expect(tabs.map((tab) => tab.getAttribute("aria-label"))).toEqual([
      "Chats",
      "Connections, 1",
      "Invites, 1",
      "Notifications, 4 unread",
      "Settings",
    ]);
    expect(nav.className).toContain("md:hidden");
  });

  it("puts each live count in the tab's accessible name", () => {
    renderNav("/app/chats");

    expect(screen.getByRole("link", { name: "Notifications, 4 unread" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Invites, 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connections, 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chats" })).toBeInTheDocument();
  });

  it("marks the active destination, and Settings while a settings editor is open", () => {
    renderNav("/app/settings/shortcuts");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Chats" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the 56 px touch target and does not rely on colour alone", () => {
    renderNav("/app/notifications");
    const active = screen.getByRole("link", { name: "Notifications, 4 unread" });
    expect(active.className).toContain("min-h-14");
    expect(active).toHaveAttribute("aria-current", "page");
  });
});
