"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { listRoomMedia, lookupAttachments } from "@/lib/services/attachments";

export function attachmentLookupKey(roomId: string | null, ids: string[]) {
  return ["attachments", roomId, ids] as const;
}

export function useAttachmentLookup(roomId: string | null, ids: string[]) {
  const unique = Array.from(new Set(ids.filter(Boolean))).sort();

  return useQuery({
    queryKey: attachmentLookupKey(roomId, unique),
    queryFn: () => lookupAttachments(unique.slice(0, 100)),
    enabled: Boolean(roomId) && unique.length > 0,
    staleTime: 60_000,
  });
}

export function roomMediaKey(roomId: string | null, limit: number) {
  return ["room-media", roomId, limit] as const;
}

export function useRoomMedia(roomId: string | null, limit = 30) {
  return useInfiniteQuery({
    queryKey: roomMediaKey(roomId, limit),
    enabled: Boolean(roomId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listRoomMedia(roomId as string, pageParam, limit),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor ?? undefined : undefined,
    staleTime: 30_000,
  });
}
