"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { blockUser, listBlocked, unblockUser } from "@/lib/services/users";

export function blockedIdsQueryKey(userId: string | null) {
  return ["blocks", userId ?? "none"] as const;
}

export function useBlockedUserIds(userId: string | null | undefined) {
  return useQuery({
    queryKey: blockedIdsQueryKey(userId ?? null),
    enabled: Boolean(userId),
    queryFn: () => listBlocked(userId as string),
    staleTime: 30_000,
  });
}

export function useBlockUser(currentUserId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetId: string) => blockUser(targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blockedIdsQueryKey(currentUserId) });
    },
  });
}

export function useUnblockUser(currentUserId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetId: string) => unblockUser(targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blockedIdsQueryKey(currentUserId) });
    },
  });
}
