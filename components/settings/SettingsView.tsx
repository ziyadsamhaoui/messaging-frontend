"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { MainPane } from "@/components/layout/MainPane";
import { Input } from "@/components/ui/Input";
import { buttonClasses } from "@/components/ui/Button";
import { updateUser } from "@/lib/services/users";
import { errorMessage } from "@/lib/errors";
import { NOTIFICATION_PREFERENCES_HREF } from "@/lib/appRoute";

/**
 * Profile settings as a destination rather than the modal it used to be: the
 * profile menu links here, and the notification preferences live one link away
 * instead of nested inside a dialog.
 *
 * Only the three fields the API accepts are edited — `username`,
 * `profilePictureUrl` and `description` — so nothing can be typed that has nowhere
 * to go.
 */
export function SettingsView() {
  const auth = useAuth();
  return (
    // Keyed on the profile's identity so the form re-initialises from the stored
    // values after a save instead of keeping a half-updated copy in local state —
    // the same pattern the notification preferences form uses.
    <SettingsForm key={auth.user?.id ?? "anonymous"} />
  );
}

function SettingsForm() {
  const auth = useAuth();
  const router = useRouter();
  const toast = useToast();
  const currentUserId = auth.session?.userId ?? null;

  const [username, setUsername] = useState(auth.user?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(auth.user?.profilePictureUrl ?? "");
  const [description, setDescription] = useState(auth.user?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!currentUserId) return;
    setSaving(true);
    setError(null);
    try {
      await updateUser(currentUserId, {
        username: username.trim(),
        profilePictureUrl: avatarUrl.trim() || null,
        description: description.trim() || null,
      });
      await auth.refreshUser();
      toast.push("Profile updated.", "success");
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <MainPane>
      <header className="flex h-[72px] shrink-0 items-center border-b border-[var(--app-pane-divider)] px-6">
        <h1 className="font-display text-[17px] font-semibold text-[var(--app-pane-text)]">Settings</h1>
      </header>
      <div className="app-scroll-light min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="flex max-w-xl flex-col gap-5">
          <section className="flex flex-col gap-4">
            <h2 className="font-ui text-[15px] font-semibold text-[var(--app-pane-text)]">Profile</h2>
            <Input
              tone="light"
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Your username"
            />
            <Input
              tone="light"
              label="Profile picture URL"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://example.com/avatar.png"
            />
            <Input
              tone="light"
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="A short bio"
            />
            {error && (
              <p role="alert" className="font-ui text-[13px] font-medium text-[var(--app-danger-on-light)]">
                {error}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className={buttonClasses({ variant: "primary", size: "md", tone: "light" })}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <Link
                href={NOTIFICATION_PREFERENCES_HREF}
                className={buttonClasses({ variant: "secondary", size: "md", tone: "light" })}
              >
                Notification preferences
              </Link>
            </div>
          </section>

          <section className="flex flex-col gap-2 border-t border-[var(--app-pane-divider)] pt-5">
            <h2 className="font-ui text-[15px] font-semibold text-[var(--app-pane-text)]">Session</h2>
            <p className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">
              Signing out also revokes this session&apos;s refresh token.
            </p>
            <button
              type="button"
              onClick={async () => {
                await auth.logout();
                router.replace("/login");
              }}
              className={buttonClasses({
                variant: "danger",
                size: "md",
                tone: "light",
                className: "self-start",
              })}
            >
              Sign out
            </button>
          </section>
        </div>
      </div>
    </MainPane>
  );
}
