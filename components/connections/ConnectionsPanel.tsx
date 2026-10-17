"use client";

import React, { useMemo, useState } from "react";
import { Check, Search, UserPlus, X } from "lucide-react";
import {
  SegmentedControl,
  segmentedPanelId,
  segmentedTabId,
} from "@/components/ui/SegmentedControl";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { UserSearchCombobox } from "@/components/ui/UserSearchCombobox";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useAcceptConnection,
  useConnectUser,
  useConnections,
  useDeclineConnection,
  usePendingConnections,
  useRemoveConnection,
} from "@/hooks/useConnections";
import { useBlockedUserIds, useUnblockUser } from "@/hooks/useBlocks";
import { useUser } from "@/hooks/useUser";
import { errorMessage } from "@/lib/errors";
import { derivePresence, formatLastSeen } from "@/lib/presence";
import { ConnectionDto } from "@/lib/types";

type Segment = "connected" | "requests" | "blocked";

const SEGMENTS_ID = "connections-segments";

/**
 * Zone two for the Connections destination — the modal it replaces is gone.
 *
 * The list is a real list again: rows carry a person's name, handle and last seen,
 * and never a redundant "Connected" label on every line. Search results label the
 * existing relationship (connected / request sent / blocked) instead of offering
 * "Connect" to someone who is already a connection, which is the defect the audit
 * called out.
 */
export function ConnectionsPanel({ hideOnNarrow }: { hideOnNarrow?: boolean }) {
  const currentUserId = useAuth().session?.userId ?? null;
  const [segment, setSegment] = useState<Segment>("connected");
  const [query, setQuery] = useState("");
  const connectionsQuery = useConnections(true);
  const pendingQuery = usePendingConnections(true);
  const blockedQuery = useBlockedUserIds(currentUserId);

  const connected = useMemo(
    () => (connectionsQuery.data ?? []).filter((connection) => connection.status === "ACCEPTED"),
    [connectionsQuery.data]
  );
  const pendingCount = (pendingQuery.data ?? []).filter(
    (connection) => connection.direction === "INCOMING"
  ).length;

  const segments = [
    { value: "connected" as const, label: "Connected" },
    { value: "requests" as const, label: "Requests", count: pendingCount },
    { value: "blocked" as const, label: "Blocked" },
  ];

  return (
    <SectionPanel
      title="Connections"
      hideOnNarrow={hideOnNarrow}
      toolbar={
        <div className="flex flex-col gap-2">
          <SegmentedControl
            idBase={SEGMENTS_ID}
            label="Connection sections"
            options={segments}
            value={segment}
            onChange={setSegment}
          />
          <Input
            type="search"
            size="md"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search connections"
            aria-label="Search connections"
            leading={<Search size={16} strokeWidth={1.75} />}
          />
        </div>
      }
    >
      <div
        role="tabpanel"
        id={segmentedPanelId(SEGMENTS_ID)}
        aria-labelledby={segmentedTabId(SEGMENTS_ID, segment)}
        tabIndex={-1}
        className="focus-ring rounded-xl"
      >
        {segment === "connected" && (
          <ConnectedList
            connections={connected}
            loading={connectionsQuery.isLoading}
            error={connectionsQuery.isError}
            onRetry={() => void connectionsQuery.refetch()}
            query={query}
          />
        )}
        {segment === "requests" && <RequestsList query={query} />}
        {segment === "blocked" && (
          <BlockedList
            userIds={blockedQuery.data ?? []}
            loading={blockedQuery.isLoading}
            query={query}
          />
        )}
      </div>
    </SectionPanel>
  );
}

function matches(query: string, ...values: Array<string | undefined>) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => value?.toLowerCase().includes(needle));
}

