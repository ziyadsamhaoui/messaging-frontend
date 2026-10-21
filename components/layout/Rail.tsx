"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
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
import { NAV_DESTINATIONS } from "./navDestinations";

const ICON_SIZE = 22;

function RailSquare({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-11 w-12 shrink-0 items-center justify-center">
      <span className="app-rail-square relative flex h-11 w-11 items-center justify-center rounded-xl">
        {children}
      </span>
    </span>
  );
}

interface RailProps {
  route: AppRoute;
}

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "b") return;
      const target = event.target as HTMLElement | null;
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
      <div className="app-rail-header flex h-[72px] shrink-0 items-center gap-2 pl-3 pr-2">
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
            "app-rail-row app-rail-toggle ml-auto flex h-11 shrink-0 items-center justify-center text-[var(--app-rail-text)]",
            "max-md:hidden"
          )}
        >
          <RailSquare>
            {collapsed ? (
              <PanelLeftOpen size={20} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={20} strokeWidth={1.75} aria-hidden="true" />
            )}
          </RailSquare>
        </button>
      </div>

      <ul className="flex flex-col gap-1">
        {NAV_DESTINATIONS.map(({ value, label, Icon, countKey }) => {
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
