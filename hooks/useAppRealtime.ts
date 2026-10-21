"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { STOMP_DESTINATIONS } from "@/lib/stompClient";
import { classifyUserFrame } from "@/lib/realtimeFrames";
import { pendingInvitationsQueryKey } from "./useInvitations";
import { connectionsQueryKey, pendingConnectionsQueryKey } from "./useConnections";
import { useSocket } from "./useSocket";
import { useUiStore } from "@/store/uiStore";
import { useToast } from "@/components/ui/Toast";

export function useAppRealtime(currentUserId: string | null, accessToken: string | null) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const setSocketState = useUiStore((state) => state.setSocketState);

  const { state, subscribe } = useSocket({
    token: accessToken,
    onServerError: (error) => {
      const message = error.message || "Something went wrong.";
      toast.push(message, "error");
    },
  });

  useEffect(() => {
    setSocketState(state);
  }, [state, setSocketState]);

  useEffect(() => {
    if (!currentUserId) return undefined;

    return subscribe(STOMP_DESTINATIONS.userEvents(currentUserId), (message) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(message.body);
      } catch {
        return;
      }

      const frame = classifyUserFrame(parsed);
      if (!frame) return;

      switch (frame.kind) {
        case "invitation-sent":
          void queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          toast.push("You received a room invitation.", "info");
          break;
        case "invitation-accepted":
          void queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
          void queryClient.invalidateQueries({ queryKey: ["participants"] });
          void queryClient.invalidateQueries({ queryKey: ["rooms"] });
          toast.push(
            `${frame.frame.invitedUsername ?? "Someone"} accepted your invitation.`,
            "success"
          );
          break;
        case "connection-accepted": {
          const other =
            frame.frame.userIdA === currentUserId
              ? frame.frame.userBUsername
              : frame.frame.userAUsername;
          toast.push(`${other ?? "Someone"} accepted your connection request.`, "success");
          void queryClient.invalidateQueries({ queryKey: connectionsQueryKey });
          void queryClient.invalidateQueries({ queryKey: pendingConnectionsQueryKey });
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          break;
        }
        default:
          break;
      }
    });
  }, [currentUserId, subscribe, queryClient, toast]);
}
