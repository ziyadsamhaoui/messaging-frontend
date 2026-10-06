"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { listRooms } from "@/lib/services/rooms";

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
