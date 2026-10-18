"use client";

import React, { useState } from "react";
import { Bell } from "lucide-react";
import { MainPane } from "@/components/layout/MainPane";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { SavedNote, SettingsCard, SettingsEditorShell, SettingsRow, SettingsSaveBar } from "@/components/settings/parts";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useNotifications";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/errors";
import { NotificationType, PreferencesResponse } from "@/lib/types";

const NOTIFICATION_TYPES: NotificationType[] = ["MESSAGE", "REACTION", "INVITATION", "SYSTEM"];

const TYPE_LABELS: Record<NotificationType, string> = {
  MESSAGE: "New messages",
  REACTION: "Reactions",
  INVITATION: "Room invitations",
  SYSTEM: "System notices",
};

const TYPE_DESCRIPTIONS: Record<NotificationType, string> = {
  MESSAGE: "Someone sends you a message in a room you are in.",
  REACTION: "Someone reacts to one of your messages.",
  INVITATION: "You are invited to join a room.",
  SYSTEM: "Service notices and announcements.",
};

/**
 * Notification preferences as a destination of the notifications section, where the
 * list stays visible beside it.
 */
export function NotificationPreferencesView() {
  return (
    <MainPane>
      <NotificationPreferencesEditor />
    </MainPane>
  );
}

/**
 * The editor itself: which types arrive, and whether push is allowed for the account.
 *
 * Shared by the notifications destination and by Settings → Notification preferences,
 * so the two can never disagree about what the switches mean. The per-device push
 * controls are deliberately not here — they need the browser's own answer, which is
 * what Settings → Push on this device is for.
 */
export function NotificationPreferencesEditor({ onBack }: { onBack?: () => void }) {
  const preferencesQuery = useNotificationPreferences(true);

  return (
    <SettingsEditorShell
      icon={<Bell size={26} strokeWidth={1.75} />}
      title="Notification preferences"
      description="Which notifications you receive, and whether they may reach you by push at all."
      onBack={onBack}
    >
      {preferencesQuery.isError ? (
        <ErrorBlock
          tone="pane"
          title="Couldn't load preferences"
          reason={errorMessage(preferencesQuery.error)}
          onRetry={() => void preferencesQuery.refetch()}
        />
      ) : preferencesQuery.isLoading || !preferencesQuery.data ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : (
        // Keyed on the server version so a refetch re-initialises the form from the
        // stored values rather than leaving half-applied local state on screen.
        <PreferencesForm
          key={preferencesQuery.dataUpdatedAt}
          preferences={preferencesQuery.data}
        />
      )}
    </SettingsEditorShell>
  );
}

function PreferencesForm({ preferences }: { preferences: PreferencesResponse }) {
  const toast = useToast();
  const updatePreferences = useUpdateNotificationPreferences();
  const [mutedTypes, setMutedTypes] = useState<Set<NotificationType>>(
    new Set(preferences.mutedTypes)
  );
  const [pushEnabled, setPushEnabled] = useState(preferences.pushEnabled);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    pushEnabled !== preferences.pushEnabled ||
    mutedTypes.size !== preferences.mutedTypes.length ||
    [...mutedTypes].some((type) => !preferences.mutedTypes.includes(type));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updatePreferences.mutateAsync({ mutedTypes: Array.from(mutedTypes), pushEnabled });
      setSaved(true);
      toast.push("Notification preferences saved.", "success");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SettingsCard title="Types">
        {NOTIFICATION_TYPES.map((type) => (
          <SettingsRow
            key={type}
            title={TYPE_LABELS[type]}
            description={TYPE_DESCRIPTIONS[type]}
            control={
              <Switch
                surface="pane"
                label={TYPE_LABELS[type]}
                checked={!mutedTypes.has(type)}
                onChange={() =>
                  setMutedTypes((previous) => {
                    const next = new Set(previous);
                    if (next.has(type)) {
                      next.delete(type);
                    } else {
                      next.add(type);
                    }
                    return next;
                  })
                }
              />
            }
          />
        ))}
      </SettingsCard>

      <p className="font-ui text-[13px] leading-relaxed text-[var(--app-pane-text-soft)]">
        A type you switch off still arrives in your notification list; it stops sending you a
        notification.
      </p>

      <SettingsCard title="Push">
        <SettingsRow
          title="Push notifications"
          description="Whether this account may receive push at all. Turning it off stops every push to every device without unsubscribing them."
          control={
            <Switch
              surface="pane"
              label="Push notifications"
              checked={pushEnabled}
              onChange={setPushEnabled}
            />
          }
        />
        <SettingsRow
          title="This browser"
          description="Permission and the subscription are per device. Settings → Push on this device shows what this browser is actually doing."
        />
      </SettingsCard>

      {error && (
        <p role="alert" className="font-ui text-[13px] font-medium text-[var(--app-danger-on-light)]">
          {error}
        </p>
      )}

      <SavedNote visible={saved && !dirty} />

      <SettingsSaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={() => {
          setMutedTypes(new Set(preferences.mutedTypes));
          setPushEnabled(preferences.pushEnabled);
          setError(null);
        }}
        saveLabel="Save preferences"
      />
    </>
  );
}
