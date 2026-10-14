"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/errors";
import { socketManager } from "@/lib/socketManager";
import { ConnectionState } from "@/lib/stompClient";
import { refreshSession } from "@/lib/apiClient";
import { getSession, isAccessTokenUsable, isSessionExpired } from "@/lib/tokenStore";

interface UseSocketOptions {
  token: string | null;
  onServerError?: (error: ApiError) => void;
}

export function useSocket({ token, onServerError }: UseSocketOptions) {
  const [state, setState] = useState<ConnectionState>(socketManager.getState());

  useEffect(() => socketManager.onState(setState), []);

  useEffect(() => {
    if (!onServerError) return;
    return socketManager.onError(onServerError);
  }, [onServerError]);

  useEffect(() => {
    let active = true;
    if (!token) {
      socketManager.disconnect();
      return () => {
        active = false;
      };
    }

    const connect = async () => {
      const session = getSession();
      if (!session) return;
      const next = isSessionExpired(session, 5_000) || !isAccessTokenUsable(session.accessToken, 5_000)
        ? await refreshSession()
        : session;
      if (!next) {
        // Could not obtain a usable token: stay offline instead of signing the user out. Clearing
        // the session here would turn any transient refresh failure into a logout; the REST layer
        // owns that decision and only acts on a genuine 401.
        socketManager.disconnect();
        return;
      }
      if (active && next && isAccessTokenUsable(next.accessToken, 5_000)) {
        socketManager.connect(next.accessToken);
      }
    };
    void connect();
    return () => {
      active = false;
    };
  }, [token]);

  return {
    state,
    isConnected: state === "connected",
    subscribe: socketManager.subscribe,
    publish: socketManager.publish,
  };
}
