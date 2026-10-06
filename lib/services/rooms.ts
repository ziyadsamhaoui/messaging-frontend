import { apiClient, buildQuery } from "../apiClient";
import {
  CreateRoomRequest,
  CursorPage,
  InvitationResponse,
  MessageResponse,
  ParticipantResponse,
  ReactionResponse,
  ReadCursorResponse,
  RoomResponse,
  SendMessageRequest,
  UpdateParticipantRequest,
} from "../types";

export function listRooms(cursor?: string | null, limit = 20) {
  return apiClient.get<CursorPage<RoomResponse>>(`/rooms${buildQuery({ cursor, limit })}`);
}

export function createRoom(body: CreateRoomRequest) {
  return apiClient.post<RoomResponse>("/rooms", body);
}

export function getRoom(roomId: string) {
  return apiClient.get<RoomResponse>(`/rooms/${roomId}`);
}

export function listParticipants(roomId: string, cursor?: string | null, limit = 50) {
  return apiClient.get<CursorPage<ParticipantResponse>>(
    `/rooms/${roomId}/participants${buildQuery({ cursor, limit })}`
  );
}

export function updateParticipant(roomId: string, userId: string, body: UpdateParticipantRequest) {
  return apiClient.patch<ParticipantResponse>(`/rooms/${roomId}/participants/${userId}`, body);
}

export function removeParticipant(roomId: string, userId: string) {
  return apiClient.delete<void>(`/rooms/${roomId}/participants/${userId}`);
}

export function listMessages(roomId: string, cursor?: string | null, limit = 30) {
  return apiClient.get<CursorPage<MessageResponse>>(
    `/rooms/${roomId}/messages${buildQuery({ cursor, limit })}`
  );
}

export function sendMessage(roomId: string, body: SendMessageRequest) {
  return apiClient.post<MessageResponse>(`/rooms/${roomId}/messages`, body);
}

export function editMessage(roomId: string, messageId: string, content: string) {
  return apiClient.patch<MessageResponse>(`/rooms/${roomId}/messages/${messageId}`, { content });
}

export function deleteMessage(roomId: string, messageId: string) {
  return apiClient.delete<void>(`/rooms/${roomId}/messages/${messageId}`);
}

export function addReaction(roomId: string, messageId: string, emoji: string) {
  return apiClient.post<ReactionResponse>(`/rooms/${roomId}/messages/${messageId}/reactions`, { emoji });
}

export function removeReaction(roomId: string, messageId: string) {
  return apiClient.delete<void>(`/rooms/${roomId}/messages/${messageId}/reactions`);
}

export function markRoomRead(roomId: string, lastReadMessageId: string) {
  return apiClient.put<ReadCursorResponse>(`/rooms/${roomId}/read-cursor`, { lastReadMessageId });
}

export function inviteToRoom(roomId: string, invitedUserId: string, ttl?: string) {
  return apiClient.post<InvitationResponse>(`/rooms/${roomId}/invitations`, {
    invitedUserId,
    ttl,
  });
}

export function acceptInvitation(invitationId: string) {
  return apiClient.post<InvitationResponse>(`/invitations/${invitationId}/accept`);
}

export function rejectInvitation(invitationId: string) {
  return apiClient.post<InvitationResponse>(`/invitations/${invitationId}/reject`);
}
