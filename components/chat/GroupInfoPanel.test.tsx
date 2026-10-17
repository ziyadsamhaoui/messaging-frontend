import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GroupInfoPanel, GROUP_INFO_HEADING_ID } from "./GroupInfoPanel";
import { ToastProvider } from "@/components/ui/Toast";
import { ParticipantResponse, RoomResponse } from "@/lib/types";

const ROOM: RoomResponse = {
  id: "r-1",
  type: "GROUP",
  name: "Tea Circle",
  isFavorited: false,
  createdBy: "me",
  createdAt: new Date("2026-10-12T10:00:00Z").toISOString(),
  lastMessageId: null,
  callerRole: "OWNER",
};

const PARTICIPANTS: ParticipantResponse[] = [
  {
    id: "p-1",
    roomId: "r-1",
    userId: "me",
    role: "OWNER",
    nickname: null,
    joinedAt: new Date("2026-10-12T10:00:00Z").toISOString(),
    isMuted: false,
    mutedUntil: null,
  },
  {
    id: "p-2",
    roomId: "r-1",
    userId: "u-bob",
    role: "GUEST",
    nickname: null,
    joinedAt: new Date("2026-10-12T11:00:00Z").toISOString(),
    isMuted: true,
    mutedUntil: null,
  },
];

vi.mock("@/hooks/useMessages", () => ({
  useRoomParticipants: () => ({ data: { items: PARTICIPANTS }, isLoading: false }),
  participantsQueryKey: (roomId: string) => ["rooms", roomId, "participants"],
}));

