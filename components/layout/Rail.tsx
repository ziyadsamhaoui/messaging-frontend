"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  LogOut,
  MailPlus,
  MessagesSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AppDestination,
  AppRoute,
  destinationHref,
  NOTIFICATION_PREFERENCES_HREF,
  SETTINGS_HREF,
} from "@/lib/appRoute";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/store/uiStore";
import { useUnreadCount } from "@/hooks/useNotifications";
import { usePendingInvitations } from "@/hooks/useInvitations";
import { usePendingConnections } from "@/hooks/useConnections";
import { Avatar } from "@/components/ui/Avatar";
import { CountBadge, RailBadge } from "@/components/ui/Badge";
import { Popover, popoverItemClasses } from "@/components/ui/Popover";
import { Tooltip, tooltipTriggerClass } from "@/components/ui/Tooltip";

const ICON_SIZE = 22;

/**
 * The row's alignment anchor and the only thing that shows hover, active or focus:
 * a 48 px box with a fixed 44 x 44 square centred inside it. The box never moves and
 * the square never grows with the rail, so the icon's centre stays 36 px from the
 * rail's edge in both the collapsed and the expanded state.
 */
function RailSquare({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-11 w-12 shrink-0 items-center justify-center">
      <span className="app-rail-square relative flex h-11 w-11 items-center justify-center rounded-xl">
        {children}
      </span>
    </span>
  );
}

const DESTINATIONS: Array<{
  value: AppDestination;
  label: string;
  Icon: typeof MessagesSquare;
  /** Counts are capped per affordance: the rail badge only has room for one digit. */
  countKey?: "unread" | "requests" | "invites";
}> = [
  { value: "chats", label: "Chats", Icon: MessagesSquare },
  { value: "connections", label: "Connections", Icon: Users, countKey: "requests" },
  { value: "invites", label: "Invites", Icon: MailPlus, countKey: "invites" },
  { value: "notifications", label: "Notifications", Icon: Bell, countKey: "unread" },
];

interface RailProps {
  route: AppRoute;
}

/**
 * Zone one: the primary navigation.
 *
 * Real links in a `nav` landmark, not buttons, so every destination has a URL and
 * middle-click, a new tab and the back button all behave. The collapsed state is
 * mirrored onto the document element (see `.app-rail` in `globals.css`) so the width
 * is correct in the server's HTML and never flashes.
 *
 * Counts come from the three queries the destinations themselves use, which means
 * the badge and the list can never disagree. A count that the API cannot provide —
 * per-room unread on conversation rows — is left out rather than faked.
 */
