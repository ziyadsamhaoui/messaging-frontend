"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptConnection,
  connectUser,
  declineConnection,
  listConnections,
  listPendingConnections,
} from "@/lib/services/users";
import { unreadCountQueryKey } from "./useNotifications";

export const connectionsQueryKey = ["connections"] as const;

export const pendingConnectionsQueryKey = ["connections", "pending"] as const;

export function useConnections(enabled = true) {
  return useQuery({
    queryKey: connectionsQueryKey,
    queryFn: listConnections,
    enabled,
    staleTime: 30_000,
  });
}

export function usePendingConnections(enabled = true) {
  return useQuery({
    queryKey: pendingConnectionsQueryKey,
    queryFn: listPendingConnections,
    enabled,
    staleTime: 15_000,
  });
}

export function useConnectUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetId: string) => connectUser(targetId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pendingConnectionsQueryKey });
    },
  });
}

export function useAcceptConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: number) => acceptConnection(connectionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: connectionsQueryKey });
      void queryClient.invalidateQueries({ queryKey: pendingConnectionsQueryKey });
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
    },
  });
}

export function useDeclineConnection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: number) => declineConnection(connectionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: pendingConnectionsQueryKey });
    },
  });
}
