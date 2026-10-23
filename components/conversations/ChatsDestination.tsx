"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { roomsQueryKey } from "@/hooks/useRooms";
import { roomHref } from "@/lib/appRoute";
import { createRoom } from "@/lib/services/rooms";
import { useUiStore } from "@/store/uiStore";
import { CreateRoomRequest, CursorPage, RoomResponse } from "@/lib/types";
import { MainPane } from "@/components/layout/MainPane";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConversationsPanel } from "./ConversationsPanel";
import { ChatScreen } from "./ChatScreen";
import { NewChatView } from "./NewChatView";

export function ChatsDestination({ roomId }: { roomId: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);

  async function handleCreate(body: CreateRoomRequest) {
    const room = await createRoom(body);
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
        <MainPane hideOnNarrow>
          <EmptyState
            tone="pane"
            className="m-auto"
            icon={<MessageSquare size={22} strokeWidth={1.75} />}
            title="Select a chat"
            description="Choose a conversation from the list to keep talking, or start a new one."
          />
        </MainPane>
      )}
    </>
  );
}
