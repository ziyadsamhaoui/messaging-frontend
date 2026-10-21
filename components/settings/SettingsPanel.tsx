"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Ban,
  Bell,
  BellRing,
  Info,
  Keyboard,
  LogOut,
  Palette,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { SearchInput } from "@/components/ui/SearchInput";
import { Avatar } from "@/components/ui/Avatar";
import { Dot } from "@/components/ui/Badge";
import { useAuth } from "@/hooks/useAuth";
import { useBlockedUserIds } from "@/hooks/useBlocks";
import { useNotificationPreferences } from "@/hooks/useNotifications";
import { usePrefsStore } from "@/store/prefsStore";
import { usePushStatus } from "@/hooks/usePush";
import { pushBlockingReason } from "@/lib/push";
import { settingsHref, SettingsSection } from "@/lib/appRoute";
import { SettingsIndexRow } from "./parts";
import { version } from "@/package.json";

interface RowSpec {
  section: SettingsSection;
  group: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  keywords: string;
  attention?: boolean;
}

export function SettingsPanel({
  selected,
  hideOnNarrow,
}: {
  selected: SettingsSection | null;
  hideOnNarrow?: boolean;
}) {
  const [query, setQuery] = useState("");
  const auth = useAuth();
  const router = useRouter();
  const blocked = useBlockedUserIds(auth.session?.userId);
  const preferences = useNotificationPreferences(Boolean(auth.session));
  const push = usePushStatus();
  const prefs = usePrefsStore();

  const mutedCount = preferences.data?.mutedTypes.length ?? 0;
  const blockedCount = blocked.data?.length ?? 0;

  const pushLabel = useMemo(() => {
    if (pushBlockingReason()) return push.state === "unsupported" ? "Not supported" : "Not available";
    if (push.state === "blocked") return "Blocked in browser";
    if (push.state === "enabled") return "On";
    return "Off";
  }, [push.state]);

  const rows: RowSpec[] = [
    {
      section: "profile",
      group: "Account",
      title: "Profile",
      subtitle: "Username, photo, about",
      icon: <UserRound size={20} strokeWidth={1.75} />,
      keywords: "name avatar picture bio description username",
    },
    {
      section: "account",
      group: "Account",
      title: "Account and security",
      subtitle: "Sign-in and member since",
      icon: <ShieldCheck size={20} strokeWidth={1.75} />,
      keywords: "email password security sign in login",
    },
    {
      section: "notifications",
      group: "Notifications",
      title: "Notification preferences",
      subtitle:
        mutedCount === 0 ? "All types on" : `${mutedCount} type${mutedCount === 1 ? "" : "s"} muted`,
      icon: <Bell size={20} strokeWidth={1.75} />,
      keywords: "mute types messages reactions invitations system",
    },
    {
      section: "push",
      group: "Notifications",
      title: "Push on this device",
      subtitle: pushLabel,
      icon: <BellRing size={20} strokeWidth={1.75} />,
      keywords: "push notifications browser permission test diagnostics",
      attention: push.state === "blocked",
    },
    {
      section: "blocked",
      group: "Privacy",
      title: "Blocked users",
      subtitle: blockedCount === 0 ? "No one blocked" : `${blockedCount} blocked`,
      icon: <Ban size={20} strokeWidth={1.75} />,
      keywords: "block unblock privacy",
    },
    {
      section: "appearance",
      group: "Chats",
      title: "Appearance and chat behavior",
      subtitle: `${prefs.textSize === "default" ? "Default text" : `${prefs.textSize} text`}, ${
        prefs.timeFormat === "12h" ? "12-hour" : "24-hour"
      }`,
      icon: <Palette size={20} strokeWidth={1.75} />,
      keywords: "text size density time format enter key sidebar motion appearance compact",
    },
    {
      section: "shortcuts",
      group: "Help",
      title: "Keyboard shortcuts",
      subtitle: "Navigate faster",
      icon: <Keyboard size={20} strokeWidth={1.75} />,
      keywords: "keys keyboard shortcut help",
    },
    {
      section: "about",
      group: "Help",
      title: "About BadrLink",
      subtitle: `Version ${version}`,
      icon: <Info size={20} strokeWidth={1.75} />,
      keywords: "version about build environment",
    },
  ];

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? rows.filter((row) =>
        `${row.title} ${row.subtitle} ${row.keywords} ${row.group}`.toLowerCase().includes(needle)
      )
    : rows;

  const groups = useMemo(() => {
    const map = new Map<string, RowSpec[]>();
    for (const row of visible) {
      const list = map.get(row.group) ?? [];
      list.push(row);
      map.set(row.group, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  const username = auth.user?.username ?? "Signed in";

  async function signOut() {
    await auth.logout();
    router.replace("/login");
  }

  return (
    <SectionPanel
      title="Settings"
      hideOnNarrow={hideOnNarrow}
      toolbar={
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search settings"
          aria-label="Search settings"
        />
      }
    >
      <div className="flex flex-col gap-4 px-2 pb-2">
        <Link
          href={settingsHref("profile")}
          className="focus-ring flex items-center gap-3 rounded-[18px] border border-[rgba(164,190,123,0.24)] bg-[rgba(164,190,123,0.1)] p-3 transition-colors duration-150 motion-reduce:transition-none hover:bg-[rgba(164,190,123,0.16)]"
        >
          <Avatar
            name={username}
            seed={auth.session?.userId}
            src={auth.user?.profilePictureUrl}
            size={48}
            presenceRing="var(--app-panel)"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-ui text-[15px] font-semibold text-[var(--app-panel-text)]">
              {username}
            </span>
            <span className="block truncate font-ui text-[13px] text-[var(--app-panel-text-soft)]">
              @{auth.user?.username ?? "you"}
            </span>
            <span className="block truncate font-ui text-[13px] text-[var(--app-panel-text-soft)]">
              {auth.user?.description?.trim() ? auth.user.description : "Add an about"}
            </span>
          </span>
          <span className="shrink-0 self-start rounded-full bg-[rgba(164,190,123,0.18)] px-2 py-0.5 font-ui text-[12px] font-medium text-[var(--app-panel-text)]">
            Edit profile
          </span>
        </Link>

        {groups.length === 0 ? (
          <p className="px-2 py-6 text-center font-ui text-[13px] text-[var(--app-panel-text-soft)]">
            No settings match “{query}”.
          </p>
        ) : (
          groups.map(([group, groupRows]) => (
            <div key={group} className="flex flex-col gap-0.5">
              <h2 className="px-2.5 pb-1 font-ui text-[12px] font-semibold uppercase tracking-wide text-[var(--app-panel-text-soft)]">
                {group}
              </h2>
              {groupRows.map((row) => (
                <SettingsIndexRow
                  key={row.section}
                  href={settingsHref(row.section)}
                  icon={row.icon}
                  title={row.title}
                  subtitle={row.subtitle}
                  selected={selected === row.section}
                  action={
                    row.attention ? (
                      <Dot className="bg-[var(--color-warning)]" />
                    ) : undefined
                  }
                />
              ))}
            </div>
          ))
        )}

        <div className="mt-1 border-t border-[var(--app-panel-divider)] pt-2 md:hidden">
          <SettingsIndexRow
            icon={<LogOut size={20} strokeWidth={1.75} />}
            title="Sign out"
            subtitle="End this session on this device"
            danger
            onClick={() => void signOut()}
          />
        </div>
      </div>
    </SectionPanel>
  );
}
