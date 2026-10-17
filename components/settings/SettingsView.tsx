"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, Bell, ChevronRight, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/Toast";
import { MainPane } from "@/components/layout/MainPane";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { buttonClasses } from "@/components/ui/Button";
import { updateUser } from "@/lib/services/users";
import { useBlockedUserIds, useUnblockUser } from "@/hooks/useBlocks";
import { useUser } from "@/hooks/useUser";
import { errorMessage } from "@/lib/errors";
import { NOTIFICATION_PREFERENCES_HREF } from "@/lib/appRoute";

type Editor = "profile" | "blocked";

const EDITOR_TITLES: Record<Editor, string> = {
  profile: "Profile",
  blocked: "Blocked users",
};

/**
 * Settings as a list of sections rather than one long form.
 *
 * The list is the index: each row says what it changes and opens one editor in
 * place, so a reader never has to scroll past two unrelated forms to reach the one
 * they came for. Blocked people belong here — they are an account-level list, not a
 * connection state, and keeping them inside Connections put a moderation control in
 * the middle of a social one.
 *
 * Signing out is not here: it lives in the rail, visible without opening anything.
 */
export function SettingsView() {
  const [editor, setEditor] = useState<Editor | null>(null);

  return (
    <MainPane>
      <header className="flex h-[72px] shrink-0 items-center gap-2 border-b border-[var(--app-pane-divider)] px-6">
        {editor && (
          <IconButton
            surface="pane"
            size="sm"
            label="Back to settings"
            tooltip={null}
            onClick={() => setEditor(null)}
            className="-ml-1"
          >
            <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        )}
        <h1 className="font-ui text-[20px] font-semibold text-[var(--app-pane-text)]">
          {editor ? EDITOR_TITLES[editor] : "Settings"}
        </h1>
      </header>
      <div className="app-scroll-light min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
          {editor === null && <SettingsList onOpen={setEditor} />}
          {editor === "profile" && <ProfileEditor />}
          {editor === "blocked" && <BlockedUsersEditor />}
        </div>
      </div>
    </MainPane>
  );
}

function SettingsList({ onOpen }: { onOpen: (editor: Editor) => void }) {
  return (
    <>
      <ul className="flex flex-col divide-y divide-[var(--app-pane-divider)] overflow-hidden rounded-[var(--radius-surface)] border border-[var(--app-pane-divider)]">
        <li>
          <button
            type="button"
            onClick={() => onOpen("profile")}
            className="focus-ring-light flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--app-pane-hover)]"
          >
            <UserRound size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
                Profile
              </span>
              <span className="block font-ui text-[13px] text-[var(--app-pane-text-soft)]">
                Username, picture and description
              </span>
            </span>
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
          </button>
        </li>
        <li>
          <Link
            href={NOTIFICATION_PREFERENCES_HREF}
            className="focus-ring-light flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--app-pane-hover)]"
          >
            <Bell size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
                Notifications
              </span>
              <span className="block font-ui text-[13px] text-[var(--app-pane-text-soft)]">
                Which notifications you receive
              </span>
            </span>
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
          </Link>
        </li>
        <li>
          <button
            type="button"
            onClick={() => onOpen("blocked")}
            className="focus-ring-light flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--app-pane-hover)]"
          >
            <Ban size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
                Blocked users
              </span>
              <span className="block font-ui text-[13px] text-[var(--app-pane-text-soft)]">
                People who cannot message you
              </span>
            </span>
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
          </button>
        </li>
      </ul>
    </>
  );
}

/**
 * Keyed on the profile's identity so the form re-initialises from the stored values
 * after a save instead of keeping a half-updated copy in local state.
 */
function ProfileEditor() {
  const auth = useAuth();
  return <ProfileForm key={auth.user?.id ?? "anonymous"} />;
}

function ProfileForm() {
  const auth = useAuth();
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
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Avatar
          name={username || "You"}
          seed={currentUserId ?? "you"}
          src={avatarUrl || auth.user?.profilePictureUrl}
          size={96}
          presenceRing="var(--app-pane)"
        />
        <p className="font-ui text-[13px] leading-relaxed text-[var(--app-pane-text-soft)]">
          The picture below is used everywhere your name appears. Leave it empty to use
          your initials.
        </p>
      </div>
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
          className={buttonClasses({ variant: "primary", size: "md", tone: "pane" })}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </section>
  );
}

function BlockedUsersEditor() {
  const toast = useToast();
  const currentUserId = useAuth().session?.userId ?? null;
  const blockedQuery = useBlockedUserIds(currentUserId);
  const unblock = useUnblockUser(currentUserId);
  const ids = blockedQuery.data ?? [];

  if (blockedQuery.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (blockedQuery.isError) {
    return (
      <ErrorBlock
        title="Couldn't load blocked users"
        reason="The blocklist did not come back from the server."
        onRetry={() => void blockedQuery.refetch()}
      />
    );
  }

  if (ids.length === 0) {
    return (
      <EmptyState
        tone="pane"
        icon={<Ban size={22} strokeWidth={1.75} />}
        title="You haven't blocked anyone"
        description="People you block cannot message you and are listed here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {ids.map((userId) => (
        <BlockedUserRow
          key={userId}
          userId={userId}
          pending={unblock.isPending && unblock.variables === userId}
          onUnblock={async () => {
            try {
              await unblock.mutateAsync(userId);
              toast.push("User unblocked.", "success");
            } catch (error) {
              toast.push(errorMessage(error), "error");
            }
          }}
        />
      ))}
    </ul>
  );
}

function BlockedUserRow({
  userId,
  pending,
  onUnblock,
}: {
  userId: string;
  pending: boolean;
  onUnblock: () => Promise<void>;
}) {
  const userQuery = useUser(userId);
  const username = userQuery.data?.username ?? userId.slice(0, 8);

  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-control)] px-1 py-1.5">
      <Avatar
        name={username}
        seed={userId}
        src={userQuery.data?.profilePictureUrl}
        size={48}
        presenceRing="var(--app-pane)"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
          {username}
        </span>
        <span className="block font-ui text-xs text-[var(--app-pane-text-soft)]">
          Blocked · cannot message you
        </span>
      </span>
      <button
        type="button"
        onClick={() => void onUnblock()}
        disabled={pending}
        className={buttonClasses({ variant: "secondary", size: "sm", tone: "pane" })}
      >
        {pending ? "Unblocking…" : "Unblock"}
      </button>
    </li>
  );
}
