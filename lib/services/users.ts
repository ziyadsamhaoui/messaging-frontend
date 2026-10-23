import { API_GATEWAY_URL } from "@/lib/env";
import { apiClient, buildQuery } from "@/lib/apiClient";
import { ConnectionDto, PublicUserDto, UpdateUserRequest } from "@/lib/types";

export interface AccountDto {
  id: string;
  email: string;
}

export function getAccount() {
  return apiClient.get<AccountDto>("/auth/me");
}

export function avatarUrl(id: string, version?: number | string): string {
  return `${API_GATEWAY_URL}/users/${id}/avatar${version !== undefined ? `?v=${version}` : ""}`;
}

export function uploadAvatar(id: string, image: Blob) {
  const form = new FormData();
  form.append("file", image, "avatar.jpg");
  return apiClient.post<void>(`/users/${id}/avatar`, form);
}

export function getUser(id: string) {
  return apiClient.get<PublicUserDto>(`/users/${id}`);
}

export function searchUsers(query: string, limit = 20) {
  return apiClient.get<PublicUserDto[]>(`/users/search${buildQuery({ q: query, limit })}`);
}

export function updateUser(id: string, body: UpdateUserRequest) {
  return apiClient.patch<PublicUserDto>(`/users/${id}`, body);
}

export function blockUser(id: string) {
  return apiClient.post<void>(`/users/${id}/block`);
}

export function unblockUser(id: string) {
  return apiClient.delete<void>(`/users/${id}/block`);
}

export function listBlocked(id: string) {
  return apiClient.get<string[]>(`/users/${id}/block`);
}

export function connectUser(id: string) {
  return apiClient.post<ConnectionDto>(`/users/${id}/connect`);
}

export function listConnections() {
  return apiClient.get<ConnectionDto[]>("/connections");
}

export function listPendingConnections() {
  return apiClient.get<ConnectionDto[]>("/connections/pending");
}

export function acceptConnection(id: number) {
  return apiClient.post<ConnectionDto>(`/connections/${id}/accept`);
}

export function declineConnection(id: number) {
  return apiClient.post<ConnectionDto>(`/connections/${id}/decline`);
}

export function removeConnection(id: number) {
  return apiClient.delete<void>(`/connections/${id}`);
}
