"use client";

import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { Skeleton } from "@/components/ui/Skeleton";
import { buttonClasses } from "@/components/ui/Button";
import { UserSearchCombobox } from "@/components/ui/UserSearchCombobox";
import { useToast } from "@/components/ui/Toast";
import { useConnections } from "@/hooks/useConnections";
import { pendingInvitationsQueryKey } from "@/hooks/useInvitations";
import { useUser } from "@/hooks/useUser";
import { errorMessage } from "@/lib/errors";
import { inviteToRoom } from "@/lib/services/rooms";
import { PublicUserDto } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AddMembersViewProps {
  roomId: string;
  memberIds: string[];
  invitedIds: string[];
  onDone: () => void;
}

export function AddMembersView({ roomId, memberIds, invitedIds, onDone }: AddMembersViewProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const connections = useConnections(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, PublicUserDto>>({});
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  const members = useMemo(() => new Set(memberIds), [memberIds]);
  const invited = useMemo(() => new Set(invitedIds), [invitedIds]);
  const accepted = useMemo(
    () => (connections.data ?? []).filter((connection) => connection.status === "ACCEPTED"),
    [connections.data]
  );
  const known = useMemo(() => {
    const map = new Map<string, string>();
    for (const connection of accepted) map.set(connection.otherUserId, connection.otherUserId);
    for (const id of memberIds) map.set(id, id);
    return map;
  }, [accepted, memberIds]);

  const candidates = useMemo(
    () => [
      ...accepted.map((connection) => connection.otherUserId),
      ...Object.keys(results).filter((id) => !known.has(id)),
    ],
    [accepted, known, results]
  );

  function toggle(userId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  async function send() {
    if (selected.size === 0) return;
    setSending(true);
    setErrors({});
    setSentNotice(null);
    const failures: Record<string, string> = {};
    for (const userId of selected) {
      try {
        await inviteToRoom(roomId, userId);
      } catch (error) {
        failures[userId] = errorMessage(error);
      }
    }
    setSending(false);
    await queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });

    const sent = selected.size - Object.keys(failures).length;
    if (sent > 0) {
      const notice = `${sent} invitation${sent === 1 ? "" : "s"} sent.`;
      setSentNotice(notice);
      toast.push(notice, "success");
    }
    if (Object.keys(failures).length > 0) {
      setErrors(failures);
      setSelected(new Set(Object.keys(failures)));
      return;
    }
    onDone();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-3 px-4 pt-4">
        <p className="font-ui text-[13px] leading-relaxed text-[var(--app-pane-text-soft)]">
          They&apos;ll get an invitation they can accept or decline.
        </p>
        <UserSearchCombobox
          variant="search"
          tone="light"
          label="Find someone by username"
          value={query}
          onValueChange={setQuery}
          onSelect={(user) => {
            setResults((current) => ({ ...current, [user.id]: user }));
            toggle(user.id);
          }}
          placeholder="Search connections or type a username"
          closeOnSelect={false}
          renderOption={(user) => (
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <Avatar name={user.username} seed={user.id} src={user.profilePictureUrl} size={28} />
              <span className="truncate">@{user.username}</span>
            </span>
          )}
        />
      </div>

      <div className="app-scroll-light min-h-0 flex-1 overflow-y-auto py-2">
        {connections.isLoading ? (
          <div className="flex flex-col gap-1 px-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : connections.isError ? (
          <ErrorBlock
            tone="pane"
            title="Could not load your connections"
            reason="You can still search for someone by username above."
            onRetry={() => void connections.refetch()}
          />
        ) : candidates.length === 0 ? (
          <p className="px-4 py-6 text-center font-ui text-[13px] text-[var(--app-pane-text-soft)]">
            You have no connections yet. Search for a username above to invite someone.
          </p>
        ) : (
          <ul className="flex flex-col">
            {candidates.map((userId) => (
              <AddMemberRow
                key={userId}
                userId={userId}
                checked={selected.has(userId)}
                disabled={members.has(userId) ? "Member" : invited.has(userId) ? "Invited" : null}
                error={errors[userId]}
                onToggle={() => toggle(userId)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 border-t border-[var(--app-pane-divider)] p-3">
        {sentNotice && (
          <p role="status" className="pb-2 font-ui text-[13px] text-[var(--app-pane-text-soft)]">
            {sentNotice}
          </p>
        )}
        <button
          type="button"
          disabled={selected.size === 0 || sending}
          onClick={() => void send()}
          className={cn(
            buttonClasses({ variant: "primary", size: "md", tone: "pane" }),
            "w-full justify-center"
          )}
        >
          {sending
            ? "Sending…"
            : `Send invitation${selected.size === 1 ? "" : "s"}${
                selected.size > 0 ? ` (${selected.size})` : ""
              }`}
        </button>
      </div>
    </div>
  );
}

function AddMemberRow({
  userId,
  checked,
  disabled,
  error,
  onToggle,
}: {
  userId: string;
  checked: boolean;
  disabled: string | null;
  error?: string;
  onToggle: () => void;
}) {
  const userQuery = useUser(userId);
  const username = userQuery.data?.username ?? userId.slice(0, 8);

  return (
    <li className="flex flex-col">
      <label
        className={cn(
          "mx-2 flex min-h-14 items-center gap-3 rounded-xl px-2",
          disabled ? "opacity-70" : "cursor-pointer hover:bg-[var(--app-pane-hover)]"
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={Boolean(disabled)}
          onChange={onToggle}
          className="focus-ring-light h-4 w-4 shrink-0 accent-[var(--color-fern)]"
          aria-label={username}
        />
        <Avatar name={username} seed={userId} src={userQuery.data?.profilePictureUrl} size={40} />
        <span className="min-w-0 flex-1 truncate font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
          {username}
        </span>
        {disabled && (
          <span className="shrink-0 font-ui text-[12px] font-medium text-[var(--app-pane-text-soft)]">
            {disabled}
          </span>
        )}
      </label>
      {error && (
        <p role="alert" className="px-4 pb-1 font-ui text-[12px] text-[var(--app-danger-on-light)]">
          {error}
        </p>
      )}
    </li>
  );
}
