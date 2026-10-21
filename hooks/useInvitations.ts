"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptInvitation,
  listPendingInvitations,
  rejectInvitation,
} from "@/lib/services/rooms";
import { unreadCountQueryKey } from "./useNotifications";
import { roomsQueryKey } from "./useRooms";

export const pendingInvitationsQueryKey = ["invitations", "pending"] as const;

export function usePendingInvitations(enabled = true) {
  return useQuery({
    queryKey: pendingInvitationsQueryKey,
    queryFn: listPendingInvitations,
    enabled,
    staleTime: 0,
  });
}

function useInvitationDecision<T>(decide: (invitationId: string) => Promise<T>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => decide(invitationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
      void queryClient.invalidateQueries({ queryKey: roomsQueryKey });
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
    },
  });
}

export function useAcceptInvitation() {
  return useInvitationDecision(acceptInvitation);
}

export function useRejectInvitation() {
  return useInvitationDecision(rejectInvitation);
}
