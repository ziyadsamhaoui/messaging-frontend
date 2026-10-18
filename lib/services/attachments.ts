import { apiClient, buildQuery } from "@/lib/apiClient";
import {
  AttachmentPage,
  AttachmentResponse,
  CreateUploadIntentRequest,
  DownloadUrlResponse,
  UploadIntentResponse,
} from "@/lib/types";

export function createUploadIntent(body: CreateUploadIntentRequest) {
  return apiClient.post<UploadIntentResponse>("/attachments/intents", body);
}

export function confirmUpload(attachmentId: string) {
  return apiClient.post<AttachmentResponse>(`/attachments/${attachmentId}/confirm`);
}

export function getAttachment(attachmentId: string) {
  return apiClient.get<AttachmentResponse>(`/attachments/${attachmentId}`);
}

export function getDownloadUrl(attachmentId: string) {
  return apiClient.get<DownloadUrlResponse>(`/attachments/${attachmentId}/download`);
}

export function lookupAttachments(ids: string[]) {
  return apiClient.post<AttachmentResponse[]>("/attachments/lookup", { ids });
}

export function listRoomMedia(roomId: string, cursor?: string | null, limit = 30) {
  return apiClient.get<AttachmentPage>(
    `/attachments/rooms/${roomId}${buildQuery({ cursor, limit })}`
  );
}
