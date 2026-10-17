import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Two contracts that only exist as wiring, and so have no component to render:
 * every id a row can link to has a route that renders it, and the rail's active
 * destination is marked by the left line rather than by a tinted background.
 */

const ROOT = join(__dirname, "..");

function read(relativePath: string) {
  return readFileSync(join(ROOT, ...relativePath.split("/")), "utf8");
}

describe("app routes", () => {
  it("has a page for the connection profile that a connection row links to", () => {
    const route = "app/app/connections/[userId]/page.tsx";
    expect(existsSync(join(ROOT, "app", "app", "connections", "[userId]", "page.tsx"))).toBe(true);
    expect(read(route)).toContain("ConnectionProfile");
    // The URL is the source of truth, so the id comes from `params`, not from state.
    expect(read(route)).toContain("userId");
  });

  it("renders that profile from the connection row's href", () => {
    const panel = read("components/connections/ConnectionsPanel.tsx");
    expect(panel).toContain("connectionHref(connection.otherUserId)");
  });

  it("keeps starting a chat in the panel, with no new-conversation modal left", () => {
    expect(existsSync(join(ROOT, "components", "sidebar", "NewConversationModal.tsx"))).toBe(false);
    const destination = read("components/conversations/ChatsDestination.tsx");
    expect(destination).toContain("NewChatView");
    expect(destination).not.toContain("Modal");
  });
});

describe("rail selection", () => {
  const rail = read("components/layout/Rail.tsx");

  it("marks the active destination with the left line only", () => {
    expect(rail).toContain("--color-sage");
    expect(rail).not.toContain("--app-rail-active");
    // The row keeps its own background; only the marker and the text colour change.
    const activeBranch = rail.match(/active\s*\?\s*"(text-\[[^"]*)"\s*:/);
    expect(activeBranch?.[1]).toBe("text-[var(--app-rail-text-strong)]");
  });

  it("offers sign out in the rail itself", () => {
    expect(rail).toContain('aria-label="Sign out"');
    expect(rail).toContain("LogOut");
    // ...and no longer only inside the account popover.
    expect(rail).not.toContain("PopoverItem");
  });
});
