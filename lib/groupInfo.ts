import type { ParticipantRole } from "@/lib/types";

/**
 * Geometry and pure logic for the group info page.
 *
 * The page is one scroll container with no title bar: the back control sits on the
 * hero itself, and the tab bar is the only sticky strip. The numbers that decide
 * "which section is under the sticky bar" are shared by the DOM code and the tests
 * rather than repeated as literals. The tab bar is 44 px and the reference line
 * sits 16 px below it — a section counts as current once its top has crossed it.
 */
export const GROUP_INFO_TABS_PX = 44;
export const GROUP_INFO_STICKY_GAP_PX = 16;
export const GROUP_INFO_SCROLL_OFFSET_PX = GROUP_INFO_TABS_PX + GROUP_INFO_STICKY_GAP_PX;

/** The page shows this many member rows before "See all". */
export const GROUP_INFO_MEMBER_PREVIEW = 8;

export const GROUP_INFO_MIN_WIDTH = 320;
export const GROUP_INFO_MAX_WIDTH = 480;
export const GROUP_INFO_DEFAULT_WIDTH = 360;

export type GroupInfoTabId = "members" | "invitations" | "settings";

export interface GroupInfoTab {
  id: GroupInfoTabId;
  label: string;
}

/** DOM id for a section, so a tab can point at it without holding a ref. */
export function groupInfoSectionId(id: GroupInfoTabId): string {
  return `group-info-section-${id}`;
}

/** DOM id for a section heading, used by `aria-labelledby` and focus calls. */
export function groupInfoHeadingId(id: GroupInfoTabId): string {
  return `group-info-heading-${id}`;
}

export interface SectionPosition {
  id: string;
  /** Offset from the top of the scroll container's content, in px. */
  top: number;
}

/**
 * The section whose top is closest to, but not below, the reference line.
 *
 * The first section wins before any of them reach the line (the page opens on
 * Members), and the last section wins at the bottom of the scroll — a short final
 * section may never reach the line, but the tab must still follow the reader.
 *
 * A half-pixel tolerance absorbs sub-pixel layout: a section whose top rounds to
 * the line is already current, so the active tab does not flicker between two
 * sections while scrolling slowly. The caller only writes state when the returned
 * id actually changes.
 */
export function resolveActiveSectionId(
  sections: ReadonlyArray<SectionPosition>,
  referenceLine: number,
  atBottom: boolean
): string | null {
  if (sections.length === 0) return null;
  if (atBottom) return sections[sections.length - 1].id;

  const tolerance = 0.5;
  let active: string | null = null;
  for (const section of sections) {
    if (section.top <= referenceLine + tolerance) active = section.id;
  }

  return active ?? sections[0].id;
}

/**
 * True only when an overflowing page has reached its end.
 *
 * A page that fits without scrolling is at its top and its bottom at the same
 * time, so it must not start on the last tab. At a real bottom the last section is
 * current even when it is too short to reach the reference line.
 */
export function isAtScrollBottom(metrics: {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}): boolean {
  const overflows = metrics.scrollHeight > metrics.clientHeight + 1;
  return overflows && metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - 1;
}

/**
 * Left/Right move between tabs. Wrapping is deliberate: three equal-width tabs are
 * a single row, and stopping at the ends would make an arrow key do nothing.
 */
export function nextTabId(
  tabs: ReadonlyArray<GroupInfoTab>,
  currentId: GroupInfoTabId | null,
  direction: -1 | 1
): GroupInfoTabId | null {
  if (tabs.length === 0) return null;
  const currentIndex = tabs.findIndex((tab) => tab.id === currentId);
  if (currentIndex === -1) return tabs[0].id;
  const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
  return tabs[nextIndex].id;
}

/**
 * What the member menu may offer, read from `RoomService.updateParticipant` and
 * `removeParticipant` rather than guessed:
 *
 *   - an owner cannot be modified at all (`OWNER_IMMUTABLE`);
 *   - only the owner may grant or remove admin (`ADMIN_GRANT_DENIED`);
 *   - only the owner may remove someone else (`OWNER_ROLE_REQUIRED`);
 *   - a participant cannot change their own role (`SELF_ROLE_CHANGE_DENIED`);
 *   - an admin may mute a guest, not another admin (`ADMIN_MODIFICATION_DENIED`).
 */
export function memberManagementPermissions(
  callerRole: ParticipantRole,
  targetRole: ParticipantRole,
  isSelf: boolean
): { canToggleAdmin: boolean; canMute: boolean; canRemove: boolean } {
  const immutable = isSelf || targetRole === "OWNER";
  if (immutable) {
    return { canToggleAdmin: false, canMute: false, canRemove: false };
  }

  return {
    canToggleAdmin: callerRole === "OWNER",
    canMute: callerRole === "OWNER" || (callerRole === "ADMIN" && targetRole === "GUEST"),
    canRemove: callerRole === "OWNER",
  };
}

/** Clamp the docked panel's width to the range the page was designed for. */
export function clampGroupInfoWidth(width: number): number {
  if (!Number.isFinite(width)) return GROUP_INFO_DEFAULT_WIDTH;
  return Math.min(Math.max(Math.round(width), GROUP_INFO_MIN_WIDTH), GROUP_INFO_MAX_WIDTH);
}
