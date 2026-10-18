"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LogOut, Search, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { AddMembersView } from "@/components/chat/groupInfo/AddMembersView";
import { InvitationsSection } from "@/components/chat/groupInfo/InvitationsSection";
import { MemberSection } from "@/components/chat/groupInfo/MemberSection";
import { useGroupInfoScroll } from "@/hooks/useGroupInfoScroll";
import { pendingInvitationsQueryKey, usePendingInvitations } from "@/hooks/useInvitations";
import { participantsQueryKey, useRoomParticipants } from "@/hooks/useMessages";
import { useUser } from "@/hooks/useUser";
import { errorMessage } from "@/lib/errors";
import {
  GROUP_INFO_DEFAULT_WIDTH,
  GROUP_INFO_HERO_ID,
  GROUP_INFO_MAX_WIDTH,
  GROUP_INFO_MIN_WIDTH,
  clampGroupInfoWidth,
  groupInfoHeadingId,
  groupInfoSectionId,
  nextTabId,
  type GroupInfoTab,
  type GroupInfoTabId,
} from "@/lib/groupInfo";
import { removeParticipant } from "@/lib/services/rooms";
import { getUser } from "@/lib/services/users";
import { formatCalendarDate, parseTimestamp } from "@/lib/time";
import { ParticipantResponse, PublicUserDto, RoomResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Id of the panel heading, so the shell and the header's trigger can point at it. */
export const GROUP_INFO_PANEL_ID = "group-info-panel";
export const GROUP_INFO_HEADING_ID = "group-info-heading";

const MEMBER_SEARCH_INPUT_ID = "group-info-member-search";

interface GroupInfoPanelProps {
  room: RoomResponse;
  currentUserId: string | null;
  onClose: () => void;
  onLeft: () => void;
}

/**
 * Group info as one continuous page.
 *
 * Everything above the sections — the identity hero, the quick actions, the sticky
 * tab bar — scrolls with the content, and the whole panel is the only scroll
 * container. The tab indicator follows the reader through a scroll spy rather than
 * a separate tab panel, which is what lets Members, Invitations and Settings read
 * as one page instead of three views stacked behind a tab strip.
 *
 * Only facts the backend can support are shown. Rooms have no image, no description,
 * no rename, no favourite toggle, no per-conversation notification mute and no clear
 * history, so those controls are absent rather than present and inert.
 */
export function GroupInfoPanel({ room, currentUserId, onClose, onLeft }: GroupInfoPanelProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const scrollPositionRef = useRef(0);
  const restoreScrollRef = useRef<number | null>(null);

  const participantsQuery = useRoomParticipants(room.id);
  const participants = useMemo(
    () => participantsQuery.data?.items ?? [],
    [participantsQuery.data]
  );

  const [view, setView] = useState<"info" | "add">("info");
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [panelWidth, setPanelWidth] = useState(GROUP_INFO_DEFAULT_WIDTH);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const callerRole = room.callerRole;
  const canInvite = callerRole === "OWNER" || callerRole === "ADMIN";

  const { profileOf } = useMemberProfiles(participants);

  const nameOf = useCallback(
    (participant: ParticipantResponse) =>
      profileOf(participant.userId)?.username ??
      participant.nickname ??
      participant.userId.slice(0, 6),
    [profileOf]
  );

  // Owner, then admins, then everyone else by name.
  const sorted = useMemo(() => {
    const rank = (participant: ParticipantResponse) =>
      participant.role === "OWNER" ? 0 : participant.role === "ADMIN" ? 1 : 2;
    return [...participants].sort((left, right) => {
      const byRank = rank(left) - rank(right);
      if (byRank !== 0) return byRank;
      return nameOf(left).localeCompare(nameOf(right), undefined, { sensitivity: "base" });
    });
  }, [participants, nameOf]);

  // Pending invitations this caller sent for this room, from the shared inbox.
  const invitations = usePendingInvitations(true);
  const roomInvitations = useMemo(
    () =>
      (invitations.data ?? []).filter(
        (invitation) => invitation.roomId === room.id && invitation.direction === "OUTGOING"
      ),
    [invitations.data, room.id]
  );

  const tabs = useMemo<GroupInfoTab[]>(() => {
    const list: GroupInfoTab[] = [{ id: "members", label: "Members" }];
    if (canInvite && roomInvitations.length > 0) {
      list.push({ id: "invitations", label: "Invitations" });
    }
    list.push({ id: "settings", label: "Settings" });
    return list;
  }, [canInvite, roomInvitations.length]);

  const { scrollRef, activeId, heroCollapsed, scrollToTab } = useGroupInfoScroll(
    tabs,
    view === "info"
  );

  const tabRefs = useRef<Partial<Record<GroupInfoTabId, HTMLButtonElement | null>>>({});

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [view]);

  // Returning from Add members puts the reader back on the section and offset they
  // left from; the indicator was never reset, so the tab bar is already in place.
  useLayoutEffect(() => {
    if (view !== "info") return;
    const target = restoreScrollRef.current;
    if (target === null) return;
    restoreScrollRef.current = null;
    const container = scrollRef.current;
    if (container) container.scrollTop = target;
  }, [view, scrollRef]);

  const focusMemberSearch = useCallback(() => {
    if (typeof document === "undefined") return;
    // Wait for the inline field to exist before moving focus into it.
    requestAnimationFrame(() => {
      document.getElementById(MEMBER_SEARCH_INPUT_ID)?.focus({ preventScroll: true });
    });
  }, []);

  const toggleMemberSearch = useCallback(() => {
    if (memberSearchOpen) {
      setMemberSearchOpen(false);
      setMemberQuery("");
      return;
    }
    setMemberSearchOpen(true);
    focusMemberSearch();
  }, [focusMemberSearch, memberSearchOpen]);

  const openMemberSearch = useCallback(() => {
    setMemberSearchOpen(true);
    scrollToTab("members");
    focusMemberSearch();
  }, [focusMemberSearch, scrollToTab]);

  const openAddMembers = useCallback(() => {
    scrollPositionRef.current = scrollRef.current?.scrollTop ?? 0;
    setView("add");
  }, [scrollRef]);

  const backToInfo = useCallback(() => {
    restoreScrollRef.current = scrollPositionRef.current;
    setView("info");
  }, []);

  const focusSectionHeading = useCallback((id: GroupInfoTabId) => {
    if (typeof document === "undefined") return;
    document.getElementById(groupInfoHeadingId(id))?.focus({ preventScroll: true });
  }, []);

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, id: GroupInfoTabId) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = nextTabId(tabs, id, event.key === "ArrowRight" ? 1 : -1);
    if (next) tabRefs.current[next]?.focus({ preventScroll: true });
  }

  async function leave() {
    if (!currentUserId) return;
    setLeaving(true);
    try {
      await removeParticipant(room.id, currentUserId);
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
      void queryClient.invalidateQueries({ queryKey: participantsQueryKey(room.id) });
      void queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
      toast.push("You left the group.", "success");
      setConfirmingLeave(false);
      onLeft();
      onClose();
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setLeaving(false);
    }
  }

  const leaveDescription =
    participants.length <= 1
      ? "You are the only member, so the group will be removed."
      : callerRole === "OWNER"
        ? "Ownership passes to the longest-standing member. The group and its history stay for everyone else."
        : "You will stop receiving its messages. The group and its history stay for everyone else.";

  const activeTab: GroupInfoTabId = activeId ?? tabs[0].id;
  const activeIndex = Math.max(
    tabs.findIndex((tab) => tab.id === activeTab),
    0
  );
  const tabWidth = 100 / Math.max(tabs.length, 1);

  // Drag the left edge to resize the docked panel. The drawer and the full-screen
  // view keep the widths they were designed at.
  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      setPanelWidth(clampGroupInfoWidth(drag.startWidth + (drag.startX - event.clientX)));
    }
    function onUp() {
      dragRef.current = null;
      document.body.style.cursor = "";
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <>
      {/* Drawer scrim: solid, no blur. It covers the chat and closes the drawer when
          clicked, the way an overlay is expected to behave. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 hidden bg-[rgba(12,28,16,0.82)] md:block xl:hidden"
      />

      <aside
        id={GROUP_INFO_PANEL_ID}
        role="complementary"
        aria-label={`Group info for ${room.name ?? "this group"}`}
        style={{ "--group-info-width": `${panelWidth}px` } as React.CSSProperties}
        className={cn(
          "group-info-panel fixed inset-0 z-50 flex h-[100dvh] w-full flex-col bg-[var(--app-pane)]",
          "pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]",
          "md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[420px] md:max-w-[92vw] md:border-l md:border-[var(--app-pane-divider)] md:pb-0 md:pt-0",
          "xl:relative xl:z-auto xl:h-full xl:w-[var(--group-info-width)] xl:max-w-none xl:border-l"
        )}
      >
        <div
          role="separator"
          aria-label="Resize group info"
          aria-orientation="vertical"
          aria-valuemin={GROUP_INFO_MIN_WIDTH}
          aria-valuemax={GROUP_INFO_MAX_WIDTH}
          aria-valuenow={panelWidth}
          tabIndex={0}
          onPointerDown={(event) => {
            dragRef.current = { startX: event.clientX, startWidth: panelWidth };
            document.body.style.cursor = "col-resize";
          }}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            setPanelWidth((width) =>
              clampGroupInfoWidth(width + (event.key === "ArrowLeft" ? 16 : -16))
            );
          }}
          className="focus-ring-light absolute inset-y-0 left-0 z-30 hidden w-2 -translate-x-1/2 cursor-col-resize touch-none items-stretch justify-center xl:flex"
        >
          <span aria-hidden="true" className="h-full w-px bg-[var(--app-pane-divider)]" />
        </div>

        {view === "info" ? (
          <div
            ref={scrollRef}
            className="app-scroll-light relative min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--app-pane-divider)] bg-[var(--app-pane)] px-3">
              <IconButton
                surface="pane"
                size="sm"
                touch
                label="Back to conversation"
                onClick={onClose}
                className="-ml-1 md:hidden"
              >
                <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>

              <h2
                ref={headingRef}
                id={GROUP_INFO_HEADING_ID}
                tabIndex={-1}
                aria-label="Group info"
                className="relative min-w-0 flex-1 truncate font-ui text-[20px] font-semibold text-[var(--app-pane-text)] focus:outline-none"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block truncate transition-opacity duration-150 motion-reduce:transition-none",
                    heroCollapsed && "opacity-0"
                  )}
                >
                  Group info
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 flex items-center gap-2 opacity-0 transition-opacity duration-150 motion-reduce:transition-none",
                    heroCollapsed && "opacity-100"
                  )}
                >
                  <Avatar name={room.name ?? "Group"} seed={room.id} size={28} />
                  <span className="min-w-0 truncate font-ui text-[15px] font-semibold">
                    {room.name ?? "Untitled group"}
                  </span>
                </span>
              </h2>

              <IconButton
                surface="pane"
                size="sm"
                touch
                label="Close group info"
                onClick={onClose}
                className="hidden md:inline-flex"
              >
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
            </header>

            <div>
              <Hero
                room={room}
                memberCount={participants.length}
                loading={participantsQuery.isLoading && participants.length === 0}
                error={participantsQuery.isError && participants.length === 0}
              />

              {/* The row only exists when at least two actions work; a lone Search
                  is reached from the members heading instead. */}
              {canInvite && (
                <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                  <QuickAction label="Add" onClick={openAddMembers}>
                    <UserPlus size={22} strokeWidth={1.75} aria-hidden="true" />
                  </QuickAction>
                  <QuickAction label="Search" onClick={openMemberSearch}>
                    <Search size={22} strokeWidth={1.75} aria-hidden="true" />
                  </QuickAction>
                </div>
              )}

              <nav
                data-group-info-tabs
                aria-label="Group info sections"
                className="sticky top-14 z-20 border-b border-[var(--app-pane-divider)] bg-[var(--app-pane)]"
              >
                <ul className="relative flex h-11">
                  {tabs.map((tab) => {
                    const active = activeId === tab.id;
                    return (
                      <li key={tab.id} className="min-w-0 flex-1">
                        <button
                          ref={(element) => {
                            tabRefs.current[tab.id] = element;
                          }}
                          type="button"
                          aria-current={active ? "true" : undefined}
                          onClick={(event) => {
                            scrollToTab(tab.id);
                            // A keyboard activation reports detail 0; move the reader
                            // to the section heading so the next Tab continues there.
                            if (event.detail === 0) focusSectionHeading(tab.id);
                          }}
                          onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                          className={cn(
                            "focus-ring-light flex h-full w-full items-center justify-center px-1 font-ui text-[14px] font-medium transition-colors duration-150 motion-reduce:transition-none",
                            active
                              ? "text-[var(--app-pane-text)]"
                              : "text-[var(--app-pane-text-soft)] hover:text-[var(--app-pane-text)]"
                          )}
                        >
                          <span className="truncate">{tab.label}</span>
                        </button>
                      </li>
                    );
                  })}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 left-0 h-[3px] bg-[var(--color-forest)] transition-[transform,width] duration-200 ease-out motion-reduce:transition-none"
                    style={{
                      width: `${tabWidth}%`,
                      transform: `translateX(${activeIndex * 100}%)`,
                    }}
                  />
                </ul>
              </nav>

              <MemberSection
                roomId={room.id}
                callerRole={callerRole}
                currentUserId={currentUserId}
                participants={sorted}
                nameOf={nameOf}
                profileOf={profileOf}
                loading={participantsQuery.isLoading}
                error={participantsQuery.isError}
                onRetry={() => void participantsQuery.refetch()}
                canInvite={canInvite}
                searchOpen={memberSearchOpen}
                onToggleSearch={toggleMemberSearch}
                query={memberQuery}
                onQueryChange={setMemberQuery}
                onAddMembers={openAddMembers}
              />

              {roomInvitations.length > 0 && (
                <>
                  <SectionBand />
                  <InvitationsSection invitations={roomInvitations} />
                </>
              )}

              <SectionBand />
              <SettingsSection onLeave={() => setConfirmingLeave(true)} />

              {/* Room for the last section to scroll its heading under the tab bar,
                  so Settings can be current even while it is short. */}
              <div aria-hidden="true" className="h-[45vh]" />
            </div>
          </div>
        ) : (
          <>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[var(--app-pane-divider)] px-3">
              <IconButton
                surface="pane"
                size="sm"
                touch
                label="Back to group info"
                onClick={backToInfo}
                className="-ml-1"
              >
                <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
              <h2
                ref={headingRef}
                tabIndex={-1}
                aria-label="Add members"
                className="min-w-0 flex-1 truncate font-ui text-[20px] font-semibold text-[var(--app-pane-text)] focus:outline-none"
              >
                <span aria-hidden="true">Add members</span>
              </h2>
              <IconButton
                surface="pane"
                size="sm"
                touch
                label="Close group info"
                onClick={onClose}
              >
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
            </header>

            <AddMembersView
              roomId={room.id}
              memberIds={participants.map((participant) => participant.userId)}
              invitedIds={roomInvitations.map((invitation) => invitation.invitedId)}
              onDone={backToInfo}
            />
          </>
        )}

        <ConfirmDialog
          open={confirmingLeave}
          title="Leave this group?"
          description={leaveDescription}
          confirmLabel="Leave group"
          danger
          busy={leaving}
          onConfirm={() => void leave()}
          onCancel={() => setConfirmingLeave(false)}
        />
      </aside>
    </>
  );
}

function QuickAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring-light flex h-16 flex-col items-center justify-center gap-1 rounded-[14px] border border-[var(--app-pane-control-border)] bg-transparent font-ui text-[13px] font-medium text-[var(--app-pane-text)] transition-colors duration-150 motion-reduce:transition-none hover:bg-[var(--app-pane-hover)]"
    >
      <span className="text-[var(--app-pane-text-soft)]">{children}</span>
      <span className="max-w-full truncate px-1">{label}</span>
    </button>
  );
}

/** A full-width band in a darker parchment tone, separating sections. */
function SectionBand() {
  return <div aria-hidden="true" className="h-2 w-full bg-[var(--color-parchment-dim)]" />;
}

function Hero({
  room,
  memberCount,
  loading,
  error,
}: {
  room: RoomResponse;
  memberCount: number;
  loading: boolean;
  error: boolean;
}) {
  const creator = useUser(room.createdBy ?? null);
  const createdLabel = parseTimestamp(room.createdAt) ? formatCalendarDate(room.createdAt) : null;
  const creatorName = creator.data?.username;

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 pb-5 pt-6" aria-busy="true">
        <Skeleton className="h-[120px] w-[120px] rounded-full" />
        <Skeleton className="h-6 w-40 rounded-lg" />
        <Skeleton className="h-4 w-28 rounded-lg" />
      </div>
    );
  }

  return (
    <div
      id={GROUP_INFO_HERO_ID}
      className="flex flex-col items-center gap-2 px-4 pb-5 pt-6 text-center"
    >
      <Avatar
        name={room.name ?? "Group"}
        seed={room.id}
        size={120}
        presenceRing="var(--app-pane)"
      />
      <div className="min-w-0 max-w-full">
        <p className="truncate font-ui text-[22px] font-semibold text-[var(--app-pane-text)]">
          {room.name ?? "Untitled group"}
        </p>
        <p className="font-ui text-[14px] text-[var(--app-pane-text-soft)]">
          Group
          {error ? "" : ` · ${memberCount} member${memberCount === 1 ? "" : "s"}`}
        </p>
        {createdLabel && (
          <p className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">
            Created {createdLabel}
            {creatorName ? ` by ${creatorName}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Settings holds only rows the backend can back. A room has no favourite toggle, no
 * per-conversation notification mute, no rename endpoint and no clear-history
 * endpoint, so the only row is the one that always works: leaving.
 */
function SettingsSection({ onLeave }: { onLeave: () => void }) {
  return (
    <section
      id={groupInfoSectionId("settings")}
      aria-labelledby={groupInfoHeadingId("settings")}
      className="scroll-mt-[116px] pb-2"
    >
      <div className="px-4 pb-1 pt-4">
        <h3
          id={groupInfoHeadingId("settings")}
          tabIndex={-1}
          className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)] focus:outline-none"
        >
          Settings
        </h3>
      </div>
      <div className="px-2">
        <button
          type="button"
          onClick={onLeave}
          className="focus-ring-light flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] px-2 text-left font-ui text-[15px] font-medium text-[var(--app-danger-on-light)] transition-colors duration-150 motion-reduce:transition-none hover:bg-[rgba(143,42,27,0.1)]"
        >
          <LogOut size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className="min-w-0 flex-1">Leave group</span>
        </button>
      </div>
    </section>
  );
}

/**
 * One `useQueries` call for every participant's profile.
 *
 * The participant record stores ids; the user service owns names and pictures. The
 * list's order is computed above the rows, so the profiles are subscribed together
 * here rather than fetched one row at a time. Query keys match `useUser`, so the
 * cache is shared. There is no batch profile endpoint; see the report.
 */
function useMemberProfiles(participants: ParticipantResponse[]) {
  const results = useQueries({
    queries: participants.map((participant) => ({
      queryKey: ["user", participant.userId],
      queryFn: () => getUser(participant.userId),
      staleTime: 60_000,
    })),
  });

  const byId = new Map<string, PublicUserDto>();
  results.forEach((result, index) => {
    const data = result.data;
    if (data) byId.set(participants[index].userId, data);
  });

  return { profileOf: (userId: string) => byId.get(userId) };
}
