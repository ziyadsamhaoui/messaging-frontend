"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Keyboard } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SearchInput } from "@/components/ui/SearchInput";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { buttonClasses } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useBlockedUserIds, useUnblockUser } from "@/hooks/useBlocks";
import { useUser } from "@/hooks/useUser";
import { errorMessage } from "@/lib/errors";
import { SettingsCard, SettingsEditorShell, SettingsRow } from "./parts";

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: "Ctrl / ⌘ + B", action: "Collapse or expand the sidebar" },
  { keys: "Ctrl / ⌘ + K", action: "Focus the search field of the current list" },
  { keys: "Alt + 1 … 4", action: "Switch between Chats, Connections, Invites and Notifications" },
  { keys: "Enter", action: "Send the message" },
  { keys: "Shift + Enter", action: "Insert a newline in the composer" },
  { keys: "Escape", action: "Close a menu, popover or dialog; clear a search field" },
  { keys: "Arrow keys", action: "Move through menu items" },
  { keys: "Home / End", action: "Jump to the first or last item of a menu" },
];

export function ShortcutsEditor({ onBack }: { onBack: () => void }) {
  return (
    <SettingsEditorShell
      icon={<Keyboard size={26} strokeWidth={1.75} />}
      title="Keyboard shortcuts"
      onBack={onBack}
    >
      <SettingsCard>
        {SHORTCUTS.map((shortcut) => (
          <SettingsRow
            key={shortcut.keys}
            title={shortcut.action}
            control={
              <kbd className="rounded-lg border border-[var(--app-pane-control-border)] px-2 py-1 font-mono text-[12px] text-[var(--app-pane-text)]">
                {shortcut.keys}
              </kbd>
            }
          />
        ))}
      </SettingsCard>
    </SettingsEditorShell>
  );
}

export function BlockedUsersEditor({ onBack }: { onBack: () => void }) {
  const toast = useToast();
  const currentUserId = useAuth().session?.userId ?? null;
  const blockedQuery = useBlockedUserIds(currentUserId);
  const unblock = useUnblockUser(currentUserId);
  const ids = blockedQuery.data ?? [];
  const [query, setQuery] = useState("");

  const visible = query.trim()
    ? ids.filter((id) => id.toLowerCase().includes(query.trim().toLowerCase()))
    : ids;

  return (
    <SettingsEditorShell
      icon={<Ban size={26} strokeWidth={1.75} />}
      title="Blocked users"
      onBack={onBack}
    >
      {blockedQuery.isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : blockedQuery.isError ? (
        <ErrorBlock
          tone="pane"
          title="Couldn't load blocked users"
          reason="The blocklist did not come back from the server."
          onRetry={() => void blockedQuery.refetch()}
        />
      ) : ids.length === 0 ? null : (
        <>
          {ids.length > 8 && (
            <SearchInput
              tone="light"
              value={query}
              onValueChange={setQuery}
              placeholder="Search blocked users"
              aria-label="Search blocked users"
            />
          )}
          <SettingsCard>
            {visible.map((userId) => (
              <BlockedRow
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
          </SettingsCard>
        </>
      )}
    </SettingsEditorShell>
  );
}

function BlockedRow({
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
    <SettingsRow
      title={username}
      description={`@${username} · cannot message you`}
      control={
        <span className="flex items-center gap-3">
          <Avatar
            name={username}
            seed={userId}
            src={userQuery.data?.profilePictureUrl}
            size={28}
            presenceRing="var(--app-pane-raised)"
          />
          <button
            type="button"
            onClick={() => void onUnblock()}
            disabled={pending}
            className={buttonClasses({ variant: "secondary", size: "sm", tone: "pane" })}
          >
            {pending ? "Unblocking…" : "Unblock"}
          </button>
        </span>
      }
    />
  );
}

export function useBackToSettings() {
  const router = useRouter();
  return () => router.push("/app/settings");
}
