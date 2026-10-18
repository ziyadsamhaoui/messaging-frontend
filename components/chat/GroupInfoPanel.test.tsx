import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GroupInfoPanel, GROUP_INFO_HEADING_ID } from "./GroupInfoPanel";
import { ToastProvider } from "@/components/ui/Toast";
import { ParticipantResponse, PendingInvitationDto, RoomResponse } from "@/lib/types";

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

const OWNER: ParticipantResponse = {
  id: "p-1",
  roomId: "r-1",
  userId: "me",
  role: "OWNER",
  nickname: null,
  joinedAt: new Date("2026-10-12T10:00:00Z").toISOString(),
  isMuted: false,
  mutedUntil: null,
};

const BOB: ParticipantResponse = {
  id: "p-2",
  roomId: "r-1",
  userId: "u-bob",
  role: "GUEST",
  nickname: null,
  joinedAt: new Date("2026-10-12T11:00:00Z").toISOString(),
  isMuted: true,
  mutedUntil: null,
};

const state = vi.hoisted(() => ({
  participants: [] as unknown[],
  invitations: [] as unknown[],
  connections: [] as unknown[],
  participantsLoading: false,
  participantsError: false,
}));

state.participants = [OWNER, BOB];
state.invitations = [];
state.connections = [
  { id: 1, status: "ACCEPTED", direction: "OUTGOING", otherUserId: "u-bob", createdAt: "" },
];

vi.mock("@/hooks/useMessages", () => ({
  useRoomParticipants: () => ({
    data: { items: state.participants },
    isLoading: state.participantsLoading,
    isError: state.participantsError,
    refetch: vi.fn(),
  }),
  participantsQueryKey: (roomId: string) => ["participants", roomId],
}));

vi.mock("@/hooks/useConnections", () => ({
  useConnections: () => ({ data: state.connections, isLoading: false, isError: false }),
}));

vi.mock("@/hooks/useBlocks", () => ({
  useBlockedUserIds: () => ({ data: [] }),
  useBlockUser: () => ({ mutateAsync: vi.fn() }),
  useUnblockUser: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/useInvitations", () => ({
  usePendingInvitations: () => ({ data: state.invitations }),
  pendingInvitationsQueryKey: ["invitations", "pending"],
}));

vi.mock("@/hooks/useUser", () => ({
  useUser: (id: string | null) =>
    id
      ? {
          data: {
            id,
            username: id === "me" ? "me" : id.replace(/^u-/, ""),
            profilePictureUrl: null,
            lastSeen: null,
          },
        }
      : { data: undefined },
}));

