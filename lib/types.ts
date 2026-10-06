export type RoomType = "DIRECT" | "GROUP";

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "FILE";

export type ParticipantRole = "OWNER" | "ADMIN" | "GUEST";

export type UserType = "USER" | "ADMIN";

export type ConnectionStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export type NotificationType = "MESSAGE" | "REACTION" | "INVITATION" | "SYSTEM";

export type NotificationSource = "MESSAGE" | "REACTION" | "INVITATION" | "SYSTEM";

export interface ErrorResponse {
  timestamp?: string;
  status: number;
  code?: string | null;
  error?: string | null;
  message: string;
  path?: string;
  fieldErrors?: Record<string, string>;
}

export interface PublicUserDto {
  id: string;
  username: string;
  profilePictureUrl?: string | null;
  description?: string | null;
  type: UserType;
  lastSeen?: string | null;
  createdAt?: string | null;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface RoomResponse {
  id: string;
  type: RoomType;
  name: string | null;
  isFavorited: boolean;
  createdBy: string;
  createdAt: string;
  lastMessageId: string | null;
  callerRole: ParticipantRole;
}

export interface MessageResponse {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  type: MessageType;
  content: string;
  attachmentIds: string[];
  isDeleted: boolean;
  deletedAt: string | null;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
}

export interface ParticipantResponse {
  id: string;
  roomId: string;
  userId: string;
  role: ParticipantRole;
  nickname: string | null;
  joinedAt: string;
  isMuted: boolean;
  mutedUntil: string | null;
}

export interface ReadCursorResponse {
  id: string;
  roomId: string;
  userId: string;
  lastReadMessageId: string;
  lastReadAt: string;
}

export interface InvitationResponse {
  id: string;
  roomId: string;
  inviterId: string;
  invitedId: string;
  status: InvitationStatus;
  sentAt: string;
  expiresAt: string;
}

export interface ReactionResponse {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  reactedAt: string;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  sourceType: NotificationSource;
  sourceId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export interface PreferencesResponse {
  mutedTypes: NotificationType[];
  pushEnabled: boolean;
}

export interface SubscriptionResponse {
  id: string;
  endpoint: string;
}

export interface ConnectionDto {
  id: number;
  status: ConnectionStatus;
  otherUserId: string;
  createdAt: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
}

export interface RegisterResponse {
  id: string;
  email: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  expiresAt: number;
  userId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface UpdateUserRequest {
  username: string;
  profilePictureUrl?: string | null;
  description?: string | null;
}

export interface UpdatePreferencesRequest {
  mutedTypes?: NotificationType[];
  pushEnabled?: boolean;
}

export interface UpdateParticipantRequest {
  role?: ParticipantRole;
  isMuted?: boolean;
  mutedUntil?: string | null;
}

export interface CreateRoomRequest {
  type: RoomType;
  name?: string;
  participantIds?: string[];
}

export interface SendMessageRequest {
  type: MessageType;
  content: string;
}

export interface SendMessageSocketPayload {
  roomId: string;
  type: MessageType;
  content: string;
}

export interface TypingSocketPayload {
  roomId: string;
}

export interface ErrorFrame {
  timestamp?: string;
  status: number;
  code: string;
  message: string;
  destination?: string;
}

export interface ChatMessage extends MessageResponse {
  pending?: boolean;
  failed?: boolean;
}

export interface TypingEvent {
  roomId: string;
  userId?: string;
  username?: string;
  typing?: boolean;
}
