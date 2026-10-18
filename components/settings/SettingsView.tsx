"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Settings as SettingsIcon } from "lucide-react";
import { MainPane } from "@/components/layout/MainPane";
import { SETTINGS_HREF, SettingsSection } from "@/lib/appRoute";
import { SettingsPanel } from "./SettingsPanel";
import { ProfileEditor } from "./ProfileEditor";
import { NotificationPreferencesEditor } from "@/components/notifications/NotificationPreferencesView";
import {
  AboutEditor,
  AccountEditor,
  AppearanceEditor,
  BlockedUsersEditor,
  PushEditor,
  ShortcutsEditor,
} from "./editors";

/**
 * Settings, as a list beside one editor.
 *
 * The panel on the left is the index and the pane on the right is the open editor —
 * the same two-zone layout every other destination uses, rather than one long page
 * that stacked seven unrelated forms under one "Save". The open editor is part of the
 * URL (`/app/settings/<section>`), so it can be linked to, reloaded and reached with
 * the back button, and the panel derives its selected row from the same route.
 *
 * Below `md` only one zone is visible at a time: the list when no editor is open, the
 * editor (with a back control) when one is.
 */
export function SettingsView({ section }: { section: SettingsSection | null }) {
  const router = useRouter();
  const back = () => router.push(SETTINGS_HREF);

  return (
    <>
      <SettingsPanel selected={section} hideOnNarrow={section !== null} />
      <MainPane hideOnNarrow={section === null}>
        {/*
          The panel's `h1` is removed from the accessibility tree below `md` along with
          the panel itself, so the open editor needs a top-level heading of its own.
          It is visually hidden on a phone and absent on a desk, where the panel's
          heading already plays that role — either way there is exactly one `h1`.
        */}
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
    case "account":
      return <AccountEditor onBack={onBack} />;
    case "notifications":
      return <NotificationPreferencesEditor onBack={onBack} />;
    case "push":
      return <PushEditor onBack={onBack} />;
    case "blocked":
      return <BlockedUsersEditor onBack={onBack} />;
    case "appearance":
      return <AppearanceEditor onBack={onBack} />;
    case "shortcuts":
      return <ShortcutsEditor onBack={onBack} />;
    case "about":
      return <AboutEditor onBack={onBack} />;
  }
}
