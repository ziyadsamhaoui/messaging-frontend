"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
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
import { errorMessage } from "@/lib/errors";
import { ConnectionDto } from "@/lib/types";

interface ConnectionsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ConnectionsModal({ open, onClose }: ConnectionsModalProps) {
  const [tab, setTab] = useState<"connections" | "requests">("connections");

  return (
    <Modal open={open} onClose={onClose} title="Connections">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[rgba(95,141,78,0.2)] to-[rgba(164,190,123,0.1)] p-1">
          <button
            type="button"
            onClick={() => setTab("connections")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm transition-all ${
              tab === "connections"
                ? "bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] text-[var(--color-parchment)]"
                : "text-[rgba(229,217,182,0.7)]"
            }`}
          >
            Connections
          </button>
          <button
            type="button"
            onClick={() => setTab("requests")}
            className={`flex-1 rounded-xl px-3 py-2 text-sm transition-all ${
              tab === "requests"
                ? "bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] text-[var(--color-parchment)]"
                : "text-[rgba(229,217,182,0.7)]"
            }`}
          >
            Requests
          </button>
        </div>

        {tab === "connections" ? <ConnectionsList /> : <RequestsList />}
      </div>
    </Modal>
  );
}

function ConnectionsList() {
  const connectionsQuery = useConnections(true);
  const connections = connectionsQuery.data ?? [];

  if (connectionsQuery.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-[var(--color-text-secondary-soft)]">
        No connections yet. Send a request from the Requests tab.
      </div>
    );
  }

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto">
      {connections.map((connection) => (
        <ConnectionRow key={connection.id} connection={connection} />
      ))}
    </div>
  );
}

function ConnectionRow({ connection }: { connection: ConnectionDto }) {
  const toast = useToast();
  const userQuery = useUser(connection.otherUserId);
  const remove = useRemoveConnection();
  const [confirming, setConfirming] = useState(false);
  const username = userQuery.data?.username ?? connection.otherUserId.slice(0, 8);

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
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] px-3 py-2">
      <Avatar name={username} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--color-parchment)]">
          @{username}
        </div>
        <div className="text-xs text-[var(--color-text-secondary-soft)]">Connected</div>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void confirmRemove()}
            disabled={remove.isPending}
            className="rounded-lg bg-[rgba(192,57,43,0.85)] px-2 py-1 text-xs font-semibold text-[var(--color-parchment)] disabled:opacity-60"
          >
            {remove.isPending ? "Removing…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={remove.isPending}
            className="rounded-lg border border-[rgba(164,190,123,0.35)] px-2 py-1 text-xs text-[var(--color-parchment)] disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Remove connection with ${username}`}
          className="rounded-lg border border-[rgba(164,190,123,0.35)] px-2 py-1 text-xs text-[rgba(229,217,182,0.8)] hover:border-[rgba(192,57,43,0.6)] hover:text-[var(--color-parchment)]"
        >
          Remove
        </button>
      )}
    </div>
  );
}

function RequestsList() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const pendingQuery = usePendingConnections(true);
  const connect = useConnectUser();
  const accept = useAcceptConnection();
  const decline = useDeclineConnection();
  const pending = pendingQuery.data ?? [];

  // Only requests addressed to the current user may be accepted or declined; the
  // sender sees an outgoing "pending" state instead (the backend rejects a
  // requester acting on their own request, so this is not the only guard).
  const incoming = pending.filter((connection) => connection.direction === "INCOMING");
  const outgoing = pending.filter((connection) => connection.direction !== "INCOMING");

  async function sendRequest(userId: string, username: string) {
    setConnectingId(userId);
    try {
      await connect.mutateAsync(userId);
      toast.push(`Connection request sent to @${username}.`, "success");
      setQuery("");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    } finally {
      setConnectingId(null);
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border-subtle)] p-3">
        <UserSearchCombobox
          label="Send a connection request"
          value={query}
          onValueChange={setQuery}
          onSelect={(user) => void sendRequest(user.id, user.username)}
          placeholder="Search by username"
          inputClassName="bg-[rgba(26,58,32,0.6)]"
          renderOption={(user) => (
            <>
              <span className="truncate text-sm text-[var(--color-parchment)]">@{user.username}</span>
              <span className="text-xs font-semibold text-[var(--color-sage)]">
                {connectingId === user.id ? "Sending…" : "Connect"}
              </span>
            </>
          )}
        />
      </div>

      {pendingQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Skeleton key={index} className="h-12" />
          ))}
        </div>
      ) : pending.length === 0 ? (
        <div className="py-4 text-center text-sm text-[var(--color-text-secondary-soft)]">
          No pending requests.
        </div>
      ) : (
        <div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
          {incoming.length > 0 && (
            <PendingSection title="Received">
              {incoming.map((connection) => (
                <PendingRow
                  key={connection.id}
                  connection={connection}
                  incoming
                  onRespond={(action) => void respond(connection, action)}
                />
              ))}
            </PendingSection>
          )}
          {outgoing.length > 0 && (
            <PendingSection title="Sent">
              {outgoing.map((connection) => (
                <PendingRow key={connection.id} connection={connection} incoming={false} />
              ))}
            </PendingSection>
          )}
        </div>
      )}
    </div>
  );
}

function PendingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary-soft)]">
        {title}
      </div>
      {children}
    </div>
  );
}

function PendingRow({
  connection,
  incoming,
  onRespond,
}: {
  connection: ConnectionDto;
  incoming: boolean;
  onRespond?: (action: "accept" | "decline") => void;
}) {
  const userQuery = useUser(connection.otherUserId);
  const username = userQuery.data?.username ?? connection.otherUserId.slice(0, 8);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] px-3 py-2">
      <Avatar name={username} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--color-parchment)]">
          @{username}
        </div>
        <div className="text-xs text-[var(--color-text-secondary-soft)]">
          {incoming ? "Wants to connect" : "Request sent"}
        </div>
      </div>
      {incoming ? (
        <>
          <button
            type="button"
            onClick={() => onRespond?.("accept")}
            className="rounded-lg bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-2 py-1 text-xs font-semibold text-[var(--color-parchment)]"
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => onRespond?.("decline")}
            className="rounded-lg border border-[rgba(164,190,123,0.35)] px-2 py-1 text-xs text-[var(--color-parchment)]"
          >
            Decline
          </button>
        </>
      ) : (
        <span className="rounded-lg border border-[var(--color-border-subtle)] px-2 py-1 text-xs text-[var(--color-text-secondary-soft)]">
          Pending
        </span>
      )}
    </div>
  );
}