vi.mock("@/hooks/useConnections", () => ({
  useConnections: () => ({
    data: [{ id: 1, status: "ACCEPTED", direction: "OUTGOING", otherUserId: "u-bob", createdAt: "" }],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useBlocks", () => ({
  useBlockedUserIds: () => ({ data: [] }),
  useBlockUser: () => ({ mutateAsync: vi.fn() }),
  useUnblockUser: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/useInvitations", () => ({
  usePendingInvitations: () => ({ data: [] }),
  pendingInvitationsQueryKey: ["invitations", "pending"],
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: (id: string | null) =>
    id
      ? { data: { id, username: id === "me" ? "me" : "bob", profilePictureUrl: null, lastSeen: null } }
      : { data: undefined },
}));

vi.mock("@/lib/services/users", () => ({
  getUser: async (id: string) => ({
    id,
    username: id === "me" ? "me" : "bob",
    profilePictureUrl: null,
    type: "USER",
  }),
  connectUser: vi.fn(),
  listBlocked: async () => [],
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
}));

const updateParticipant = vi.fn().mockResolvedValue({});
const removeParticipant = vi.fn().mockResolvedValue(undefined);
const inviteToRoom = vi.fn().mockResolvedValue({});

vi.mock("@/lib/services/rooms", () => ({
  updateParticipant: (...args: unknown[]) => updateParticipant(...args),
  removeParticipant: (...args: unknown[]) => removeParticipant(...args),
  inviteToRoom: (...args: unknown[]) => inviteToRoom(...args),
  createRoom: vi.fn(),
}));

beforeEach(() => {
  updateParticipant.mockClear();
  removeParticipant.mockClear();
  inviteToRoom.mockClear();
});

function renderPanel(overrides: Partial<React.ComponentProps<typeof GroupInfoPanel>> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <GroupInfoPanel
          room={ROOM}
          currentUserId="me"
          onClose={vi.fn()}
          onLeft={vi.fn()}
          {...overrides}
        />
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("GroupInfoPanel", () => {
  it("is a labelled landmark beside the conversation, not a dialog", () => {
    renderPanel();
    expect(screen.getByRole("complementary", { name: /group info for tea circle/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("takes focus to its heading and names the room exactly once", () => {
    renderPanel();

    const heading = screen.getByRole("heading", { name: "Group info" });
    expect(heading).toHaveFocus();
    expect(document.getElementById(GROUP_INFO_HEADING_ID)).toBe(heading);
    // One heading for the pane, one for the group's identity — never the same name twice.
    expect(screen.getAllByText("Tea Circle")).toHaveLength(1);
  });

  it("shows the kind, the caller's role, and the creation line with its creator", async () => {
    renderPanel();

    expect(screen.getByText(/group · you are the owner/i)).toBeInTheDocument();
    expect(await screen.findByText(/created .* by me/i)).toBeInTheDocument();
  });

  it("counts the members once, and gives each row one gear instead of three controls", async () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "2 members" })).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Member options for bob" })
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Member options for me" })).toBeInTheDocument();

    // The old per-row trio must not come back.
    expect(screen.queryByLabelText("Role for bob")).toBeNull();
    expect(screen.queryByRole("button", { name: "Unmute" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();

    // The three-line invite block is gone too; adding people is one button.
    expect(screen.queryByLabelText("Invite by username")).toBeNull();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("marks the owner, the muted member and the handle, and never repeats the header", async () => {
    renderPanel();

    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Muted in this group")).toBeInTheDocument();
    expect(await screen.findByText("@bob")).toBeInTheDocument();
    // "you are owner" is spelled one way only; the old duplicate line must be gone.
    expect(screen.queryByText(/member.*· you are owner/i)).toBeNull();
  });

  it("leaves the group with a ghost row, not a filled red button", () => {
    renderPanel();

    const leave = screen.getByRole("button", { name: "Leave group" });
    // No fill of its own: the solid red block with a drop shadow was the problem.
    const fills = leave.className.split(" ").filter((token) => token.startsWith("bg-"));
    expect(fills).toEqual([]);
    expect(leave.className.split(" ").some((token) => token.startsWith("shadow"))).toBe(false);
  });

  it("offers the owner management and social items in one menu, danger last", async () => {
    renderPanel();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Member options for bob" }));

    const menu = await screen.findByRole("menu", { name: "Member options for bob" });
    const items = within(menu).getAllByRole("menuitem").map((item) => item.textContent?.trim());
    expect(items).toEqual([
      "Make admin",
      "Unmute",
      "Remove from group",
      "Message",
      "View profile",
      "Copy username",
      "Block",
    ]);
    // No ownership transfer: the API cannot express it.
    expect(items).not.toContain("Transfer ownership");
    expect(items).not.toContain("Remove admin");
  });

  it("will not let the owner change their own role, and hides the danger items", async () => {
    renderPanel();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Member options for me" }));

    const menu = await screen.findByRole("menu", { name: "Member options for me" });
    const items = within(menu).getAllByRole("menuitem").map((item) => item.textContent?.trim());
    expect(items).toEqual(["Copy username"]);
  });

  it("shows an admin only the management items the backend allows", async () => {
    renderPanel({ room: { ...ROOM, callerRole: "ADMIN" } });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Member options for bob" }));

    const menu = await screen.findByRole("menu", { name: "Member options for bob" });
    const items = within(menu).getAllByRole("menuitem").map((item) => item.textContent?.trim());
    // An admin may mute a guest but may not grant admin or remove anyone.
    expect(items).toContain("Unmute");
    expect(items).not.toContain("Make admin");
    expect(items).not.toContain("Remove from group");
    // The Add button stays, because an admin may invite.
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("keeps a guest to the social items only", async () => {
    renderPanel({ room: { ...ROOM, callerRole: "GUEST" } });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Member options for bob" }));

    const menu = await screen.findByRole("menu", { name: "Member options for bob" });
    const items = within(menu).getAllByRole("menuitem").map((item) => item.textContent?.trim());
    expect(items).toEqual(["Message", "View profile", "Copy username", "Block"]);
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
  });

  it("opens the add-members view with the explanation, a search field and a sticky action", async () => {
    renderPanel();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("heading", { name: "Add members" })).toBeInTheDocument();
    expect(screen.getByText(/accept or decline/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Find someone by username" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "bob" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to group info" })).toBeInTheDocument();

    // Nothing selected yet, so the action is inert until someone is chosen.
    expect(screen.getByRole("button", { name: /send invitation/i })).toBeDisabled();
  });

  it("disables a connection who is already a member", async () => {
    renderPanel({ room: { ...ROOM, callerRole: "OWNER" } });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add" }));

    // `bob` is a member in this fixture, so the row is disabled and labelled.
    expect(screen.getByRole("checkbox", { name: "bob" })).toBeDisabled();
    expect(screen.getByText("Member")).toBeInTheDocument();
  });
});
