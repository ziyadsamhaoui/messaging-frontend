"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { roomsQueryKey } from "@/hooks/useRooms";
import { roomHref } from "@/lib/appRoute";
import { createRoom } from "@/lib/services/rooms";
import { useUiStore } from "@/store/uiStore";
import { CreateRoomRequest, CursorPage, RoomResponse } from "@/lib/types";
import { SelectionPrompt } from "@/components/layout/SelectionPrompt";
import { ConversationsPanel } from "./ConversationsPanel";
import { ChatScreen } from "./ChatScreen";
import { NewChatView } from "./NewChatView";

/**
 * The conversations destination: the list panel plus either the open conversation
 * or the empty state.
 *
 * Starting a chat is a view of the panel rather than a dialog, so the shell and the
 * URL stay intact while it is open. The panel's action button and the empty state's
 * button both open it, and both land on the same room creation.
 */
export function ChatsDestination({ roomId }: { roomId: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);

  async function handleCreate(body: CreateRoomRequest) {
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
    setComposing(false);
    router.push(roomHref(room.id));
  }

  return (
    <>
      {composing ? (
        <NewChatView onCancel={() => setComposing(false)} onCreate={handleCreate} />
      ) : (
        <ConversationsPanel
          activeRoomId={roomId}
          onNewChat={() => setComposing(true)}
          hideOnNarrow={Boolean(roomId)}
        />
      )}

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
              onClick={() => setComposing(true)}
              className="focus-ring-light inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2.5 font-ui text-sm font-semibold text-[var(--color-parchment)]"
            >
              <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
              New chat
            </button>
          }
        />
      )}
    </>
  );
}