function ConnectedList({
  connections,
  loading,
  error,
  onRetry,
  query,
}: {
  connections: ConnectionDto[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  query: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1 px-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBlock
        title="Couldn't load connections"
        reason="The connection list did not come back from the server."
        onRetry={onRetry}
      />
    );
  }

  if (connections.length === 0) {
    return (
      <EmptyState
        icon={<UserPlus size={22} strokeWidth={1.75} />}
        title="No connections yet"
        description="Send a request from the Requests tab and it will appear here once accepted."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-0.5 px-1">
      {connections.map((connection) => (
        <ConnectedRow key={connection.id} connection={connection} query={query} />
      ))}
    </ul>
  );
}

function ConnectedRow({ connection, query }: { connection: ConnectionDto; query: string }) {
  const toast = useToast();
  const userQuery = useUser(connection.otherUserId);
  const remove = useRemoveConnection();
  const [confirming, setConfirming] = useState(false);
  const user = userQuery.data;
  const username = user?.username ?? connection.otherUserId.slice(0, 8);

  if (!matches(query, username)) return null;

  async function confirmRemove() {
    try {
      await remove.mutateAsync(connection.id);
      toast.push(`Removed connection with @${username}.`, "success");
    } catch (error) {
      toast.push(errorMessage(error), "error");
      setConfirming(false);
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-control)] px-2 py-1.5">
      <Avatar
        name={username}
        seed={connection.otherUserId}
        src={user?.profilePictureUrl}
        size={48}
        status={user?.lastSeen ? derivePresence(user.lastSeen) : undefined}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-ui text-[15px] font-medium text-[var(--app-panel-text)]">
          {username}
        </span>
        <span className="block truncate font-ui text-xs text-[var(--app-panel-text-soft)]">
          @{username}
          {user?.lastSeen ? ` · ${formatLastSeen(user.lastSeen)}` : ""}
        </span>
      </span>
      {confirming ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void confirmRemove()}
            disabled={remove.isPending}
            className="focus-ring h-8 rounded-[var(--radius-control)] bg-[var(--app-danger-on-light)] px-2.5 font-ui text-xs font-semibold text-[var(--color-parchment-elevated)] disabled:opacity-60"
          >
            {remove.isPending ? "Removing…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="focus-ring h-8 rounded-[var(--radius-control)] border border-[var(--app-panel-field-border)] px-2.5 font-ui text-xs text-[var(--app-panel-text)]"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Remove connection with ${username}`}
          className="focus-ring h-8 rounded-[var(--radius-control)] px-2 font-ui text-xs text-[var(--app-panel-text-soft)] hover:text-[var(--app-danger-on-dark)]"
        >
          Remove
        </button>
      )}
    </li>
  );
}

