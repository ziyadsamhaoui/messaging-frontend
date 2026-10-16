"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { roomsQueryKey } from "@/hooks/useRooms";
import { roomHref } from "@/lib/appRoute";
import { createRoom } from "@/lib/services/rooms";
import { useUiStore } from "@/store/uiStore";
import { CursorPage, RoomResponse } from "@/lib/types";
import { NewConversationModal } from "@/components/sidebar/NewConversationModal";
import { SelectionPrompt } from "@/components/layout/SelectionPrompt";
import { ConversationsPanel } from "./ConversationsPanel";
import { ChatScreen } from "./ChatScreen";

/**
 * The conversations destination: the list panel plus either the open conversation
 * or the empty state.
 *
 * The new-chat flow is owned here rather than inside the panel, because both the
 * panel's action button and the empty state's button open it, and both need the
 * same room to be created and opened.
 */
export function ChatsDestination({ roomId }: { roomId: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <ConversationsPanel
        activeRoomId={roomId}
        onNewChat={() => setCreating(true)}
        hideOnNarrow={Boolean(roomId)}
      />

      {roomId ? (
        <ChatScreen roomId={roomId} />
      ) : (
        <SelectionPrompt
          hideOnNarrow
          title="Select a chat"
          description="Choose a conversation from the list to keep talking, or start a new one."
          action={
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="focus-ring-light inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2.5 font-ui text-sm font-semibold text-[var(--color-parchment)]"
            >
              <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
              New chat
            </button>
          }
        />
      )}

      <NewConversationModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreate={async (body) => {
          const room = await createRoom(body);
          // Seed the list before navigating so the destination we land on already
          // shows the new room instead of waiting for a refetch.
          queryClient.setQueryData<InfiniteData<CursorPage<RoomResponse>>>(roomsQueryKey, (current) => {
            if (!current || current.pages.length === 0) {
              return {
                pageParams: [undefined],
                pages: [{ items: [room], nextCursor: null, hasMore: false }],
              };
            }
            const [first, ...rest] = current.pages;
            if (first.items.some((item) => item.id === room.id)) return current;
            return { ...current, pages: [{ ...first, items: [room, ...first.items] }, ...rest] };
          });
          useUiStore.getState().noteRoomActivity(room.id, room.createdAt);
          router.push(roomHref(room.id));
        }}
      />
    </>
  );
}
