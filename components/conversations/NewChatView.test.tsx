import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewChatView } from "./NewChatView";

/*
 * The search hook is the only network call this view makes; it is stubbed so the test
 * can exercise the two-step flow itself — selecting people, naming the group and
 * sending the exact request body.
 */
vi.mock("@/hooks/useUserSearch", () => ({
  useUserSearch: (query: string) =>
    query.trim().length >= 2
      ? {
          data: [
            {
              id: "u-alice",
              username: "alice",
              profilePictureUrl: null,
              description: null,
              type: "USER",
              lastSeen: null,
            },
          ],
          isFetching: false,
        }
      : { data: [], isFetching: false },
}));

async function selectAlice() {
  const user = userEvent.setup();
  const search = screen.getByLabelText("Search people");
  await user.click(search);
  await user.type(search, "al");
  await user.click(await screen.findByRole("option", { name: /alice/i }));
  return user;
}

describe("NewChatView", () => {
  it("starts a direct chat in one step with exactly one participant", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<NewChatView onCancel={() => undefined} onCreate={onCreate} />);

    await selectAlice();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Start chat" }));

    expect(onCreate).toHaveBeenCalledWith({ type: "DIRECT", participantIds: ["u-alice"] });
  });

  it("takes a group through selection and naming before it creates anything", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<NewChatView onCancel={() => undefined} onCreate={onCreate} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Group" }));
    await selectAlice();

    // Step one only collects members: naming is its own step, so nothing is created
    // and the panel title says what is still missing.
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Name the group" })).toBeInTheDocument();

    const create = screen.getByRole("button", { name: "Create group" });
    expect(create).toBeDisabled();

    await user.type(screen.getByLabelText("Group name"), "Tea Circle");
    await user.click(screen.getByRole("button", { name: "Create group" }));

    expect(onCreate).toHaveBeenCalledWith({
      type: "GROUP",
      name: "Tea Circle",
      participantIds: ["u-alice"],
    });
  });

  it("surfaces a failed creation and keeps the view open", async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error("boom"));
    render(<NewChatView onCancel={() => undefined} onCreate={onCreate} />);

    await selectAlice();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Start chat" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Search people")).toBeInTheDocument();
  });

  it("drops everyone but the first person when switching a selection to Direct", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<NewChatView onCancel={() => undefined} onCreate={onCreate} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Group" }));
    await selectAlice();
    await user.click(screen.getByRole("tab", { name: "Direct" }));

    expect(screen.getAllByText("@alice")).toHaveLength(1);
  });
});
