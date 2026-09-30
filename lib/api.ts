import { ErrorResponse, ConversationPageDTO, ConversationDTO, CreateConversationRequest, MessageDTO, MessagePageDTO, LoginResponse, RegisterRequest, UserDTO } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  payload?: ErrorResponse;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, payload?: ErrorResponse, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function parseError(response: Response): Promise<ErrorResponse | null> {
  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const payload = await parseError(res);
    const message = payload?.message || `Request failed with status ${res.status}`;
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    throw new ApiError(message, res.status, payload || undefined, Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined);
  }

  return (await res.json()) as T;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function register(payload: RegisterRequest): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getConversations(token: string, cursor?: number | null, limit = 20) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", String(cursor));
  params.set("limit", String(limit));
  return request<ConversationPageDTO>(`/api/conversations?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createConversation(token: string, body: CreateConversationRequest) {
  return request<ConversationDTO>("/api/conversations", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export async function getMessages(token: string, conversationId: number, cursor?: number | null, limit = 20) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", String(cursor));
  params.set("limit", String(limit));
  return request<MessagePageDTO>(`/api/conversations/${conversationId}/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function sendMessage(token: string, conversationId: number, content: string) {
  return request<MessageDTO>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content }),
  });
}

export async function searchUsers(token: string, query: string) {
  const params = new URLSearchParams({ query });
  return request<UserDTO[]>(`/api/users/search?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

