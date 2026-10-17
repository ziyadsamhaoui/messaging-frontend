"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Search, UserPlus, X } from "lucide-react";
import {
  SegmentedControl,
  segmentedPanelId,
  segmentedTabId,
} from "@/components/ui/SegmentedControl";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { UserSearchCombobox } from "@/components/ui/UserSearchCombobox";
import { useToast } from "@/components/ui/Toast";
import {
  useAcceptConnection,
  useConnectUser,
  useConnections,
  useDeclineConnection,
  usePendingConnections,
  useRemoveConnection,
} from "@/hooks/useConnections";
import { useUser } from "@/hooks/useUser";
import { connectionHref } from "@/lib/appRoute";
import { errorMessage } from "@/lib/errors";
import { derivePresence, formatLastSeen } from "@/lib/presence";
import { cn } from "@/lib/utils";
import { ConnectionDto } from "@/lib/types";

type Segment = "connected" | "requests";

const SEGMENTS_ID = "connections-segments";

/**
 * Zone two for the Connections destination.
 *
 * There are two lists — people you are connected to, and the requests in both
 * directions — and a third, temporary view for finding someone new. Blocked people
 * are not a connection state: they are an account-level list, so they live in
 * Settings, beside the rest of the controls that act on your own account.
 *
 * The add view replaces the list inside the panel rather than opening a dialog, so
 * the destination, the back button and the browser history keep working.
 */
export function ConnectionsPanel({
  hideOnNarrow,
  activeUserId,
}: {
  hideOnNarrow?: boolean;
  activeUserId?: string | null;
}) {
  const [segment, setSegment] = useState<Segment>("connected");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "add">("list");
  const connectionsQuery = useConnections(true);
  const pendingQuery = usePendingConnections(true);

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
  ];

  if (view === "add") {
    return (
      <SectionPanel
        title="Add connection"
        hideOnNarrow={hideOnNarrow}
        actions={
          <IconButton
            surface="panel"
            label="Back to connections"
            tooltip="Back"
            tooltipSide="bottom"
            onClick={() => setView("list")}
          >
            <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        }
      >
        <AddConnectionView
          onViewRequests={() => {
            setSegment("requests");
            setView("list");
          }}
        />
      </SectionPanel>
    );
  }

  return (
    <SectionPanel
      title="Connections"
      hideOnNarrow={hideOnNarrow}
      actions={
        <IconButton
          surface="panel"
          label="Add connection"
          tooltip="Add connection"
          tooltipSide="bottom"
          onClick={() => setView("add")}
        >
          <UserPlus size={20} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      }
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
            placeholder={segment === "requests" ? "Search requests" : "Search connections"}
            aria-label={segment === "requests" ? "Search requests" : "Search connections"}
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
            activeUserId={activeUserId ?? null}
          />
        )}
        {segment === "requests" && <RequestsList query={query} />}
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
  activeUserId,
}: {
  connections: ConnectionDto[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  query: string;
  activeUserId: string | null;
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
        description="Add someone by username and they will appear here once they accept."
      />
    );
  }

  return (
    <ul className="flex flex-col gap-0.5 px-1">
      {connections.map((connection) => (
        <ConnectedRow
          key={connection.id}
          connection={connection}
          query={query}
          active={connection.otherUserId === activeUserId}
        />
      ))}
    </ul>
  );
}

function ConnectedRow({
  connection,
  query,
  active,
}: {
  connection: ConnectionDto;
  query: string;
  active: boolean;
}) {
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
    <li
      className={cn(
        "relative flex items-center gap-1 rounded-[var(--radius-control)] transition-colors duration-150 motion-reduce:transition-none",
        active ? "bg-[var(--app-panel-active)]" : "hover:bg-[var(--app-panel-hover)]"
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-sage)]"
        />
      )}
      <Link
        href={connectionHref(connection.otherUserId)}
        aria-current={active ? "page" : undefined}
        className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-control)] px-2 py-1.5"
      >
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
      </Link>
      {confirming ? (
        <span className="flex items-center gap-1 pr-2">
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
          className="focus-ring mr-2 h-8 rounded-[var(--radius-control)] px-2 font-ui text-xs text-[var(--app-panel-text-soft)] hover:text-[var(--app-danger-on-dark)]"
        >
          Remove
        </button>
      )}
    </li>
  );
}

