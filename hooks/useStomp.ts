"use client";

import { useCallback, useEffect, useRef } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import { createStompClient } from "../lib/stomp";

interface UseStompOptions {
  token: string | null;
  onError?: (message: string) => void;
  onConnect?: (client: Client) => void;
}

export function useStomp({ token, onError, onConnect }: UseStompOptions) {
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    if (!token) return;

    const client = createStompClient({
      token,
      onError,
      onConnect: () => onConnect?.(client),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
    };
  }, [token, onError, onConnect]);

  const subscribe = useCallback((destination: string, handler: (message: IMessage) => void) => {
    if (!clientRef.current || !clientRef.current.connected) return null;
    return clientRef.current.subscribe(destination, handler);
  }, []);

  const publish = useCallback((destination: string, body: string) => {
    if (!clientRef.current || !clientRef.current.connected) return;
    clientRef.current.publish({ destination, body });
  }, []);

  return { subscribe, publish };
}
