"use client";

import React, { useMemo, useState } from "react";
import { Link2, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { errorMessage } from "@/lib/errors";
import { updateUser } from "@/lib/services/users";
import { SettingsCard, SettingsEditorShell, SettingsRow, SettingsSaveBar } from "./parts";

/** The server's rules for `UpdateUserRequest`, restated so the field can explain them. */
const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 50;
const DESCRIPTION_MAX = 500;
const AVATAR_URL_MAX = 512;

const ABOUT_PLACEHOLDER = "A short line about yourself";

function validateUsername(value: string): string | null {
  const username = value.trim();
  if (username.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters.`;
  if (username.length > USERNAME_MAX) return `Use at most ${USERNAME_MAX} characters.`;
  if (!USERNAME_PATTERN.test(username)) {
    return "Use letters, digits, dots, underscores or hyphens only.";
  }
  return null;
}

/**
 * Only an absolute http(s) URL renders as a picture — the Avatar drops anything else
 * rather than putting it in a CSS `url()` — so the field rejects it here instead of
 * silently saving a value that will never appear.
 */
function validateAvatarUrl(value: string): string | null {
  const url = value.trim();
  if (!url) return null;
  if (url.length > AVATAR_URL_MAX) return `Use at most ${AVATAR_URL_MAX} characters.`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Use a full http:// or https:// address.";
    }
    return null;
  } catch {
    return "Use a full http:// or https:// address.";
  }
}

/**
 * The profile editor.
 *
 * It is one form with a live preview on top: the avatar, the handle and the about
 * line update as they are typed, so the choice between a picture and initials can be
 * seen before saving. Nothing is written until Save, and the Save bar only exists
 * while there is a difference from the stored profile — an always-enabled Save button
 * invites a click that changes nothing and reports "updated".
 */
export function ProfileEditor({ onBack }: { onBack: () => void }) {
  const auth = useAuth();
  return <ProfileForm key={auth.user?.id ?? "anonymous"} onBack={onBack} />;
}

function ProfileForm({ onBack }: { onBack: () => void }) {
  const auth = useAuth();
  const toast = useToast();
  const currentUserId = auth.session?.userId ?? null;

  const initialUsername = auth.user?.username ?? "";
  const initialAvatarUrl = auth.user?.profilePictureUrl ?? "";
  const initialDescription = auth.user?.description ?? "";

  const [username, setUsername] = useState(initialUsername);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [description, setDescription] = useState(initialDescription);
  const [touched, setTouched] = useState({ username: false, avatarUrl: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameError = validateUsername(username);
  const avatarError = validateAvatarUrl(avatarUrl);
  const descriptionTooLong = description.length > DESCRIPTION_MAX;

  const dirty =
    username.trim() !== initialUsername ||
    avatarUrl.trim() !== initialAvatarUrl ||
    description.trim() !== initialDescription;

  // A field that has been edited reports its problem immediately; one that has never
  // been touched stays quiet, so opening the editor is not a wall of red.
  const showUsernameError = touched.username || username !== initialUsername;
  const showAvatarError = touched.avatarUrl || avatarUrl !== initialAvatarUrl;

  const valid = !usernameError && !avatarError && !descriptionTooLong;
  const previewName = username.trim() || initialUsername || "You";

  const memberSince = useMemo(() => auth.user?.createdAt ?? null, [auth.user?.createdAt]);

  function discard() {
    setUsername(initialUsername);
    setAvatarUrl(initialAvatarUrl);
    setDescription(initialDescription);
    setTouched({ username: false, avatarUrl: false });
    setError(null);
  }

  async function save() {
    if (!currentUserId) return;
    setTouched({ username: true, avatarUrl: true });
    if (!valid) return;
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

  const descriptionId = "profile-about-hint";

  return (
    <SettingsEditorShell
      icon={<UserRound size={26} strokeWidth={1.75} />}
      title="Profile"
      description="How you appear to everyone you talk to: your handle, your picture and the line under your name."
      onBack={onBack}
    >
      <SettingsCard title="Preview">
        <div className="flex items-center gap-4 p-4">
          <Avatar
            name={previewName}
            seed={currentUserId ?? "you"}
            src={avatarUrl.trim() || null}
            size={96}
            presenceRing="var(--app-pane-raised)"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-ui text-[20px] font-semibold text-[var(--app-pane-text)]">
              {previewName}
            </span>
            <span className="block truncate font-ui text-[13px] text-[var(--app-pane-text-soft)]">
              @{username.trim() || "your-handle"}
            </span>
            <span className="mt-1 block font-ui text-[13px] leading-relaxed text-[var(--app-pane-text-soft)]">
              {description.trim() || ABOUT_PLACEHOLDER}
            </span>
          </span>
        </div>
      </SettingsCard>

      <SettingsCard title="About you">
        <div className="flex flex-col gap-4 p-4">
          <Input
            tone="light"
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onBlur={() => setTouched((value) => ({ ...value, username: true }))}
            placeholder="your-handle"
            autoComplete="username"
            spellCheck={false}
            maxLength={USERNAME_MAX}
            error={showUsernameError ? usernameError : null}
            hint="3–50 characters: letters, digits, dots, underscores or hyphens."
          />

          <div className="flex flex-col gap-1.5">
            <Textarea
              tone="light"
              label="About"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={ABOUT_PLACEHOLDER}
              rows={4}
              maxLength={DESCRIPTION_MAX}
              aria-describedby={descriptionId}
            />
            <p
              id={descriptionId}
              className={`flex items-center justify-between gap-3 font-ui text-xs ${
                descriptionTooLong
                  ? "text-[var(--app-danger-on-light)]"
                  : "text-[var(--app-pane-text-soft)]"
              }`}
            >
              <span>Shown on your profile and beside your name in Connections.</span>
              <span className="shrink-0 tabular-nums">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </p>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Picture">
        <div className="flex flex-col gap-4 p-4">
          <Input
            tone="light"
            label="Picture URL"
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            onBlur={() => setTouched((value) => ({ ...value, avatarUrl: true }))}
            placeholder="https://example.com/avatar.png"
            inputMode="url"
            spellCheck={false}
            maxLength={AVATAR_URL_MAX}
            error={showAvatarError ? avatarError : null}
            leading={<Link2 size={16} strokeWidth={1.75} aria-hidden="true" />}
          />
          <p className="font-ui text-[13px] leading-relaxed text-[var(--app-pane-text-soft)]">
            Point this at a square picture for the best result. Leave it empty to use your
            initials instead — they are drawn from your username and are always available.
          </p>
        </div>
      </SettingsCard>

      {memberSince && (
        <SettingsCard title="Account">
          <SettingsRow
            title="Username changes are immediate"
            description="Messages you have already sent are unaffected; your new handle appears everywhere right away."
          />
        </SettingsCard>
      )}

      {error && (
        <p role="alert" className="font-ui text-[13px] font-medium text-[var(--app-danger-on-light)]">
          {error}
        </p>
      )}

      <SettingsSaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => void save()}
        onDiscard={discard}
        saveLabel="Save profile"
      />
    </SettingsEditorShell>
  );
}
