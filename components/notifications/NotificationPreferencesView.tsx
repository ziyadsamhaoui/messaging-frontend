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
import { Send } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { usePushStatus } from "@/hooks/usePush";
import { errorMessage } from "@/lib/errors";
import { disablePush, enablePush, pushBlockingReason, showTestNotification } from "@/lib/push";
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

export function NotificationPreferencesView() {
  return (
    <MainPane>
      <NotificationPreferencesEditor />
    </MainPane>
  );
}

export function NotificationPreferencesEditor({ onBack }: { onBack?: () => void }) {
  const preferencesQuery = useNotificationPreferences(true);

  return (
    <SettingsEditorShell
      icon={<Bell size={26} strokeWidth={1.75} />}
      title="Notification preferences"
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
        <PreferencesForm
          key={preferencesQuery.dataUpdatedAt}
          preferences={preferencesQuery.data}
        />
      )}
    </SettingsEditorShell>
  );
}

function DevicePushControls() {
  const toast = useToast();
  const status = usePushStatus(4000);
  const [busy, setBusy] = useState(false);
  const blocking = pushBlockingReason();

  const copy =
    blocking && status.state === "unsupported"
      ? { title: "Not supported", body: blocking }
      : status.state === "blocked"
        ? {
            title: "Blocked in the browser",
            body: "Notifications are denied for this site. Allow them in the browser's site settings, then reload.",
          }
        : status.state === "enabled"
          ? {
              title: "Enabled on this device",
              body: "Notifications arrive while the app is closed, as long as the server can send them.",
            }
          : {
              title: "Not enabled",
              body: "Turn push on for this browser to be notified when the app is not in front of you.",
            };

  async function toggle() {
    setBusy(true);
    try {
      const result = status.state === "enabled" ? await disablePush() : await enablePush();
      if (result.ok) {
        toast.push(status.state === "enabled" ? "Push disabled on this device." : "Push enabled on this device.", "success");
      } else {
        toast.push(result.reason, "error");
      }
      await status.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const result = await showTestNotification();
      if (!result.ok) toast.push(result.reason, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`h-2.5 w-2.5 rounded-full ${
            status.state === "enabled"
              ? "bg-[var(--color-sage)]"
              : status.state === "blocked"
                ? "bg-[var(--color-warning)]"
                : "bg-[var(--app-pane-control-border)]"
          }`}
        />
        <p className="font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
          {status.ready ? copy.title : "Checking…"}
        </p>
      </div>
      <p className="font-ui text-[13px] leading-relaxed text-[var(--app-pane-text-soft)]">{copy.body}</p>
      <div className="flex flex-wrap items-center gap-2">
        {status.state !== "blocked" && status.state !== "unsupported" && (
          <button
            type="button"
            onClick={() => void toggle()}
            disabled={busy}
            className={buttonClasses({
              variant: status.state === "enabled" ? "secondary" : "primary",
              size: "md",
              tone: "pane",
            })}
          >
            {status.state === "enabled" ? "Disable on this device" : "Enable on this device"}
          </button>
        )}
        <button
          type="button"
          onClick={() => void test()}
          disabled={busy || status.permission !== "granted"}
          className={buttonClasses({ variant: "secondary", size: "md", tone: "pane" })}
        >
          <Send size={16} strokeWidth={1.75} aria-hidden="true" />
          Send test notification
        </button>
      </div>
    </div>
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
      </SettingsCard>

      <SettingsCard title="This device">
        <DevicePushControls />
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
