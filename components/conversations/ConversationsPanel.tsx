"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareText, SquarePen } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useRooms } from "@/hooks/useRooms";
import { useRoomParticipants } from "@/hooks/useMessages";
import { useUser } from "@/hooks/useUser";
import { useUiStore } from "@/store/uiStore";
import { flattenPages } from "@/lib/pagination";
import { roomHref } from "@/lib/appRoute";
import { readCachedPreview } from "@/lib/roomPreview";
import { formatListTime } from "@/lib/time";
import { derivePresence } from "@/lib/presence";
import { cn } from "@/lib/utils";
import { RoomResponse } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { SectionPanel } from "@/components/layout/SectionPanel";

type ChatFilter = "all" | "direct" | "groups";

const FILTERS: Array<{ value: ChatFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "direct", label: "Direct" },
  { value: "groups", label: "Groups" },
];

/**
 * Zone two for the conversations destination.
 *
 * Direct rooms have no name of their own — the API returns `name: null` for them —
 * so the row resolves the other participant and their profile to show a person's
 * name instead of the old literal "Direct message". Both lookups go through React
 * Query, so the participants of a room and a user's profile are fetched once and
 * shared with the open conversation.
 */
export function ConversationsPanel({
  activeRoomId,
  onNewChat,
  hideOnNarrow,
}: {
  activeRoomId: string | null;
  onNewChat: () => void;
  hideOnNarrow?: boolean;
}) {
  const auth = useAuth();
  const currentUserId = auth.session?.userId ?? null;
  const roomsQuery = useRooms();
  const roomActivity = useUiStore((state) => state.roomActivity);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ChatFilter>("all");

  const rooms = useMemo(() => {
    const items = flattenPages(roomsQuery.data?.pages) as RoomResponse[];
    // Most recent activity first. The server orders rooms by creation date and does
    // not expose a last-message timestamp, so the order is refined locally from what
    // this client has seen.
    return [...items].sort((left, right) => {
      const a = roomActivity[left.id] ?? left.createdAt;
      const b = roomActivity[right.id] ?? right.createdAt;
      return Date.parse(b) - Date.parse(a);
    });
  }, [roomsQuery.data, roomActivity]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rooms.filter((room) => {
      if (filter === "direct" && room.type !== "DIRECT") return false;
      if (filter === "groups" && room.type !== "GROUP") return false;
      if (!needle) return true;
      return (room.name ?? "").toLowerCase().includes(needle);
    });
  }, [rooms, query, filter]);

  return (
    <SectionPanel
      title="Chats"
      hideOnNarrow={hideOnNarrow}
        actions={
          <IconButton label="New chat" tooltip="New chat" tooltipSide="bottom" onClick={onNewChat}>
            <SquarePen size={20} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        }
        toolbar={
          <div className="flex flex-col gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
              className="focus-ring h-10 w-full rounded-[var(--radius-control)] border border-[var(--app-panel-field-border)] bg-[var(--app-panel-field)] px-3 font-ui text-sm text-[var(--app-panel-text)] placeholder:text-[var(--app-rail-text)]"
            />
            <div className="flex items-center gap-1.5" role="group" aria-label="Filter chats">
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={filter === option.value}
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "focus-ring h-8 rounded-full px-3 font-ui text-[13px] font-medium transition-colors duration-150 motion-reduce:transition-none",
                    filter === option.value
                      ? "bg-[var(--color-sage)] text-[var(--color-forest-deep)]"
                      : "bg-[rgba(164,190,123,0.12)] text-[var(--app-panel-text-soft)] hover:bg-[rgba(164,190,123,0.2)] hover:text-[var(--app-panel-text)]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {roomsQuery.isLoading && rooms.length === 0 ? (
          <div className="flex flex-col gap-1 px-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[72px] rounded-xl" />
            ))}
          </div>
        ) : roomsQuery.isError ? (
          <ErrorBlock
            title="Couldn't load chats"
            reason="The conversation list did not come back from the server."
            onRetry={() => void roomsQuery.refetch()}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<MessageSquareText size={22} strokeWidth={1.75} />}
            title={query ? "No chats match" : "No chats yet"}
            description={query ? "Try a different name." : "Start a conversation and it will appear here."}
            action={
              query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="focus-ring rounded-[var(--radius-control)] border border-[var(--app-panel-field-border)] px-4 py-2 font-ui text-sm font-medium text-[var(--app-panel-text)]"
                >
                  Clear search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onNewChat}
                  className="focus-ring rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 font-ui text-sm font-semibold text-[var(--color-parchment)]"
                >
                  Start a new chat
                </button>
              )
            }
          />
        ) : (
          <ul className="flex flex-col gap-0.5 px-1">
            {visible.map((room) => (
              <li key={room.id}>
                <ConversationRow
                  room={room}
                  active={room.id === activeRoomId}
                  currentUserId={currentUserId}
                />
              </li>
            ))}
          </ul>
        )}
    </SectionPanel>
  );
}

function ConversationRow({
  room,
  active,
  currentUserId,
}: {
  room: RoomResponse;
  active: boolean;
  currentUserId: string | null;
}) {
  const queryClient = useQueryClient();
  // Only direct rooms need the peer lookup; the hooks are disabled for groups.
  const participantsQuery = useRoomParticipants(room.type === "DIRECT" ? room.id : null);
  const peerId =
    room.type === "DIRECT"
      ? participantsQuery.data?.items.find((participant) => participant.userId !== currentUserId)?.userId
      : undefined;
  const peerQuery = useUser(peerId);

  const title =
    room.type === "GROUP" ? room.name ?? "Group chat" : peerQuery.data?.username ?? "Conversation";
  const preview = readCachedPreview(queryClient, room.id, currentUserId, room.type === "GROUP");
  // Only claim a presence state when there is a `lastSeen` to derive it from.
  const presence =
    room.type === "DIRECT" && peerQuery.data?.lastSeen
      ? derivePresence(peerQuery.data.lastSeen)
      : undefined;

  return (
    <Link
      href={roomHref(room.id)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-ring relative flex h-[72px] items-center gap-3 rounded-[var(--radius-control)] px-2 transition-colors duration-150 motion-reduce:transition-none",
        active ? "bg-[var(--app-panel-active)]" : "hover:bg-[var(--app-panel-hover)]"
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-sage)]"
        />
      )}
      <Avatar
        name={title}
        seed={room.type === "DIRECT" ? peerId ?? room.id : room.id}
        src={peerQuery.data?.profilePictureUrl}
        size={48}
        status={presence}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate font-ui text-[15px] font-medium text-[var(--app-panel-text)]">
            {title}
          </span>
          {preview && (
            <span className="shrink-0 font-ui text-xs text-[var(--app-panel-text-soft)]">
              {formatListTime(preview.at)}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate font-ui text-[13px] text-[var(--app-panel-text-soft)]">
          {preview?.text ?? ""}
        </span>
      </span>
    </Link>
  );
}
