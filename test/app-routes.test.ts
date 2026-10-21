import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";


const ROOT = join(__dirname, "..");

function read(relativePath: string) {
  return readFileSync(join(ROOT, ...relativePath.split("/")), "utf8");
}

describe("app routes", () => {
  it("has a page for the connection profile that a connection row links to", () => {
    const route = "app/app/connections/[userId]/page.tsx";
    expect(existsSync(join(ROOT, "app", "app", "connections", "[userId]", "page.tsx"))).toBe(true);
    expect(read(route)).toContain("ConnectionProfile");
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

  it("resolves the invitation link that notifications and the inbox already use", () => {
    expect(existsSync(join(ROOT, "app", "app", "invites", "[invitationId]", "page.tsx"))).toBe(
      true
    );
    expect(read("app/app/invites/[invitationId]/page.tsx")).toContain("InvitationDetail");
    expect(read("components/invites/InvitesPanel.tsx")).toContain("invitationHref(invitation.id)");
  });

  it("makes the app root land on the conversations destination", () => {
    const index = read("app/app/page.tsx");
    expect(index).toContain("redirect(CHATS_HREF)");
  });

  it("opens group info beside the conversation instead of over it", () => {
    expect(existsSync(join(ROOT, "components", "chat", "ParticipantsDrawer.tsx"))).toBe(false);
    const screen_ = read("components/conversations/ChatScreen.tsx");
    expect(screen_).toContain("GroupInfoPanel");
    expect(screen_).not.toContain("Modal");
  });

  it("keeps the detail panes visible on a narrow screen, with their own way back", () => {
    for (const [file, backLabel] of [
      ["components/connections/ConnectionProfile.tsx", "Back to connections"],
      ["components/invites/InvitationDetail.tsx", "Back to invites"],
    ] as const) {
      const source = read(file);
      expect(source, `${file} must not hide the pane on narrow screens`).not.toContain(
        "<MainPane hideOnNarrow"
      );
      expect(source).toContain(backLabel);
      expect(source).toContain("md:hidden");
    }
  });

  it("uses the whole pane for the message column and the composer", () => {
    for (const file of ["components/chat/MessageList.tsx", "components/chat/MessageInput.tsx"]) {
      expect(read(file), `${file} must not cap the column at 820 px`).not.toContain("max-w-[820px]");
    }
  });
});

describe("rail selection", () => {
  const rail = read("components/layout/Rail.tsx");

  it("marks the active destination with the left line only", () => {
    expect(rail).toContain("--color-sage");
    expect(rail).not.toContain("--app-rail-active");
    const activeBranch = rail.match(/active\s*\?\s*"(text-\[[^"]*)"\s*:/);
    expect(activeBranch?.[1]).toBe("text-[var(--app-rail-text-strong)]");
  });

  it("offers sign out in the rail itself", () => {
    expect(rail).toContain('aria-label="Sign out"');
    expect(rail).toContain("LogOut");
    expect(rail).not.toContain("PopoverItem");
  });
});
