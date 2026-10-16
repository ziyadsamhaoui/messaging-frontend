"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, MailPlus, MessagesSquare, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AppDestination,
  destinationHref,
  SETTINGS_HREF,
  AppRoute,
} from "@/lib/appRoute";
import { useAuth } from "@/hooks/useAuth";
import { useUiStore } from "@/store/uiStore";
import { Avatar } from "@/components/ui/Avatar";

const ICON_SIZE = 22;

const DESTINATIONS: Array<{
  value: AppDestination;
  label: string;
  Icon: typeof MessagesSquare;
}> = [
  { value: "chats", label: "Conversations", Icon: MessagesSquare },
  { value: "connections", label: "Connections", Icon: Users },
  { value: "invites", label: "Invites", Icon: MailPlus },
  { value: "notifications", label: "Notifications", Icon: Bell },
];

interface RailProps {
  route: AppRoute;
}

/**
 * Zone one: the primary navigation.
 *
 * Real links in a `nav` landmark, not buttons: every destination has a URL, so
 * middle-click, "open in new tab" and a browser back button all behave. The active
 * destination carries `aria-current="page"`, and the row is marked by a surface
 * tint *and* a 3 px accent bar so the selection is never carried by colour alone.
 */
export function Rail({ route }: RailProps) {
  const auth = useAuth();
  const socketState = useUiStore((state) => state.socketState);
  const username = auth.user?.username ?? "Signed in";

  const isSettings = route.isSettings;
  const active: AppDestination | "settings" = isSettings ? "settings" : route.destination;

  return (
    <nav
      aria-label="Primary"
      className="flex h-full w-[248px] shrink-0 flex-col bg-[var(--app-rail)] max-md:w-[72px]"
    >
      <div className="flex h-[72px] shrink-0 items-center gap-3 px-4">
        <Link href="/" className="focus-ring flex items-center gap-3 rounded-xl" aria-label="BadrLink home">
          <Image src="/favicon.png" width={36} height={36} alt="" className="rounded-lg" />
          <span className="font-display text-[22px] font-semibold text-[var(--app-rail-text-strong)] max-md:hidden">
            BadrLink
          </span>
        </Link>
      </div>

      <ul className="flex flex-col gap-1 px-3 max-md:px-3">
        {DESTINATIONS.map(({ value, label, Icon }) => (
          <li key={value}>
            <RailLink
              href={destinationHref(value)}
              label={label}
              active={active === value}
              icon={<Icon size={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" />}
            />
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      <ul className="flex flex-col gap-1 px-3 pb-2">
        <li>
          <RailLink
            href={SETTINGS_HREF}
            label="Settings"
            active={active === "settings"}
            icon={<Settings size={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" />}
          />
        </li>
      </ul>

      <div className="border-t border-[var(--app-rail-hover)] px-3 py-3">
        <div className="flex items-center gap-3 px-1">
          <Avatar
            name={username}
            seed={auth.session?.userId}
            src={auth.user?.profilePictureUrl}
            status={socketState === "connected" ? "ONLINE" : "OFFLINE"}
            presenceRing="var(--app-rail)"
          />
          <div className="min-w-0 max-md:hidden">
            <p className="truncate font-ui text-[15px] font-medium text-[var(--app-rail-text-strong)]">
              {username}
            </p>
            <p className="truncate font-ui text-xs text-[var(--app-rail-text)]">
              {socketState === "connected" ? "Online" : "Reconnecting…"}
            </p>
          </div>
        </div>
      </div>
    </nav>
  );
}

function RailLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring relative flex h-11 items-center gap-3 rounded-[var(--radius-control)] px-3 font-ui text-[15px] font-medium transition-colors duration-150 motion-reduce:transition-none",
        "max-md:justify-center max-md:px-0",
        active
          ? "bg-[var(--app-rail-active)] text-[var(--app-rail-text-strong)]"
          : "text-[var(--app-rail-text)] hover:bg-[var(--app-rail-hover)] hover:text-[var(--app-rail-text-strong)]"
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-sage)]"
        />
      )}
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      <span className="truncate max-md:hidden">{label}</span>
    </Link>
  );
}
