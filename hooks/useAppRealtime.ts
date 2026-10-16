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

/**
 * The socket and the frames that follow the *user* rather than a room.
 *
 * These live in the shell's layout, not in a page, so navigating between
 * destinations never tears the connection down or re-subscribes: the socket was
 * already a module-level singleton, and keeping its consumer mounted is what keeps
 * the subscription list stable across a route change.
 *
 * Room-scoped frames (messages, reactions, typing) are subscribed by the chat pane
 * instead, because they are keyed to the open room and only that pane renders them.
 */
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
          // Refresh the inbox (and the rail badge) so the invitation is visible
          // without a reload.
          void queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          toast.push("You received a room invitation.", "info");
          break;
        case "invitation-accepted":
          // The sender's outgoing invitation is no longer pending, and the accepted
          // member now belongs in the open room's member list.
          void queryClient.invalidateQueries({ queryKey: pendingInvitationsQueryKey });
          void queryClient.invalidateQueries({ queryKey: ["participants"] });
          void queryClient.invalidateQueries({ queryKey: ["rooms"] });
          toast.push(
            `${frame.frame.invitedUsername ?? "Someone"} accepted your invitation.`,
            "success"
          );
          break;
        case "connection-accepted": {
          // The frame carries the canonical pair, so which name belongs to "the other
          // person" depends on which side the current user is.
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
