export type ConversationType = "PRIVATE" | "GROUP";

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  errorCode: string | null;
}

export interface UserDTO {
  userId: number;
  username: string;
  displayName?: string | null;
  email?: string | null;
  createdAt?: string | null;
}

export interface ConversationDTO {
  conversationId: number;
  type: ConversationType;
  name?: string | null;
  createdAt: string;
  participants: UserDTO[];
  lastMessage?: MessageDTO | null;
}

export interface MessageDTO {
  messageId: number;
  conversationId: number;
  userId: number;
  content: string;
  createdAt: string;
}

export interface ConversationPageDTO {
  items: ConversationDTO[];
  nextCursor: number | null;
}

export interface MessagePageDTO {
  items: MessageDTO[];
  nextCursor: number | null;
}

export interface CreateConversationRequest {
  type: ConversationType;
  targetUsername?: string;
  participantUsernames?: string[];
  name?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  displayName?: string;
  email?: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  userId: number;
}