vi.mock("@/lib/services/users", () => ({
  getUser: async (id: string) => ({
    id,
    username: id === "me" ? "me" : id.replace(/^u-/, ""),
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
  state.participants = [OWNER, BOB];
  state.invitations = [];
  state.participantsLoading = false;
  state.participantsError = false;
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

const OUTGOING_INVITATION: PendingInvitationDto = {
  id: "i-1",
  roomId: "r-1",
  roomName: "Tea Circle",
  inviterId: "me",
  invitedId: "u-cara",
  status: "PENDING",
  direction: "OUTGOING",
  sentAt: new Date("2026-10-13T10:00:00Z").toISOString(),
  expiresAt: new Date("2026-10-20T10:00:00Z").toISOString(),
};

describe("GroupInfoPanel", () => {
  it("is a labelled landmark beside the conversation, not a dialog", () => {
    renderPanel();
    expect(screen.getByRole("complementary", { name: /group info for tea circle/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("takes focus to its heading and names the group in the hero", () => {
    renderPanel();

    const heading = screen.getByRole("heading", { name: "Group info" });
    expect(heading).toHaveFocus();
    expect(document.getElementById(GROUP_INFO_HEADING_ID)).toBe(heading);
    // The hero names the group; the header's cross-fade clone repeats it visually
    // and is aria-hidden, so assistive tech hears it once.
    const names = screen.getAllByText("Tea Circle");
    expect(names).toHaveLength(2);
    expect(names.filter((node) => node.closest("[aria-hidden='true']"))).toHaveLength(1);
  });

  it("shows the member count and the creation line with its creator", async () => {
    renderPanel();

    expect(screen.getByText(/group · 2 members/i)).toBeInTheDocument();
    expect(await screen.findByText(/created .* by me/i)).toBeInTheDocument();
  });

  it("offers only the quick actions the backend can back", () => {
    renderPanel();

    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
    // No calls, no sharing and no per-chat notification mute exist.
    expect(screen.queryByRole("button", { name: /voice|video|share|mute/i })).toBeNull();
  });

  it("renders one page whose tabs follow the section being read", async () => {
    renderPanel();

    const nav = screen.getByRole("navigation", { name: "Group info sections" });
    const tabs = within(nav).getAllByRole("button");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Members", "Settings"]);
    expect(within(nav).getByRole("button", { name: "Members" })).toHaveAttribute(
      "aria-current",
      "true"
    );

    const user = userEvent.setup();
    await user.click(within(nav).getByRole("button", { name: "Settings" }));

    await waitFor(() =>
      expect(within(nav).getByRole("button", { name: "Settings" })).toHaveAttribute(
        "aria-current",
        "true"
      )
    );
    expect(within(nav).getByRole("button", { name: "Members" })).not.toHaveAttribute("aria-current");
  });

  it("moves between tabs with Left and Right, then activates with Enter", async () => {
    renderPanel();

    const nav = screen.getByRole("navigation", { name: "Group info sections" });
    const members = within(nav).getByRole("button", { name: "Members" });
    const settings = within(nav).getByRole("button", { name: "Settings" });
    const user = userEvent.setup();

    members.focus();
    await user.keyboard("{ArrowRight}");
    expect(settings).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(members).toHaveFocus();

    await user.keyboard("{ArrowRight}{Enter}");
    await waitFor(() => expect(settings).toHaveAttribute("aria-current", "true"));
    // After a keyboard activation the reader lands on the section heading.
    expect(screen.getByRole("heading", { name: "Settings" })).toHaveFocus();
  });

  it("adds an Invitations tab and section only when outgoing invitations exist", () => {
    state.invitations = [OUTGOING_INVITATION];
    renderPanel();

    const nav = screen.getByRole("navigation", { name: "Group info sections" });
    expect(within(nav).getAllByRole("button").map((tab) => tab.textContent)).toEqual([
      "Members",
      "Invitations",
      "Settings",
    ]);
    expect(screen.getByRole("heading", { name: "Invitations (1)" })).toBeInTheDocument();
    expect(screen.getByText("Invited")).toBeInTheDocument();
    // There is no cancel endpoint, so no cancel control is offered.
    expect(screen.queryByRole("button", { name: /cancel/i })).toBeNull();
  });

  it("counts the members once and gives each row one gear, a role tag and a handle", async () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "2 members" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Member options for bob" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Member options for me" })).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Muted in this group")).toBeInTheDocument();
    expect(await screen.findByText("@bob")).toBeInTheDocument();

    expect(screen.queryByLabelText("Role for bob")).toBeNull();
    expect(screen.queryByRole("button", { name: "Unmute" })).toBeNull();
  });

  it("shows eight members and expands the rest in place", async () => {
    state.participants = [
      OWNER,
      ...Array.from({ length: 9 }).map((_, index) => ({
        ...BOB,
        id: `p-extra-${index}`,
        userId: `u-${String(index).padStart(2, "0")}`,
        isMuted: false,
      })),
    ];
    renderPanel();

    expect(screen.getAllByRole("button", { name: /member options/i })).toHaveLength(8);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "See all (2 more)" }));
    expect(screen.getAllByRole("button", { name: /member options/i })).toHaveLength(10);
    expect(screen.queryByRole("button", { name: /see all/i })).toBeNull();
  });

  it("filters members by name and handle from the inline search", async () => {
    renderPanel();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Search" }));

    const field = screen.getByRole("searchbox", { name: "Search members" });
    await waitFor(() => expect(field).toHaveFocus());
    await user.type(field, "@bob");
    expect(await screen.findByRole("button", { name: "Member options for bob" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Member options for me" })).toBeNull();
  });

  it("offers the owner management and social items in one menu, danger last", async () => {
    renderPanel();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Member options for bob" }));

    const menu = await screen.findByRole("menu", { name: "Member options for bob" });
    const menuItems = within(menu).getAllByRole("menuitem");
    const items = menuItems.map((item) => item.textContent?.trim());
    expect(items).toEqual([
      "Make admin",
      "Unmute",
      "Message",
      "View profile",
      "Copy username",
      "Remove from group",
      "Block",
    ]);
    // No ownership transfer: the API cannot express it.
    expect(items).not.toContain("Transfer ownership");
    expect(items).not.toContain("Remove admin");

    // Arrow keys walk the menu and Escape dismisses it, returning focus.
    menuItems[0].focus();
    await user.keyboard("{ArrowDown}");
    expect(menuItems[1]).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(screen.getByRole("button", { name: "Member options for bob" })).toHaveFocus();
  });

  it("will not let the owner change their own role, and hides the danger items", async () => {
    renderPanel();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Member options for me" }));

    const menu = await screen.findByRole("menu", { name: "Member options for me" });
    const items = within(menu).getAllByRole("menuitem").map((item) => item.textContent?.trim());
    expect(items).toEqual(["Copy username"]);
    expect(within(menu).queryByText("Transfer ownership")).toBeNull();
  });

  it("shows an admin only the management items the backend allows", async () => {
    renderPanel({ room: { ...ROOM, callerRole: "ADMIN" } });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Member options for bob" }));

    const menu = await screen.findByRole("menu", { name: "Member options for bob" });
    const items = within(menu).getAllByRole("menuitem").map((item) => item.textContent?.trim());
    expect(items).toContain("Unmute");
    expect(items).not.toContain("Make admin");
    expect(items).not.toContain("Remove from group");
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  it("keeps a guest to the social items only", async () => {
    renderPanel({ room: { ...ROOM, callerRole: "GUEST" } });

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Member options for bob" }));

    const menu = await screen.findByRole("menu", { name: "Member options for bob" });
    const items = within(menu).getAllByRole("menuitem").map((item) => item.textContent?.trim());
    expect(items).toEqual(["Message", "View profile", "Copy username", "Block"]);
    // A guest cannot invite, so the action row falls below two actions and is hidden.
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
  });

  it("removes a member through the shared confirmation dialog", async () => {
    renderPanel();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Member options for bob" }));
    const menu = await screen.findByRole("menu", { name: "Member options for bob" });
    await user.click(within(menu).getByRole("menuitem", { name: "Remove from group" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/remove bob from the group/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(removeParticipant).toHaveBeenCalledWith("r-1", "u-bob"));
  });

  it("leaves the group from the Settings section after confirmation", async () => {
    const onLeft = vi.fn();
    const onClose = vi.fn();
    renderPanel({ onLeft, onClose });

    const user = userEvent.setup();
    const leave = screen.getByRole("button", { name: "Leave group" });
    expect(leave.className.split(" ").some((token) => token.startsWith("bg-"))).toBe(false);
    expect(leave).toHaveClass("text-[var(--app-danger-on-light)]");

    await user.click(leave);
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/ownership passes/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Leave group" }));

    await waitFor(() => expect(removeParticipant).toHaveBeenCalledWith("r-1", "me"));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("keeps settings honest: no favourite, notification or clear-history rows", () => {
    renderPanel();

    expect(screen.queryByRole("button", { name: /favourite|favorite/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /notifications/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /clear chat/i })).toBeNull();
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
    expect(screen.getByRole("button", { name: /send invitation/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Back to group info" }));
    expect(screen.getByRole("heading", { name: "Group info" })).toBeInTheDocument();
  });

  it("disables a connection who is already a member", async () => {
    renderPanel();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("checkbox", { name: "bob" })).toBeDisabled();
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("shows a loading state without inventing a member count", () => {
    state.participantsLoading = true;
    state.participants = [];
    renderPanel();

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText(/group · \d+ member/i)).toBeNull();
    expect(screen.queryByText(/created .* by/i)).toBeNull();
  });

  it("shows the shared error block with a retry when members fail", () => {
    state.participantsError = true;
    state.participants = [];
    renderPanel();

    expect(screen.getByRole("alert")).toHaveTextContent(/could not load members/i);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
