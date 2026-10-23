"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getRoom, listRooms } from "@/lib/services/rooms";

export const roomsQueryKey = ["rooms"] as const;

export function useRooms() {
  return useInfiniteQuery({
    queryKey: roomsQueryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listRooms(pageParam, 20),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
  });
}

export function useRoom(roomId: string | null | undefined) {
  return useQuery({
    queryKey: [...roomsQueryKey, roomId ?? "none"] as const,
    enabled: Boolean(roomId),
    queryFn: () => getRoom(roomId as string),
  });
}
