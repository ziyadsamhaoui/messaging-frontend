"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/errors";
import { socketManager } from "@/lib/socketManager";
import { ConnectionState } from "@/lib/stompClient";

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
    if (token) {
      socketManager.connect(token);
    } else {
      socketManager.disconnect();
    }
  }, [token]);

  return {
    state,
    isConnected: state === "connected",
    subscribe: socketManager.subscribe,
    publish: socketManager.publish,
  };
}
