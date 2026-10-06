import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import { ApiError, normalizeStompError } from "./errors";
import { ConnectionState, createStompClient, STOMP_DESTINATIONS } from "./stompClient";

type MessageHandler = (message: IMessage) => void;
type StateListener = (state: ConnectionState) => void;
type ErrorListener = (error: ApiError) => void;

class SocketManager {
  private client: Client | null = null;
  private token: string | null = null;
  private readonly desired = new Map<string, Set<MessageHandler>>();
  private readonly active = new Map<string, StompSubscription>();
  private readonly stateListeners = new Set<StateListener>();
  private readonly errorListeners = new Set<ErrorListener>();
  private state: ConnectionState = "offline";

  getState(): ConnectionState {
    return this.state;
  }

  onState = (listener: StateListener): (() => void) => {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  };

  onError = (listener: ErrorListener): (() => void) => {
    this.errorListeners.add(listener);
    return () => {
      this.errorListeners.delete(listener);
    };
  };

  private setState(next: ConnectionState) {
    if (this.state === next) return;
    this.state = next;
    this.stateListeners.forEach((listener) => listener(next));
  }

  private emitError(error: ApiError) {
    this.errorListeners.forEach((listener) => listener(error));
  }

  private attach = (destination: string) => {
    const client = this.client;
    if (!client?.connected) return;
    if (this.active.has(destination)) return;
    const subscription = client.subscribe(destination, (message) => {
      this.desired.get(destination)?.forEach((handler) => handler(message));
    });
    this.active.set(destination, subscription);
  };

  private attachAll = () => {
    this.desired.forEach((_handlers, destination) => this.attach(destination));
  };

  private ensureErrorSubscription() {
    if (this.desired.has(STOMP_DESTINATIONS.userErrors)) return;
    const handlers = new Set<MessageHandler>();
    handlers.add((message) => {
      const parsed = parseBody(message.body);
      this.emitError(normalizeStompError(parsed ?? message.body));
    });
    this.desired.set(STOMP_DESTINATIONS.userErrors, handlers);
  }

  connect = (token: string) => {
    if (!token) {
      this.disconnect();
      return;
    }
    if (this.client && this.token === token) return;
    this.disconnect();
    this.token = token;
    const client = createStompClient(token);
    this.client = client;
    this.setState("connecting");

    client.onConnect = () => {
      this.active.clear();
      this.setState("connected");
      this.attachAll();
    };
    client.onDisconnect = () => {
      this.active.clear();
      this.setState("offline");
    };
    client.onWebSocketClose = () => {
      this.active.clear();
      if (client.active) this.setState("reconnecting");
    };
    client.onStompError = (frame) => {
      this.emitError(normalizeStompError(frame.headers["message"] ?? frame.body));
    };

    this.ensureErrorSubscription();
    client.activate();
  };

  disconnect = () => {
    const client = this.client;
    this.client = null;
    this.token = null;
    this.active.clear();
    if (client) {
      void client.deactivate();
    }
    this.setState("offline");
  };

  subscribe = (destination: string, handler: MessageHandler): (() => void) => {
    let handlers = this.desired.get(destination);
    if (!handlers) {
      handlers = new Set<MessageHandler>();
      this.desired.set(destination, handlers);
    }
    handlers.add(handler);
    this.attach(destination);

    return () => {
      const current = this.desired.get(destination);
      if (!current) return;
      current.delete(handler);
      if (current.size > 0) return;
      this.desired.delete(destination);
      this.active.get(destination)?.unsubscribe();
      this.active.delete(destination);
    };
  };

  publish = (destination: string, body: unknown): boolean => {
    const client = this.client;
    if (!client?.connected) return false;
    client.publish({ destination, body: JSON.stringify(body) });
    return true;
  };
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export const socketManager = new SocketManager();
