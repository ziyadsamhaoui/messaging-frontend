import { apiClient, buildQuery } from "../apiClient";
import {
  CursorPage,
  NotificationResponse,
  PreferencesResponse,
  SubscriptionResponse,
  UnreadCountResponse,
  UpdatePreferencesRequest,
} from "../types";

export function listNotifications(cursor?: string | null, limit = 30, unreadOnly = false) {
  return apiClient.get<CursorPage<NotificationResponse>>(
    `/notifications${buildQuery({ cursor, limit, unreadOnly })}`
  );
}

export function getUnreadCount() {
  return apiClient.get<UnreadCountResponse>("/notifications/unread-count");
}

export function markNotificationRead(id: string) {
  return apiClient.patch<void>(`/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return apiClient.post<UnreadCountResponse>("/notifications/read-all");
}

export function registerNotificationSubscription(body: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  return apiClient.post<SubscriptionResponse>("/notifications/subscriptions", body);
}

export function deleteNotificationSubscription(id: string) {
  return apiClient.delete<void>(`/notifications/subscriptions/${id}`);
}

export function getNotificationPreferences() {
  return apiClient.get<PreferencesResponse>("/notifications/preferences");
}

export function updateNotificationPreferences(body: UpdatePreferencesRequest) {
  return apiClient.patch<PreferencesResponse>("/notifications/preferences", body);
}