function RequestsList({ query }: { query: string }) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const pendingQuery = usePendingConnections(true);
  const connectionsQuery = useConnections(true);
  const connect = useConnectUser();
  const accept = useAcceptConnection();
  const decline = useDeclineConnection();

  const pending = pendingQuery.data ?? [];
  const incoming = pending.filter((connection) => connection.direction === "INCOMING");
  const outgoing = pending.filter((connection) => connection.direction !== "INCOMING");
  const connectedIds = useMemo(
    () =>
      new Set(
        (connectionsQuery.data ?? [])
          .filter((connection) => connection.status === "ACCEPTED")
          .map((connection) => connection.otherUserId)
      ),
    [connectionsQuery.data]
  );
  const outgoingIds = useMemo(
    () => new Set(outgoing.map((connection) => connection.otherUserId)),
    [outgoing]
  );

  async function sendRequest(userId: string, username: string) {
    setSendingId(userId);
    try {
      await connect.mutateAsync(userId);
      toast.push(`Connection request sent to @${username}.`, "success");
      setValue("");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setSendingId(null);
    }
  }

  async function respond(connection: ConnectionDto, action: "accept" | "decline") {
    try {
      if (action === "accept") {
        await accept.mutateAsync(connection.id);
        toast.push("Connection accepted.", "success");
      } else {
        await decline.mutateAsync(connection.id);
        toast.push("Connection declined.", "info");
      }
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }

  return (
    <div className="flex flex-col gap-3 px-1">
      <div className="rounded-[var(--radius-control)] border border-[var(--app-panel-divider)] p-3">
        <UserSearchCombobox
          label="Find people by username"
          value={value}
          onValueChange={setValue}
          onSelect={(user) => {
            // Selecting someone you already have a relationship with must not send a
            // second request; the backend would answer 409, and the row says why.
            if (connectedIds.has(user.id) || outgoingIds.has(user.id)) return;
            void sendRequest(user.id, user.username);
          }}
          placeholder="Type at least 2 characters"
          inputClassName="bg-[var(--app-panel-field)]"
          renderOption={(user) => {
            const connected = connectedIds.has(user.id);
            const invited = outgoingIds.has(user.id);
            return (
              <>
                <span className="truncate font-ui text-sm text-[var(--app-panel-text)]">
                  @{user.username}
                </span>
                <span className="font-ui text-xs font-semibold text-[var(--app-panel-text-soft)]">
                  {connected
                    ? "Connected"
                    : invited
                      ? "Request sent"
                      : sendingId === user.id
                        ? "Sending…"
                        : "Connect"}
                </span>
              </>
            );
          }}
        />
      </div>

      {pendingQuery.isLoading ? (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <EmptyState
          icon={<Check size={22} strokeWidth={1.75} />}
          title="No pending requests"
          description="Requests you send and receive appear here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {incoming.length > 0 && (
            <section className="flex flex-col gap-1">
              <h3 className="px-1 font-ui text-[13px] font-semibold text-[var(--app-panel-text-soft)]">
                Received
              </h3>
              {incoming.map((connection) => (
                <PendingRow
                  key={connection.id}
                  connection={connection}
                  incoming
                  query={query}
                  onRespond={(action) => void respond(connection, action)}
                />
              ))}
            </section>
          )}
          {outgoing.length > 0 && (
            <section className="flex flex-col gap-1">
              <h3 className="px-1 font-ui text-[13px] font-semibold text-[var(--app-panel-text-soft)]">
                Sent
              </h3>
              {outgoing.map((connection) => (
                <PendingRow
                  key={connection.id}
                  connection={connection}
                  incoming={false}
                  query={query}
                />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function PendingRow({
  connection,
  incoming,
  query,
  onRespond,
}: {
  connection: ConnectionDto;
  incoming: boolean;
  query: string;
  onRespond?: (action: "accept" | "decline") => void;
}) {
  const userQuery = useUser(connection.otherUserId);
  const user = userQuery.data;
  const username = user?.username ?? connection.otherUserId.slice(0, 8);
  if (!matches(query, username)) return null;

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-control)] px-2 py-1.5">
      <Avatar name={username} seed={connection.otherUserId} src={user?.profilePictureUrl} size={48} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-ui text-[15px] font-medium text-[var(--app-panel-text)]">
          {username}
        </span>
        <span className="block truncate font-ui text-xs text-[var(--app-panel-text-soft)]">
          {incoming ? "Wants to connect" : "Request sent"}
        </span>
      </span>
      {incoming ? (
        <span className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onRespond?.("accept")}
            className="focus-ring inline-flex h-8 items-center gap-1 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-2.5 font-ui text-xs font-semibold text-[var(--color-parchment)]"
          >
            <Check size={14} strokeWidth={2} aria-hidden="true" />
            Accept
          </button>
          <button
            type="button"
            onClick={() => onRespond?.("decline")}
            className="focus-ring inline-flex h-8 items-center gap-1 rounded-[var(--radius-control)] border border-[var(--app-panel-field-border)] px-2.5 font-ui text-xs text-[var(--app-panel-text)]"
          >
            <X size={14} strokeWidth={2} aria-hidden="true" />
            Decline
          </button>
        </span>
      ) : (
        <span className="rounded-full border border-[var(--app-panel-divider)] px-2 py-1 font-ui text-xs text-[var(--app-panel-text-soft)]">
          Pending
        </span>
      )}
    </div>
  );
}

function BlockedList({
  userIds,
  loading,
  query,
}: {
  userIds: string[];
  loading: boolean;
  query: string;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1 px-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (userIds.length === 0) {
    return (
      <EmptyState
        icon={<X size={22} strokeWidth={1.75} />}
        title="You haven't blocked anyone"
        description="People you block are hidden from messaging and listed here."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-0.5 px-1">
      {userIds.map((userId) => (
        <BlockedRow key={userId} userId={userId} query={query} />
      ))}
    </ul>
  );
}

function BlockedRow({ userId, query }: { userId: string; query: string }) {
  const toast = useToast();
  const currentUserId = useAuth().session?.userId ?? null;
  const userQuery = useUser(userId);
  const unblock = useUnblockUser(currentUserId);
  const username = userQuery.data?.username ?? userId.slice(0, 8);
  if (!matches(query, username)) return null;

  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-control)] px-2 py-1.5">
      <Avatar name={username} seed={userId} src={userQuery.data?.profilePictureUrl} size={48} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-ui text-[15px] font-medium text-[var(--app-panel-text)]">
          {username}
        </span>
        <span className="block font-ui text-xs text-[var(--app-panel-text-soft)]">
          Blocked · messaging disabled
        </span>
      </span>
      <button
        type="button"
        onClick={async () => {
          try {
            await unblock.mutateAsync(userId);
            toast.push("User unblocked.", "success");
          } catch (error) {
            toast.push(errorMessage(error), "error");
          }
        }}
        className="focus-ring h-8 rounded-[var(--radius-control)] border border-[var(--app-panel-field-border)] px-2.5 font-ui text-xs text-[var(--app-panel-text)]"
      >
        Unblock
      </button>
    </li>
  );
}
