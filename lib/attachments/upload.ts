import { confirmUpload, createUploadIntent } from "@/lib/services/attachments";
import { AttachmentResponse } from "@/lib/types";
import { ApiError } from "@/lib/errors";

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export interface UploadableFile {
  file: File;
  fileName: string;
  mimeType: string;
  size: number;
}

export async function uploadAttachment(
  roomId: string,
  messageId: string,
  uploadable: UploadableFile
): Promise<AttachmentResponse> {
  const intent = await createUploadIntent({
    roomId,
    messageId,
    fileName: uploadable.fileName,
    fileType: uploadable.mimeType,
    fileSizeBytes: uploadable.size,
  });

  let response: Response;
  try {
    response = await fetch(intent.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": uploadable.mimeType },
      body: uploadable.file,
    });
  } catch {
    throw new ApiError({
      status: 0,
      code: "UPLOAD_FAILED",
      message: "The file could not be uploaded. Check your connection and try again.",
      kind: "generic",
    });
  }

  if (!response.ok) {
    throw new ApiError({
      status: response.status,
      code: "UPLOAD_FAILED",
      message: "The file could not be uploaded. Please try again.",
      kind: "generic",
    });
  }

  return confirmUpload(intent.attachmentId);
}
