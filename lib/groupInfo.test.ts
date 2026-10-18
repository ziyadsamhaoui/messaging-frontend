import { describe, expect, it } from "vitest";
import {
  GROUP_INFO_MEMBER_PREVIEW,
  GROUP_INFO_SCROLL_OFFSET_PX,
  GROUP_INFO_TABS_PX,
  GROUP_INFO_HEADER_PX,
  clampGroupInfoWidth,
  groupInfoHeadingId,
  groupInfoSectionId,
  isAtScrollBottom,
  memberManagementPermissions,
  nextTabId,
  resolveActiveSectionId,
  type GroupInfoTab,
} from "./groupInfo";

const TABS: GroupInfoTab[] = [
  { id: "members", label: "Members" },
  { id: "invitations", label: "Invitations" },
  { id: "settings", label: "Settings" },
];

describe("resolveActiveSectionId", () => {
  const sections = [
    { id: "members", top: 0 },
    { id: "invitations", top: 480 },
    { id: "settings", top: 960 },
  ];

  it("activates the first section before any section reaches the line", () => {
    expect(resolveActiveSectionId([{ id: "members", top: 200 }], 116, false)).toBe("members");
    expect(resolveActiveSectionId(sections, 100, false)).toBe("members");
  });

  it("follows the last section whose top has crossed the reference line", () => {
    expect(resolveActiveSectionId(sections, GROUP_INFO_SCROLL_OFFSET_PX, false)).toBe("members");
    expect(resolveActiveSectionId(sections, 480, false)).toBe("invitations");
    expect(resolveActiveSectionId(sections, 1200, false)).toBe("settings");
  });

  it("absorbs sub-pixel jitter at the boundary", () => {
    // A section whose top rounds to the line is already current. The tolerance
    // keeps the tab from flickering while the line sits within half a pixel of it.
    expect(resolveActiveSectionId(sections, 479.6, false)).toBe("invitations");
    expect(resolveActiveSectionId(sections, 480.4, false)).toBe("invitations");
    expect(resolveActiveSectionId(sections, 479.4, false)).toBe("members");
  });

  it("activates the last section at the bottom even when it never reaches the line", () => {
    const short = [
      { id: "members", top: 0 },
      { id: "settings", top: 2000 },
    ];
    expect(resolveActiveSectionId(short, 116, true)).toBe("settings");
  });

  it("returns null for an empty page", () => {
    expect(resolveActiveSectionId([], 116, false)).toBeNull();
  });
});

describe("isAtScrollBottom", () => {
  it("is false on a page that fits without scrolling", () => {
    expect(isAtScrollBottom({ scrollTop: 0, clientHeight: 600, scrollHeight: 600 })).toBe(false);
    expect(isAtScrollBottom({ scrollTop: 0, clientHeight: 600, scrollHeight: 601 })).toBe(false);
  });

  it("is true only at the end of an overflowing page", () => {
    expect(isAtScrollBottom({ scrollTop: 0, clientHeight: 600, scrollHeight: 1200 })).toBe(false);
    expect(isAtScrollBottom({ scrollTop: 600, clientHeight: 600, scrollHeight: 1200 })).toBe(true);
    expect(isAtScrollBottom({ scrollTop: 599.5, clientHeight: 600, scrollHeight: 1200 })).toBe(true);
  });
});

describe("nextTabId", () => {
  it("moves between tabs and wraps at both ends", () => {
    expect(nextTabId(TABS, "members", 1)).toBe("invitations");
    expect(nextTabId(TABS, "settings", 1)).toBe("members");
    expect(nextTabId(TABS, "members", -1)).toBe("settings");
    expect(nextTabId(TABS, null, 1)).toBe("members");
  });
});

describe("memberManagementPermissions", () => {
  it("lets the owner manage every member except themselves", () => {
    expect(memberManagementPermissions("OWNER", "GUEST", false)).toEqual({
      canToggleAdmin: true,
      canMute: true,
      canRemove: true,
    });
    expect(memberManagementPermissions("OWNER", "ADMIN", false).canToggleAdmin).toBe(true);
    expect(memberManagementPermissions("OWNER", "OWNER", false)).toEqual({
      canToggleAdmin: false,
      canMute: false,
      canRemove: false,
    });
    expect(memberManagementPermissions("OWNER", "GUEST", true)).toEqual({
      canToggleAdmin: false,
      canMute: false,
      canRemove: false,
    });
  });

  it("lets an admin mute guests only", () => {
    expect(memberManagementPermissions("ADMIN", "GUEST", false)).toEqual({
      canToggleAdmin: false,
      canMute: true,
      canRemove: false,
    });
    expect(memberManagementPermissions("ADMIN", "ADMIN", false)).toEqual({
      canToggleAdmin: false,
      canMute: false,
      canRemove: false,
    });
  });

  it("gives a guest no management items", () => {
    expect(memberManagementPermissions("GUEST", "GUEST", false)).toEqual({
      canToggleAdmin: false,
      canMute: false,
      canRemove: false,
    });
  });
});

describe("geometry", () => {
  it("places the reference line below the sticky header and tab bar", () => {
    expect(GROUP_INFO_SCROLL_OFFSET_PX).toBe(GROUP_INFO_HEADER_PX + GROUP_INFO_TABS_PX + 16);
    expect(GROUP_INFO_MEMBER_PREVIEW).toBe(8);
  });

  it("clamps the docked width to 320-480 px", () => {
    expect(clampGroupInfoWidth(120)).toBe(320);
    expect(clampGroupInfoWidth(900)).toBe(480);
    expect(clampGroupInfoWidth(351.6)).toBe(352);
    expect(clampGroupInfoWidth(Number.NaN)).toBe(360);
  });

  it("gives every section a stable id", () => {
    expect(groupInfoSectionId("members")).toBe("group-info-section-members");
    expect(groupInfoHeadingId("settings")).toBe("group-info-heading-settings");
  });
});
