import { AttachmentKind, MessageType } from "@/lib/types";
import { MAX_ATTACHMENT_BYTES } from "./upload";

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export class AttachmentPreparationError extends Error {}

export interface PreparedUpload {
  file: File;
  fileName: string;
  mimeType: string;
  size: number;
  kind: AttachmentKind;
}

export function kindOf(mimeType: string): AttachmentKind {
  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  if (normalized.startsWith("image/")) return "IMAGE";
  if (normalized.startsWith("video/")) return "VIDEO";
  if (normalized.startsWith("audio/")) return "AUDIO";
  return "FILE";
}

export function messageTypeOf(kind: AttachmentKind): MessageType {
  if (kind === "IMAGE") return "IMAGE";
  if (kind === "VIDEO") return "VIDEO";
  if (kind === "AUDIO") return "AUDIO";
  return "FILE";
}

export function extensionForMimeType(mimeType: string): string {
  const normalized = mimeType.split(";")[0].trim().toLowerCase();
  if (normalized === "audio/webm") return "webm";
  if (normalized === "audio/ogg" || normalized === "application/ogg") return "ogg";
  if (normalized === "audio/mp4") return "m4a";
  if (normalized === "audio/mpeg") return "mp3";
  if (normalized === "audio/wav" || normalized === "audio/x-wav") return "wav";
  if (normalized === "video/mp4") return "mp4";
  return "bin";
}

export async function prepareUpload(file: File): Promise<PreparedUpload> {
  const kind = kindOf(file.type);
  if (kind !== "IMAGE") {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new AttachmentPreparationError("This file is larger than 25 MB.");
    }
    return {
      file,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      kind,
    };
  }

  const prepared = await compressImage(file);
  if (prepared.size > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentPreparationError("This image is still larger than 25 MB after compression.");
  }
  return {
    file: prepared,
    fileName: prepared.name,
    mimeType: prepared.type,
    size: prepared.size,
    kind,
  };
}

async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif" || file.type === "image/svg+xml") {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new AttachmentPreparationError("This image is larger than 25 MB.");
    }
    return file;
  }

  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    if (typeof bitmap.close === "function") bitmap.close();
    throw new AttachmentPreparationError("This image could not be prepared for upload.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  if (typeof bitmap.close === "function") bitmap.close();

  const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, outputType, JPEG_QUALITY);
  });
  if (!blob) {
    throw new AttachmentPreparationError("This image could not be prepared for upload.");
  }
  if (scale === 1 && blob.size >= file.size) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  const extension = outputType === "image/png" ? "png" : "jpg";
  return new File([blob], `${baseName}.${extension}`, {
    type: outputType,
    lastModified: Date.now(),
  });
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    return await loadImageElement(file);
  }
}

function loadImageElement(file: File): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image as unknown as ImageBitmap);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new AttachmentPreparationError("This image format is not supported by the browser."));
    };
    image.src = url;
  });
}