export function Rail({ route }: RailProps) {
  const auth = useAuth();
  const router = useRouter();
  const socketState = useUiStore((state) => state.socketState);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  const unread = useUnreadCount(true);
  const invitations = usePendingInvitations(true);
  const pendingConnections = usePendingConnections(true);

  const unreadCount = unread.data?.count ?? 0;
  const inviteCount = (invitations.data ?? []).filter(
    (invitation) => invitation.direction === "INCOMING"
  ).length;
  const requestCount = (pendingConnections.data ?? []).filter(
    (connection) => connection.direction === "INCOMING"
  ).length;
  const counts: Record<string, number> = {
    unread: unreadCount,
    requests: requestCount,
    invites: inviteCount,
  };

  const username = auth.user?.username ?? "Signed in";
  const active: AppDestination | "settings" = route.isSettings ? "settings" : route.destination;

  async function signOut() {
    await auth.logout();
    router.replace("/login");
  }

  /*
   * The shortcut is registered on the document rather than on a focused element,
   * because it must work wherever the keyboard focus happens to be.
   */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "b") return;
      const target = event.target as HTMLElement | null;
      // Never steal the key from a text field.
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      event.preventDefault();
      toggleSidebar();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  return (
    <nav
      id="primary-rail"
      aria-label="Primary"
      className="app-rail flex h-full shrink-0 flex-col bg-[var(--app-rail)]"
    >
      <div className="app-rail-header flex h-[72px] shrink-0 items-center gap-2 px-3">
        <Link
          href="/"
          className="app-rail-brand focus-ring flex min-w-0 items-center gap-3 rounded-[var(--radius-control)] px-1 py-1"
        >
          <Image
            src="/favicon.png"
            width={36}
            height={36}
            alt=""
            className="rounded-lg"
            draggable={false}
          />
          <span className="app-rail-label font-display text-[22px] font-semibold text-[var(--app-rail-text-strong)]">
            BadrLink
          </span>
        </Link>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={!collapsed}
          aria-controls="primary-rail"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "app-rail-row app-rail-toggle ml-auto flex h-11 w-11 shrink-0 items-center justify-center text-[var(--app-rail-text)] ",
            "max-md:hidden"
          )}
        >
          <span className="app-rail-square flex h-11 w-11 items-center justify-center rounded-xl">
            {collapsed ? (
              <PanelLeftOpen size={20} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={20} strokeWidth={1.75} aria-hidden="true" />
            )}
          </span>
        </button>
      </div>

      {/*
        No `px-3` on the list or on the profile block: the row's own 12 px inset
        (`.app-rail-row`) is the only horizontal padding the icon column may have. Two
        insets stacked put the icon box 24 px in, which moved the icon's centre to 48 px
        and left it off the rail's 36 px axis.
      */}
      <ul className="flex flex-col gap-1">
        {DESTINATIONS.map(({ value, label, Icon, countKey }) => {
          const count = countKey ? counts[countKey] : 0;
          return (
            <li key={value}>
              <RailLink
                href={destinationHref(value)}
                label={label}
                count={count}
                countSuffix={countKey === "unread" ? "unread" : undefined}
                active={active === value}
                icon={<Icon size={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" />}
              />
            </li>
          );
        })}
      </ul>

      <div className="flex-1" />

      <ul className="flex flex-col gap-1 pb-2">
        <li>
          <RailLink
            href={SETTINGS_HREF}
            label="Settings"
            count={0}
            active={active === "settings"}
            icon={<Settings size={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" />}
          />
        </li>
        <li>
          {/*
            Signing out lives in the rail itself, not only inside the account
            popover: it is the one action a person may need before they trust the
            screen they are on, and burying it behind a menu reads as a trap.
          */}
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            className={cn(
              "app-rail-row group/rail relative flex h-11 w-full items-center gap-1 font-ui text-[15px] font-medium text-[var(--app-rail-text)] transition-colors duration-150 motion-reduce:transition-none hover:text-[var(--app-rail-text-strong)]",
              tooltipTriggerClass
            )}
          >
            <RailSquare>
              <LogOut size={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" />
            </RailSquare>
            <span className="app-rail-label min-w-0 flex-1 truncate text-left">Sign out</span>
            <Tooltip label="Sign out" side="right" />
          </button>
        </li>
      </ul>

      <ProfileBlock
        username={username}
        avatarUrl={auth.user?.profilePictureUrl}
        seed={auth.session?.userId}
        connected={socketState === "connected"}
      />
    </nav>
  );
}

function RailLink({
  href,
  label,
  count,
  countSuffix,
  active,
  icon,
}: {
  href: string;
  label: string;
  count: number;
  countSuffix?: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  // The count belongs to the accessible name: "Notifications, 3 unread", not a badge
  // that a screen reader either misses or announces twice.
  const accessibleName =
    count > 0 ? `${label}, ${count}${countSuffix ? ` ${countSuffix}` : ""}` : label;

  return (
    <Link
      href={href}
      aria-label={accessibleName}
      aria-current={active ? "page" : undefined}
      data-active={active ? "true" : undefined}
      className={cn(
        "app-rail-row group/rail relative flex h-11 items-center gap-1 font-ui text-[15px] font-medium transition-colors duration-150 motion-reduce:transition-none",
        tooltipTriggerClass,
        // The row itself is never filled. Selection is carried by the left marker,
        // the 44 px square behind the icon and the label's weight — and, for assistive
        // tech, by `aria-current="page"`. Colour is never the only signal.
        active
          ? "text-[var(--app-rail-text-strong)]"
          : "text-[var(--app-rail-text)] hover:text-[var(--app-rail-text-strong)]",
        active && "font-semibold"
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-sage)]"
        />
      )}
      <RailSquare>
        {icon}
        <RailBadge count={count} max={9} />
      </RailSquare>
      <span className="app-rail-label min-w-0 flex-1 truncate">{label}</span>
      {count > 0 && <CountBadge count={count} max={9} />}
      <Tooltip label={accessibleName} side="right" />
    </Link>
  );
}

function ProfileBlock({
  username,
  avatarUrl,
  seed,
  connected,
}: {
  username: string;
  avatarUrl?: string | null;
  seed?: string;
  connected: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  // The trigger is held in state rather than a ref: the popover needs the element
  // to position against and to restore focus to, and reading a ref during render is
  // not allowed (the value would not be there on the first pass anyway).
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);

  return (
    <div className="border-t border-[var(--app-rail-hover)] py-3">
      <button
        ref={setTrigger}
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        className={cn(
          "app-rail-row group/rail flex w-full items-center gap-1 py-1.5 text-left text-[var(--app-rail-text)] transition-colors duration-150 motion-reduce:transition-none hover:text-[var(--app-rail-text-strong)]",
          tooltipTriggerClass
        )}
      >
        {/* The same 48 px box and 44 px square as the destination rows, so the avatar's
            centre is also 36 px when the rail is collapsed and its hover highlight is
            the same size as every other icon's. */}
        <RailSquare>
          <Avatar
            name={username}
            seed={seed}
            src={avatarUrl}
            status={connected ? "ONLINE" : "OFFLINE"}
            presenceRing="var(--app-rail)"
          />
        </RailSquare>
        <span className="app-rail-label min-w-0 flex-1">
          <span className="block truncate font-ui text-[15px] font-medium text-[var(--app-rail-text-strong)]">
            {username}
          </span>
          <span className="block truncate font-ui text-xs text-[var(--app-rail-text)]">
            {connected ? "Online" : "Reconnecting…"}
          </span>
        </span>
        <Tooltip label={`${username}, ${connected ? "online" : "reconnecting"}`} side="right" />
      </button>

      <Popover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={trigger}
        label="Account"
        side="top"
      >
        <Link
          href={SETTINGS_HREF}
          className={popoverItemClasses()}
          onClick={() => setMenuOpen(false)}
        >
          <Settings size={16} strokeWidth={1.75} aria-hidden="true" />
          Settings
        </Link>
        <Link
          href={NOTIFICATION_PREFERENCES_HREF}
          className={popoverItemClasses()}
          onClick={() => setMenuOpen(false)}
        >
          <Bell size={16} strokeWidth={1.75} aria-hidden="true" />
          Notification preferences
        </Link>
      </Popover>
    </div>
  );
}
