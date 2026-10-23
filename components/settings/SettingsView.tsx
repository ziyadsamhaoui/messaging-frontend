"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";
import { MainPane } from "@/components/layout/MainPane";
import { SETTINGS_HREF, SettingsSection } from "@/lib/appRoute";
import { SettingsPanel } from "./SettingsPanel";
import { ProfileEditor } from "./ProfileEditor";
import { NotificationPreferencesEditor } from "@/components/notifications/NotificationPreferencesView";
import { BlockedUsersEditor, ShortcutsEditor } from "./editors";

export function SettingsView({ section }: { section: SettingsSection | null }) {
  const router = useRouter();
  const back = () => router.push(SETTINGS_HREF);

  return (
    <>
      <SettingsPanel selected={section} hideOnNarrow={section !== null} />
      <MainPane hideOnNarrow={section === null}>
        {section !== null && <h1 className="sr-only md:hidden">Settings</h1>}
        {section === null ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <span
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(40,84,48,0.1)] text-[var(--app-pane-text-soft)]"
            >
              <SettingsIcon size={26} strokeWidth={1.5} />
            </span>
            <p className="font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
              Choose a setting to change
            </p>
            <p className="max-w-sm font-ui text-[13px] leading-relaxed text-[var(--app-pane-text-soft)]">
              The list on the left says what each one is currently set to. Every section opens
              here, and the browser&apos;s back button returns to this list.
            </p>
          </div>
        ) : (
          <SettingsEditor section={section} onBack={back} />
        )}
      </MainPane>
    </>
  );
}

function SettingsEditor({ section, onBack }: { section: SettingsSection; onBack: () => void }) {
  switch (section) {
    case "profile":
      return <ProfileEditor onBack={onBack} />;
    case "notifications":
      return <NotificationPreferencesEditor onBack={onBack} />;
    case "blocked":
      return <BlockedUsersEditor onBack={onBack} />;
    case "shortcuts":
      return <ShortcutsEditor onBack={onBack} />;
  }
}
