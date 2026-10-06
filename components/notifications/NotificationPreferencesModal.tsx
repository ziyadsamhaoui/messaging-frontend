"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { useToast } from "../ui/Toast";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "../../hooks/useNotifications";
import { errorMessage } from "../../lib/errors";
import { isPushSupported, subscribeToPush } from "../../lib/push";
import { NotificationType, PreferencesResponse } from "../../lib/types";

const NOTIFICATION_TYPES: NotificationType[] = ["MESSAGE", "REACTION", "INVITATION", "SYSTEM"];

const TYPE_LABELS: Record<NotificationType, string> = {
  MESSAGE: "New messages",
  REACTION: "Reactions",
  INVITATION: "Room invitations",
  SYSTEM: "System notices",
};

interface NotificationPreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPreferencesModal({ open, onClose }: NotificationPreferencesModalProps) {
  const preferencesQuery = useNotificationPreferences(open);

  return (
    <Modal open={open} onClose={onClose} title="Notification preferences">
      {preferencesQuery.isLoading || !preferencesQuery.data ? (
        <div className="text-sm text-[rgba(164,190,123,0.7)]">Loading…</div>
      ) : (
        <PreferencesForm preferences={preferencesQuery.data} onClose={onClose} />
      )}
    </Modal>
  );
}

interface PreferencesFormProps {
  preferences: PreferencesResponse;
  onClose: () => void;
}

function PreferencesForm({ preferences, onClose }: PreferencesFormProps) {
  const toast = useToast();
  const updatePreferences = useUpdateNotificationPreferences();
  const [mutedTypes, setMutedTypes] = useState<Set<NotificationType>>(
    new Set(preferences.mutedTypes)
  );
  const [pushEnabled, setPushEnabled] = useState(preferences.pushEnabled);
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const pushSupported = isPushSupported();
  const permissionGranted =
    pushSupported && typeof Notification !== "undefined" && Notification.permission === "granted";
  const pushActive = subscribed || permissionGranted;

  function toggleType(type: NotificationType) {
    setMutedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await updatePreferences.mutateAsync({
        mutedTypes: Array.from(mutedTypes),
        pushEnabled,
      });
      toast.push("Notification preferences saved.", "success");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  }

  async function enablePush() {
    setSubscribing(true);
    try {
      const result = await subscribeToPush();
      if (result.ok) {
        setSubscribed(true);
        toast.push("Push notifications enabled on this device.", "success");
      } else {
        toast.push(result.reason, "error");
      }
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-[var(--color-text-secondary)]">Muted types</span>
        {NOTIFICATION_TYPES.map((type) => (
          <label
            key={type}
            className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(164,190,123,0.15)] px-3 py-2"
          >
            <span className="text-sm text-[var(--color-parchment)]">{TYPE_LABELS[type]}</span>
            <input
              type="checkbox"
              checked={mutedTypes.has(type)}
              onChange={() => toggleType(type)}
              className="h-4 w-4 accent-[var(--color-sage)]"
              aria-label={`Mute ${TYPE_LABELS[type]}`}
            />
          </label>
        ))}
      </div>

      <label className="flex items-center justify-between gap-3 rounded-xl border border-[rgba(164,190,123,0.15)] px-3 py-2">
        <span className="text-sm text-[var(--color-parchment)]">Push notifications</span>
        <input
          type="checkbox"
          checked={pushEnabled}
          onChange={(event) => setPushEnabled(event.target.checked)}
          className="h-4 w-4 accent-[var(--color-sage)]"
          aria-label="Enable push notifications globally"
        />
      </label>

      <div className="rounded-xl border border-[rgba(164,190,123,0.15)] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-[var(--color-parchment)]">This device</div>
            <div className="text-xs text-[rgba(164,190,123,0.7)]">
              {pushSupported
                ? pushActive
                  ? "Subscribed to web push on this device."
                  : "Register this browser for web push delivery."
                : "Push is not supported in this browser."}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void enablePush()}
            disabled={!pushSupported || pushActive || subscribing}
            className="rounded-xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-3 py-1.5 text-xs font-semibold text-[var(--color-parchment)] disabled:opacity-60"
          >
            {subscribing ? "Subscribing…" : "Enable push"}
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-[rgba(229,217,182,0.6)] hover:text-[var(--color-parchment)]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-4 py-2 text-sm font-semibold text-[var(--color-parchment)] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
