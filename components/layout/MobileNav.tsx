"use client";

import React from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppDestination, AppRoute, destinationHref, SETTINGS_HREF } from "@/lib/appRoute";
import { useUnreadCount } from "@/hooks/useNotifications";
import { usePendingInvitations } from "@/hooks/useInvitations";
import { usePendingConnections } from "@/hooks/useConnections";
import { RailBadge } from "@/components/ui/Badge";
import { NAV_DESTINATIONS } from "./navDestinations";

const ICON_SIZE = 24;

export function MobileNav({ route }: { route: AppRoute }) {
  const unread = useUnreadCount(true);
  const invitations = usePendingInvitations(true);
  const pendingConnections = usePendingConnections(true);

  const counts: Record<string, number> = {
    unread: unread.data?.count ?? 0,
    requests: (pendingConnections.data ?? []).filter(
      (connection) => connection.direction === "INCOMING"
    ).length,
    invites: (invitations.data ?? []).filter(
      (invitation) => invitation.direction === "INCOMING"
    ).length,
  };

  const active: AppDestination | "settings" = route.isSettings ? "settings" : route.destination;

  return (
    <nav
      aria-label="Primary"
      className="shrink-0 border-t border-[rgba(164,190,123,0.16)] bg-[color-mix(in_srgb,var(--app-rail)_45%,black)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_DESTINATIONS.map(({ value, label, Icon, countKey }) => (
          <li key={value}>
            <MobileTab
              href={destinationHref(value)}
              label={label}
              count={countKey ? counts[countKey] : 0}
              countSuffix={countKey === "unread" ? "unread" : undefined}
              active={active === value}
              icon={<Icon size={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" />}
            />
          </li>
        ))}
        <li>
          <MobileTab
            href={SETTINGS_HREF}
            label="Settings"
            count={0}
            active={active === "settings"}
            icon={<Settings size={ICON_SIZE} strokeWidth={1.75} aria-hidden="true" />}
          />
        </li>
      </ul>
    </nav>
  );
}

function MobileTab({
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
      className={cn(
        "focus-ring flex min-h-14 flex-col items-center justify-center gap-1 rounded-[10px] px-1 pb-1.5 pt-2 font-ui text-[15px] font-medium transition-colors duration-150 motion-reduce:transition-none",
        active ? "text-[var(--app-rail-text-strong)]" : "text-[var(--app-rail-text)]"
      )}
    >
      <span
        className={cn(
          "relative flex h-8 w-12 items-center justify-center rounded-full",
          active && "bg-[var(--app-rail-icon-active)]"
        )}
      >
        {icon}
        <RailBadge count={count} max={9} />
      </span>
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}