/**
 * The find-and-request view. Selecting someone whose relationship already exists
 * says so instead of sending a request the server would reject with a 409.
 */
function AddConnectionView({ onViewRequests }: { onViewRequests: () => void }) {
  const toast = useToast();
  const [value, setValue] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const pendingQuery = usePendingConnections(true);
  const connectionsQuery = useConnections(true);
  const connect = useConnectUser();

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
    () =>
      new Set(
        (pendingQuery.data ?? [])
          .filter((connection) => connection.direction !== "INCOMING")
          .map((connection) => connection.otherUserId)
      ),
    [pendingQuery.data]
  );

  async function sendRequest(userId: string, username: string) {
    setSendingId(userId);
    try {
      await connect.mutateAsync(userId);
      setSent(true);
      toast.push(`Connection request sent to @${username}.`, "success");
      setValue("");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 px-3">
      <p className="font-ui text-[13px] leading-relaxed text-[var(--app-panel-text-soft)]">
        Find someone by their username. They will appear under Requests until they
        accept.
      </p>

      <UserSearchCombobox
        label="Find people by username"
        value={value}
        onValueChange={setValue}
        onSelect={(user) => {
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
              <span className="shrink-0 font-ui text-xs font-semibold text-[var(--app-panel-text-soft)]">
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

      {sent && (
        <button
          type="button"
          onClick={onViewRequests}
          className="focus-ring self-start rounded-[var(--radius-control)] border border-[var(--app-panel-field-border)] px-3 py-2 font-ui text-sm font-medium text-[var(--app-panel-text)]"
        >
          View requests
        </button>
      )}

      <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--app-panel-divider)] p-3">
        <span aria-hidden="true" className="mt-0.5 text-[var(--app-panel-text-soft)]">
          <UserPlus size={16} strokeWidth={1.75} />
        </span>
        <p className="font-ui text-[13px] leading-relaxed text-[var(--app-panel-text-soft)]">
          Blocked people are managed in Settings → Blocked users.
        </p>
      </div>
    </div>
  );
}

function RequestsList({ query }: { query: string }) {
  const toast = useToast();
  const pendingQuery = usePendingConnections(true);
  const accept = useAcceptConnection();
  const decline = useDeclineConnection();

  const pending = pendingQuery.data ?? [];
  const incoming = pending.filter((connection) => connection.direction === "INCOMING");
  const outgoing = pending.filter((connection) => connection.direction !== "INCOMING");

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

  if (pendingQuery.isLoading) {
    return (
      <div className="flex flex-col gap-1 px-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Skeleton key={index} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <EmptyState
        icon={<Check size={22} strokeWidth={1.75} />}
        title="No pending requests"
        description="Requests you send and receive appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 px-1">
      <section className="flex flex-col gap-1">
        <h3 className="px-1 font-ui text-[13px] font-semibold text-[var(--app-panel-text-soft)]">
          Received
        </h3>
        {incoming.length === 0 ? (
          <p className="px-1 py-1 font-ui text-[13px] text-[var(--app-panel-text-soft)]">
            Nothing waiting on you.
          </p>
        ) : (
          incoming.map((connection) => (
            <PendingRow
              key={connection.id}
              connection={connection}
              incoming
              query={query}
              onRespond={(action) => void respond(connection, action)}
            />
          ))
        )}
      </section>
      <section className="flex flex-col gap-1">
        <h3 className="px-1 font-ui text-[13px] font-semibold text-[var(--app-panel-text-soft)]">
          Sent
        </h3>
        {outgoing.length === 0 ? (
          <p className="px-1 py-1 font-ui text-[13px] text-[var(--app-panel-text-soft)]">
            No requests sent.
          </p>
        ) : (
          outgoing.map((connection) => (
            <PendingRow
              key={connection.id}
              connection={connection}
              incoming={false}
              query={query}
            />
          ))
        )}
      </section>
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
