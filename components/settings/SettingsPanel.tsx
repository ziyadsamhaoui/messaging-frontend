"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Bell, Keyboard, LogOut, UserRound } from "lucide-react";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { SearchInput } from "@/components/ui/SearchInput";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { settingsHref, SettingsSection } from "@/lib/appRoute";
import { useProfileDraftStore } from "@/store/profileDraftStore";
import { SettingsIndexRow } from "./parts";

interface RowSpec {
  section: SettingsSection;
  title: string;
  icon: React.ReactNode;
  keywords: string;
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
  const draft = useProfileDraftStore((store) => store.draft);

  const rows: RowSpec[] = [
    {
      section: "profile",
      title: "Profile",
      icon: <UserRound size={20} strokeWidth={1.75} />,
      keywords:
        "name avatar picture photo bio about description username email password security sign in login account sessions two factor delete member",
    },
    {
      section: "notifications",
      title: "Notification preferences",
      icon: <Bell size={20} strokeWidth={1.75} />,
      keywords: "mute types messages reactions invitations system alerts",
    },
    {
      section: "blocked",
      title: "Blocked users",
      icon: <Ban size={20} strokeWidth={1.75} />,
      keywords: "block unblock privacy",
    },
    {
      section: "shortcuts",
      title: "Keyboard shortcuts",
      icon: <Keyboard size={20} strokeWidth={1.75} />,
      keywords: "keys keyboard shortcut help",
    },
  ];

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? rows.filter((row) => `${row.title} ${row.keywords}`.toLowerCase().includes(needle))
    : rows;

  const savedName = auth.user?.username ?? "";
  const name = draft ? draft.username.trim() || savedName : savedName;
  const about = draft ? draft.description.trim() : (auth.user?.description ?? "").trim();
  const picture = draft ? draft.pictureUrl : (auth.user?.profilePictureUrl ?? null);

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
          aria-label={`Edit your profile, ${name || "your name"}`}
          className="focus-ring-light flex min-w-0 items-center gap-3 rounded-[18px] border border-[rgba(164,190,123,0.24)] bg-[rgba(164,190,123,0.1)] p-3 transition-colors hover:bg-[rgba(164,190,123,0.16)]"
        >
          <Avatar
            name={name || "You"}
            seed={auth.session?.userId}
            src={picture}
            size={48}
            presenceRing="var(--app-panel)"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-ui text-[15px] font-semibold text-[var(--app-panel-text)]">
              {name || "Your profile"}
            </span>
            <span className="block truncate font-ui text-[13px] text-[var(--app-panel-text-soft)]">
              {about || (name ? `@${name}` : "Add a name and a picture")}
            </span>
          </span>
        </Link>

        {visible.length === 0 ? (
          <p className="px-2 py-6 text-center font-ui text-[13px] text-[var(--app-panel-text-soft)]">
            No settings match “{query}”.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {visible.map((row) => (
              <SettingsIndexRow
                key={row.section}
                href={settingsHref(row.section)}
                icon={row.icon}
                title={row.title}
                selected={selected === row.section}
              />
            ))}
          </div>
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
