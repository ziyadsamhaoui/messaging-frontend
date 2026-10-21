import type { ParticipantRole } from "@/lib/types";

export const GROUP_INFO_TABS_PX = 44;
export const GROUP_INFO_STICKY_GAP_PX = 16;
export const GROUP_INFO_SCROLL_OFFSET_PX = GROUP_INFO_TABS_PX + GROUP_INFO_STICKY_GAP_PX;

export const GROUP_INFO_MEMBER_PREVIEW = 8;

export const GROUP_INFO_MIN_WIDTH = 320;
export const GROUP_INFO_MAX_WIDTH = 480;
export const GROUP_INFO_DEFAULT_WIDTH = 360;

export type GroupInfoTabId = "members" | "invitations" | "settings";

export interface GroupInfoTab {
  id: GroupInfoTabId;
  label: string;
}

export function groupInfoSectionId(id: GroupInfoTabId): string {
  return `group-info-section-${id}`;
}

export function groupInfoHeadingId(id: GroupInfoTabId): string {
  return `group-info-heading-${id}`;
}

export interface SectionPosition {
  id: string;
  top: number;
}

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

export function isAtScrollBottom(metrics: {
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
}): boolean {
  const overflows = metrics.scrollHeight > metrics.clientHeight + 1;
  return overflows && metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - 1;
}

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

export function clampGroupInfoWidth(width: number): number {
  if (!Number.isFinite(width)) return GROUP_INFO_DEFAULT_WIDTH;
  return Math.min(Math.max(Math.round(width), GROUP_INFO_MIN_WIDTH), GROUP_INFO_MAX_WIDTH);
}
