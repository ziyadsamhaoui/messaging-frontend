"use client";

import React, { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { MainPane } from "@/components/layout/MainPane";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/useNotifications";
import { errorMessage } from "@/lib/errors";
import { isPushSupported, subscribeToPush } from "@/lib/push";
import { NotificationType, PreferencesResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

const NOTIFICATION_TYPES: NotificationType[] = ["MESSAGE", "REACTION", "INVITATION", "SYSTEM"];

const TYPE_LABELS: Record<NotificationType, string> = {
  MESSAGE: "New messages",
  REACTION: "Reactions",
  INVITATION: "Room invitations",
  SYSTEM: "System notices",
};

/**
 * Notification preferences, rendered in the main pane rather than as a modal: it is
 * a destination the profile menu links to, so it needs a URL like everything else.
 */
export function NotificationPreferencesView() {
  const preferencesQuery = useNotificationPreferences(true);

  return (
    <MainPane>
      <header className="flex h-[72px] shrink-0 items-center border-b border-[var(--app-pane-divider)] px-6">
        <h1 className="font-display text-[17px] font-semibold text-[var(--app-pane-text)]">
          Notification preferences
        </h1>
      </header>
      <div className="app-scroll-light min-h-0 flex-1 overflow-y-auto px-6 py-6">
        {preferencesQuery.isError ? (
          <ErrorBlock
            tone="pane"
            title="Couldn't load preferences"
            reason={errorMessage(preferencesQuery.error)}
            onRetry={() => void preferencesQuery.refetch()}
          />
        ) : preferencesQuery.isLoading || !preferencesQuery.data ? (
          <div className="flex max-w-xl flex-col gap-2">
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
      </div>
    </MainPane>
  );
}

function PreferencesForm({ preferences }: { preferences: PreferencesResponse }) {
  const toast = useToast();
  const updatePreferences = useUpdateNotificationPreferences();
  const [mutedTypes, setMutedTypes] = useState<Set<NotificationType>>(new Set(preferences.mutedTypes));
  const [pushEnabled, setPushEnabled] = useState(preferences.pushEnabled);
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pushSupported = isPushSupported();
  const permissionGranted =
    pushSupported && typeof Notification !== "undefined" && Notification.permission === "granted";
  const pushActive = subscribed || permissionGranted;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updatePreferences.mutateAsync({ mutedTypes: Array.from(mutedTypes), pushEnabled });
      toast.push("Notification preferences saved.", "success");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <section className="flex flex-col gap-2">
        <h2 className="font-ui text-[15px] font-semibold text-[var(--app-pane-text)]">Mute by type</h2>
        <p className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">
          A muted type still arrives in this list; it stops sending you a notification.
        </p>
        {NOTIFICATION_TYPES.map((type) => (
          <label
            key={type}
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-pane-control-border)] px-3 py-2"
          >
            <span className="font-ui text-[15px] text-[var(--app-pane-text)]">{TYPE_LABELS[type]}</span>
            <input
              type="checkbox"
              checked={mutedTypes.has(type)}
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
              className="focus-ring-light h-5 w-5 accent-[var(--color-primary)]"
              aria-label={`Mute ${TYPE_LABELS[type]}`}
            />
          </label>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-ui text-[15px] font-semibold text-[var(--app-pane-text)]">Push</h2>
        <label className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-pane-control-border)] px-3 py-2">
          <span className="font-ui text-[15px] text-[var(--app-pane-text)]">Push notifications</span>
          <input
            type="checkbox"
            checked={pushEnabled}
            onChange={(event) => setPushEnabled(event.target.checked)}
            className="focus-ring-light h-5 w-5 accent-[var(--color-primary)]"
            aria-label="Enable push notifications globally"
          />
        </label>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--app-pane-control-border)] px-3 py-2">
          <span>
            <span className="block font-ui text-[15px] text-[var(--app-pane-text)]">This device</span>
            <span className="block font-ui text-[13px] text-[var(--app-pane-text-soft)]">
              {!pushSupported
                ? "Push is not supported in this browser."
                : pushActive
                  ? "Subscribed to web push on this device."
                  : "Register this browser for web push delivery."}
            </span>
          </span>
          <button
            type="button"
            onClick={async () => {
              setSubscribing(true);
              try {
                const result = await subscribeToPush();
                if (result.ok) {
                  setSubscribed(true);
                  toast.push("Push notifications enabled on this device.", "success");
                } else {
                  toast.push(result.reason, "error");
                }
              } catch (pushError) {
                toast.push(errorMessage(pushError), "error");
              } finally {
                setSubscribing(false);
              }
            }}
            disabled={!pushSupported || pushActive || subscribing}
            className={buttonClasses({ variant: "secondary", size: "sm", tone: "light" })}
          >
            {subscribing ? "Subscribing…" : "Enable push"}
          </button>
        </div>
      </section>

      {error && (
        <p role="alert" className="font-ui text-[13px] font-medium text-[var(--app-danger-on-light)]">
          {error}
        </p>
      )}

      <div className={cn("flex items-center gap-3")}>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className={buttonClasses({ variant: "primary", size: "md", tone: "light" })}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
