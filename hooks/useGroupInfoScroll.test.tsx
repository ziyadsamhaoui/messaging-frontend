import React, { useMemo, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  GROUP_INFO_SCROLL_OFFSET_PX,
  groupInfoSectionId,
  type GroupInfoTab,
} from "@/lib/groupInfo";
import { useGroupInfoScroll } from "./useGroupInfoScroll";

const TABS: GroupInfoTab[] = [
  { id: "members", label: "Members" },
  { id: "settings", label: "Settings" },
];

const TABS_WITH_INVITATIONS: GroupInfoTab[] = [
  { id: "members", label: "Members" },
  { id: "invitations", label: "Invitations" },
  { id: "settings", label: "Settings" },
];

function Harness() {
  const tabs = useMemo(() => TABS, []);
  const { scrollRef, activeId, scrollToTab } = useGroupInfoScroll(tabs);
  return (
    <div>
      <div ref={scrollRef} data-testid="scroll">
        <section id={groupInfoSectionId("members")} data-testid="members" />
        <section id={groupInfoSectionId("settings")} data-testid="settings" />
      </div>
      <span data-testid="active">{activeId}</span>
      <button type="button" onClick={() => scrollToTab("settings")}>
        go settings
      </button>
    </div>
  );
}

function RemovalHarness() {
  const [hasInvitations, setHasInvitations] = useState(true);
  const tabs = useMemo(
    () => (hasInvitations ? TABS_WITH_INVITATIONS : TABS),
    [hasInvitations]
  );
  const { scrollRef, activeId } = useGroupInfoScroll(tabs);
  return (
    <div>
      <div ref={scrollRef} data-testid="scroll-removal">
        <section id={groupInfoSectionId("members")} data-testid="members-removal" />
        {hasInvitations && (
          <section
            id={groupInfoSectionId("invitations")}
            data-testid="invitations-removal"
          />
        )}
        <section id={groupInfoSectionId("settings")} data-testid="settings-removal" />
      </div>
      <span data-testid="active-removal">{activeId}</span>
      <button type="button" onClick={() => setHasInvitations(false)}>
        accept last invitation
      </button>
    </div>
  );
}

function rect(top: number, bottom: number): DOMRect {
  return {
    top,
    bottom,
    left: 0,
    right: 0,
    width: 0,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useGroupInfoScroll", () => {
  function setup() {
    render(<Harness />);
    const container = screen.getByTestId("scroll");
    const members = screen.getByTestId("members");
    const settings = screen.getByTestId("settings");

    Object.defineProperty(container, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 600, configurable: true });

    const geometry = { settingsTop: 500 };
    vi.spyOn(container, "getBoundingClientRect").mockImplementation(() => rect(0, 600));
    vi.spyOn(members, "getBoundingClientRect").mockImplementation(() => {
      const top = 0 - container.scrollTop;
      return rect(top, top + 100);
    });
    vi.spyOn(settings, "getBoundingClientRect").mockImplementation(() => {
      const top = geometry.settingsTop - container.scrollTop;
      return rect(top, top + 100);
    });

    const active = () => screen.getByTestId("active").textContent;
    return { container, geometry, active };
  }

  it("starts on the first tab before any section crosses the line", async () => {
    const { active } = setup();
    await waitFor(() => expect(active()).toBe("members"));
  });

  it("follows the section that has crossed the reference line", async () => {
    const { container, active, geometry } = setup();
    await waitFor(() => expect(active()).toBe("members"));

    geometry.settingsTop = 500;
    container.scrollTop = 600;
    fireEvent.scroll(container);

    await waitFor(() => expect(active()).toBe("settings"));
  });

  it("activates the last tab at the bottom even when the last section is short", async () => {
    const { container, active, geometry } = setup();
    await waitFor(() => expect(active()).toBe("members"));

    geometry.settingsTop = 5000;
    container.scrollTop = 1400;
    fireEvent.scroll(container);

    await waitFor(() => expect(active()).toBe("settings"));
  });

  it("does not jump to the last tab when the page fits without scrolling", async () => {
    const { container, active } = setup();
    Object.defineProperty(container, "scrollHeight", { value: 600, configurable: true });

    fireEvent.scroll(container);
    await waitFor(() => expect(active()).toBe("members"));
  });

  it("keeps the nearest section current when a tab disappears", async () => {
    render(<RemovalHarness />);
    const container = screen.getByTestId("scroll-removal");
    const members = screen.getByTestId("members-removal");
    const invitations = screen.getByTestId("invitations-removal");
    const settings = screen.getByTestId("settings-removal");

    Object.defineProperty(container, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 600, configurable: true });
    const geometry = { invitationsTop: 400, settingsTop: 800 };

    vi.spyOn(container, "getBoundingClientRect").mockImplementation(() => rect(0, 600));
    vi.spyOn(members, "getBoundingClientRect").mockImplementation(() => rect(0, 100));
    vi.spyOn(invitations, "getBoundingClientRect").mockImplementation(() => {
      const top = geometry.invitationsTop - container.scrollTop;
      return rect(top, top + 100);
    });
    vi.spyOn(settings, "getBoundingClientRect").mockImplementation(() => {
      const top = geometry.settingsTop - container.scrollTop;
      return rect(top, top + 100);
    });

    const active = () => screen.getByTestId("active-removal").textContent;
    container.scrollTop = 400;
    fireEvent.scroll(container);
    await waitFor(() => expect(active()).toBe("invitations"));

    geometry.settingsTop = 400;
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "accept last invitation" }));

    await waitFor(() => expect(active()).toBe("settings"));
  });

  it("lands a tab-triggered scroll just under the sticky tab bar", async () => {
    const { container, active } = setup();
    const scrollTo = vi.fn();
    container.scrollTo = scrollTo as unknown as typeof container.scrollTo;
    await waitFor(() => expect(active()).toBe("members"));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "go settings" }));

    expect(active()).toBe("settings");
    expect(scrollTo).toHaveBeenCalledWith({
      top: 500 - GROUP_INFO_SCROLL_OFFSET_PX,
      behavior: "smooth",
    });
  });
});
