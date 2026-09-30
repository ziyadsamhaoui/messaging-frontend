import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

export interface StompConfig {
  token: string;
  onConnect?: () => void;
  onError?: (error: string) => void;
}

export function createStompClient({ token, onConnect, onError }: StompConfig) {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000/ws";
  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    debug: () => {},
    onConnect: () => onConnect?.(),
    onStompError: (frame) => onError?.(frame.headers["message"] || "WebSocket error"),
  });

  return client;
}

export type MessageHandler = (message: IMessage) => void;

