"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Lock, ShieldCheck, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { loadAvatarSource } from "@/lib/avatar";
import { formatCalendarDate } from "@/lib/time";
import { errorMessage } from "@/lib/errors";
import { avatarUrl, getAccount, updateUser, uploadAvatar } from "@/lib/services/users";
import { useProfileDraftStore } from "@/store/profileDraftStore";
import { AvatarCropper } from "./AvatarCropper";
import { SettingsCard, SettingsEditorShell, SettingsRow, SettingsSaveBar } from "./parts";

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 50;
const DESCRIPTION_MAX = 500;

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

type EmailState =
  | { status: "loading" }
  | { status: "ready"; email: string }
  | { status: "error" };

function useAccountEmail(): { state: EmailState; retry: () => void } {
  const [state, setState] = useState<EmailState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    getAccount()
      .then((account) => {
        if (active) setState({ status: "ready", email: account.email });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return {
    state,
    retry: () => {
      setState({ status: "loading" });
      setAttempt((count) => count + 1);
    },
  };
}

export function ProfileEditor({ onBack }: { onBack: () => void }) {
  const auth = useAuth();
  return <ProfileForm key={auth.user?.id ?? "anonymous"} onBack={onBack} />;
}

function ProfileForm({ onBack }: { onBack: () => void }) {
  const auth = useAuth();
  const toast = useToast();
  const currentUserId = auth.session?.userId ?? null;
  const fileInput = useRef<HTMLInputElement>(null);
  const setDraft = useProfileDraftStore((store) => store.setDraft);

  const initialUsername = auth.user?.username ?? "";
  const initialPictureUrl = auth.user?.profilePictureUrl ?? null;
  const initialDescription = auth.user?.description ?? "";

  const [username, setUsername] = useState(initialUsername);
  const [description, setDescription] = useState(initialDescription);
  const [picture, setPicture] = useState<Blob | null>(null);
  const pictureUrl = useMemo(() => (picture ? URL.createObjectURL(picture) : null), [picture]);
  const { state: emailState, retry: retryEmail } = useAccountEmail();
  const [touched, setTouched] = useState({ username: false });
  const [saving, setSaving] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);
  const [cropSource, setCropSource] = useState<ImageBitmap | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pictureUrl) return;
    return () => URL.revokeObjectURL(pictureUrl);
  }, [pictureUrl]);

  useEffect(() => () => cropSource?.close(), [cropSource]);

  const usernameError = validateUsername(username);
  const descriptionTooLong = description.length > DESCRIPTION_MAX;

  const dirty =
    username.trim() !== initialUsername ||
    description.trim() !== initialDescription ||
    picture !== null;

  const previewPicture = pictureUrl ?? (initialPictureUrl || null);
  useEffect(() => {
    setDraft({ username, description, pictureUrl: previewPicture });
  }, [username, description, previewPicture, setDraft]);
  useEffect(() => () => setDraft(null), [setDraft]);

  const showUsernameError = touched.username || username !== initialUsername;

  const valid = !usernameError && !descriptionTooLong;
  const previewName = username.trim() || initialUsername || "You";
  const memberSince = formatCalendarDate(auth.user?.createdAt ?? null);

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    setPictureError(null);
    try {
      setCropSource(await loadAvatarSource(file));
    } catch (loadError) {
      setPictureError(errorMessage(loadError));
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function cancelCrop() {
    setCropSource(null);
  }

  function applyCrop(blob: Blob) {
    setCropSource(null);
    setPicture(blob);
  }

  function discard() {
    setUsername(initialUsername);
    setDescription(initialDescription);
    setPicture(null);
    setPictureError(null);
    setTouched({ username: false });
    setError(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function save() {
    if (!currentUserId) return;
    setTouched({ username: true });
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      let profilePictureUrl = initialPictureUrl;
      if (picture) {
        await uploadAvatar(currentUserId, picture);
        profilePictureUrl = avatarUrl(currentUserId, Date.now());
      }
      await updateUser(currentUserId, {
        username: username.trim(),
        profilePictureUrl,
        description: description.trim() || null,
      });
      setPicture(null);
      if (fileInput.current) fileInput.current.value = "";
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
      description="How you appear to other people, and how your account is protected."
      onBack={onBack}
      wide
    >
      <div className="grid gap-6 md:grid-cols-2 md:items-start">
      <div className="flex flex-col items-center gap-3 px-2 pt-2 text-center md:sticky md:top-6">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={saving}
          aria-label="Change profile picture"
          className="group relative flex size-[176px] shrink-0 rounded-full transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-pane-text)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-pane)] disabled:cursor-not-allowed motion-reduce:transition-none"
        >
          {pictureUrl ? (
            <img
              src={pictureUrl}
              alt=""
              width={176}
              height={176}
              className="size-[176px] rounded-full object-cover"
            />
          ) : (
            <Avatar
              name={previewName}
              seed={currentUserId ?? "you"}
              src={previewPicture}
              size={176}
              presenceRing="var(--app-pane)"
            />
          )}
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
          >
            <Camera size={36} strokeWidth={1.75} />
          </span>
          <span
            aria-hidden="true"
            className="absolute bottom-1 right-1 hidden size-8 items-center justify-center rounded-full border-2 border-[var(--app-pane)] bg-[var(--color-forest-deep)] text-[#F1E9D2] pointer-coarse:flex"
          >
            <Camera size={15} strokeWidth={2} />
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void chooseFile(event.target.files?.[0])}
        />
        <div className="min-w-0 max-w-full">
          <p className="truncate font-ui text-[20px] font-semibold text-[var(--app-pane-text)]">
            {previewName}
          </p>
          <p className="truncate font-ui text-[13px] text-[var(--app-pane-text-soft)]">
            @{username.trim() || "your-handle"}
          </p>
          <p className="mt-1 max-w-md font-ui text-[13px] leading-relaxed text-[var(--app-pane-text-soft)]">
            {description.trim() || ABOUT_PLACEHOLDER}
          </p>
        </div>
        {pictureError && (
          <p role="alert" className="font-ui text-[13px] font-medium text-[var(--app-danger-on-light)]">
            {pictureError}
          </p>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-6">
      <SettingsCard>
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
          <p className="-mt-2 rounded-xl bg-[rgba(40,84,48,0.06)] px-3 py-2 font-ui text-[12px] leading-relaxed text-[var(--app-pane-text-soft)]">
            Username changes are immediate. Messages you have already sent are unaffected.
          </p>

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

          <div className="flex flex-col gap-1.5">
            <span className="font-ui text-[13px] font-medium text-[var(--app-pane-text)]">Email</span>
            {emailState.status === "loading" && (
              <Skeleton className="h-11 w-full rounded-xl" />
            )}
            {emailState.status === "error" && (
              <ErrorBlock
                tone="pane"
                title="We couldn’t load your email."
                reason="Check your connection and try again."
                onRetry={retryEmail}
              />
            )}
            {emailState.status === "ready" && (
              <p
                aria-describedby="profile-email-hint"
                className="rounded-xl border border-[var(--app-pane-divider)] bg-[var(--app-pane-raised)] px-3 py-2.5 font-ui text-[14px] text-[var(--app-pane-text)] break-all"
              >
                {emailState.email}
              </p>
            )}
            <p id="profile-email-hint" className="font-ui text-xs text-[var(--app-pane-text-soft)]">
              The email you signed in with. It cannot be changed here.
            </p>
          </div>
        </div>
      </SettingsCard>

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

      <section id="security" aria-labelledby="security-heading" className="scroll-mt-4">
        <h2
          id="security-heading"
          className="mb-2 px-1 font-ui text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--app-pane-text-soft)]"
        >
          Security
        </h2>
        <SettingsCard>
          <SettingsRow
            icon={<Lock size={18} strokeWidth={1.75} />}
            title="Password"
            description="Your password can't be changed here. Use “Forgot password” on the sign-in screen to reset it by email."
          />
          {memberSince && (
            <SettingsRow
              icon={<ShieldCheck size={18} strokeWidth={1.75} />}
              title="Member since"
              description={memberSince}
            />
          )}
        </SettingsCard>
      </section>
      </div>
      </div>

      {cropSource && (
        <AvatarCropper source={cropSource} onCancel={cancelCrop} onApply={applyCrop} />
      )}
    </SettingsEditorShell>
  );
}
