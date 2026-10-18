"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptInvitation,
  listPendingInvitations,
  rejectInvitation,
} from "@/lib/services/rooms";
import { unreadCountQueryKey } from "./useNotifications";
import { roomsQueryKey } from "./useRooms";

/**
 * Single source of truth for the invitation inbox: Chat returns only PENDING
 * invitations, in both directions, so completed invitations drop out for the
 * sender and the recipient without any client-side bookkeeping.
 */
export const pendingInvitationsQueryKey = ["invitations", "pending"] as const;

export function usePendingInvitations(enabled = true) {
  return useQuery({
    queryKey: pendingInvitationsQueryKey,
    queryFn: listPendingInvitations,
    enabled,
    // The inbox is small and always worth re-checking: opening the modal or
    // returning to the tab must not show an invitation the peer already answered.
    staleTime: 0,
  });
}

/*
 * Generic in the service call's own return type rather than erased to `unknown`: the
 * accept call answers with the invitation (and its room id), and the detail view needs
 * that room id to open the room it just joined.
 */
function useInvitationDecision<T>(decide: (invitationId: string) => Promise<T>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => decide(invitationId),
    onSuccess: () => {
      // The answered invitation is no longer PENDING, so a refetch removes it.
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
