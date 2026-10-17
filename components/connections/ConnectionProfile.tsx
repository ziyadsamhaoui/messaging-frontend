"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Ban, MessageSquare, ShieldCheck, UserPlus, UserRoundX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/hooks/useUser";
import {
  connectionsQueryKey,
  useConnectUser,
  useConnections,
  useRemoveConnection,
} from "@/hooks/useConnections";
import { useBlockUser, useBlockedUserIds, useUnblockUser } from "@/hooks/useBlocks";
import { useToast } from "@/components/ui/Toast";
import { MainPane } from "@/components/layout/MainPane";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { buttonClasses } from "@/components/ui/Button";
import { createRoom } from "@/lib/services/rooms";
import { roomHref, CHATS_HREF } from "@/lib/appRoute";
import { errorMessage } from "@/lib/errors";
import { derivePresence, formatLastSeen } from "@/lib/presence";

/**
 * The open connection, addressed by `/app/connections/<userId>`.
 *
 * The actions here are the three things this screen can actually do with the API:
 * open (or start) the direct room, send a request, and remove or block. Nothing is
 * offered for a relationship the server would refuse — the button set is derived
 * from the connection list and the blocklist, not assumed.
 */
export function ConnectionProfile({ userId }: { userId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const auth = useAuth();
  const currentUserId = auth.session?.userId ?? null;

  const userQuery = useUser(userId);
  const connectionsQuery = useConnections(true);
  const blockedQuery = useBlockedUserIds(currentUserId);
  const removeConnection = useRemoveConnection();
  const connect = useConnectUser();
  const blockUser = useBlockUser(currentUserId);
  const unblockUser = useUnblockUser(currentUserId);

  const [busy, setBusy] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const user = userQuery.data;
  const username = user?.username ?? "Profile";
  const connection = (connectionsQuery.data ?? []).find(
    (item) => item.otherUserId === userId && item.status === "ACCEPTED"
  );
  const pending = (connectionsQuery.data ?? []).find(
    (item) => item.otherUserId === userId && item.status === "PENDING"
  );
  const blocked = (blockedQuery.data ?? []).includes(userId);
  const isSelf = currentUserId === userId;

  if (userQuery.isLoading) {
    return (
      <MainPane>
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </MainPane>
    );
  }

  if (userQuery.isError || !user) {
    return (
      <MainPane>
        <ErrorBlock
          title="Couldn't load this profile"
          reason="The profile did not come back from the server."
          onRetry={() => void userQuery.refetch()}
        />
      </MainPane>
    );
  }

  async function openConversation() {
    setStarting(true);
    try {
      const room = await createRoom({ type: "DIRECT", participantIds: [userId] });
      void queryClient.invalidateQueries({ queryKey: connectionsQueryKey });
      router.push(roomHref(room.id));
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setStarting(false);
    }
  }

  async function remove() {
    if (!connection) return;
    setBusy("remove");
    try {
      await removeConnection.mutateAsync(connection.id);
      toast.push(`Removed connection with @${username}.`, "success");
      router.push("/app/connections");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setBusy(null);
    }
  }

  async function sendRequest() {
    setBusy("connect");
    try {
      await connect.mutateAsync(userId);
      toast.push(`Connection request sent to @${username}.`, "success");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setBusy(null);
    }
  }

  async function toggleBlock() {
    setBusy("block");
    try {
      if (blocked) {
        await unblockUser.mutateAsync(userId);
        toast.push("User unblocked.", "success");
      } else {
        await blockUser.mutateAsync(userId);
        toast.push("User blocked.", "success");
        router.push("/app/connections");
      }
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <MainPane>
      <header className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[var(--app-pane-divider)] px-6">
        {/*
         * Below `md` the list panel is hidden and this pane is the whole screen, so the
         * profile needs its own way back to the list — the same rule the open
         * conversation follows.
         */}
        <Link
          href="/app/connections"
          aria-label="Back to connections"
          className="focus-ring-light flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--app-pane-text-soft)] md:hidden"
        >
          <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        <h2 className="font-ui text-[20px] font-semibold text-[var(--app-pane-text)]">
          Profile
        </h2>
      </header>

      <div className="app-scroll-light min-h-0 flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Avatar
              name={username}
              seed={userId}
              src={user.profilePictureUrl}
              size={96}
              status={user.lastSeen ? derivePresence(user.lastSeen) : undefined}
              presenceRing="var(--app-pane)"
            />
            <div className="min-w-0">
              <h3 className="truncate font-ui text-[24px] font-semibold text-[var(--app-pane-text)]">
                {username}
              </h3>
              <p className="font-ui text-sm text-[var(--app-pane-text-soft)]">@{username}</p>
              <p className="mt-1 font-ui text-[13px] text-[var(--app-pane-text-soft)]">
                {user.lastSeen ? formatLastSeen(user.lastSeen) : "Last seen unavailable"}
              </p>
            </div>
          </div>

          <p className="font-ui text-[15px] leading-relaxed text-[var(--app-pane-text)]">
            {user.description?.trim() || "No description yet."}
          </p>

          {blocked && (
            <p
              role="status"
              className="rounded-[var(--radius-control)] border border-[rgba(143,42,27,0.3)] bg-[rgba(143,42,27,0.08)] px-4 py-3 font-ui text-[13px] text-[var(--app-pane-text)]"
            >
              You have blocked this person. Messaging is disabled until the block is
              lifted.
            </p>
          )}

          {!isSelf && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void openConversation()}
                disabled={starting || blocked}
                className={buttonClasses({ variant: "primary", size: "md", tone: "pane" })}
              >
                <MessageSquare size={16} strokeWidth={1.75} aria-hidden="true" />
                {starting ? "Opening…" : "Message"}
              </button>

              {connection ? (
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={busy !== null}
                  className={buttonClasses({ variant: "secondary", size: "md", tone: "pane" })}
                >
                  <UserRoundX size={16} strokeWidth={1.75} aria-hidden="true" />
                  {busy === "remove" ? "Removing…" : "Remove connection"}
                </button>
              ) : pending ? (
                <span className="rounded-full border border-[var(--app-pane-divider)] px-3 py-1.5 font-ui text-[13px] text-[var(--app-pane-text-soft)]">
                  Request pending
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void sendRequest()}
                  disabled={busy !== null || blocked}
                  className={buttonClasses({ variant: "secondary", size: "md", tone: "pane" })}
                >
                  <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" />
                  {busy === "connect" ? "Sending…" : "Send request"}
                </button>
              )}

              <button
                type="button"
                onClick={() => void toggleBlock()}
                disabled={busy !== null}
                className={buttonClasses({ variant: "danger", size: "md", tone: "pane" })}
              >
                {blocked ? (
                  <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Ban size={16} strokeWidth={1.75} aria-hidden="true" />
                )}
                {busy === "block" ? "Working…" : blocked ? "Unblock" : "Block"}
              </button>
            </div>
          )}

          <p className="font-ui text-[13px] text-[var(--app-pane-text-soft)]">
            <Link href={CHATS_HREF} className="focus-ring-light rounded underline">
              Back to chats
            </Link>
          </p>
        </div>
      </div>
    </MainPane>
  );
}
