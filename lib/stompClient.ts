import { Client, IStompSocket } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { ACCESS_TOKEN_QUERY_PARAM, STOMP_URL } from "./env";

export type ConnectionState = "connected" | "connecting" | "reconnecting" | "offline";

export const STOMP_DESTINATIONS = {
  roomMessages: (roomId: string) => `/topic/rooms/${roomId}`,
  roomTyping: (roomId: string) => `/topic/rooms/${roomId}/typing`,
  userEvents: (userId: string) => `/topic/users/${userId}`,
  userErrors: "/user/queue/errors",
  sendMessage: "/app/chat.sendMessage",
  typing: "/app/chat.typing",
};

export function createSocketUrl(token: string): string {
  return `${STOMP_URL}?${ACCESS_TOKEN_QUERY_PARAM}=${encodeURIComponent(token)}`;
}

export function createStompClient(token: string): Client {
  return new Client({
    webSocketFactory: () => new SockJS(createSocketUrl(token)) as unknown as IStompSocket,
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  });
}
