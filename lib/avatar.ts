export const AVATAR_SIZE_PX = 512;
export const AVATAR_VIEW_PX = 260;
export const AVATAR_MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const AVATAR_MIN_ZOOM = 1;
export const AVATAR_MAX_ZOOM = 3;

export type AvatarRotation = 0 | 90 | 180 | 270;

export interface AvatarCrop {
  zoom: number;
  rotation: AvatarRotation;
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_AVATAR_CROP: AvatarCrop = { zoom: 1, rotation: 0, offsetX: 0, offsetY: 0 };

export async function loadAvatarSource(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file.");
  }
  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    throw new Error("Choose an image smaller than 20 MB.");
  }
  return createImageBitmap(file).catch(() => {
    throw new Error("That image could not be read. Try a PNG, JPEG or WebP file.");
  });
}

function coverScale(width: number, height: number, rotation: AvatarRotation): number {
  const sideways = rotation === 90 || rotation === 270;
  const rotatedWidth = sideways ? height : width;
  const rotatedHeight = sideways ? width : height;
  return AVATAR_VIEW_PX / Math.min(rotatedWidth, rotatedHeight);
}

export function clampAvatarCrop(crop: AvatarCrop, width: number, height: number): AvatarCrop {
  const zoom = Math.min(AVATAR_MAX_ZOOM, Math.max(AVATAR_MIN_ZOOM, crop.zoom));
  const scale = coverScale(width, height, crop.rotation) * zoom;
  const sideways = crop.rotation === 90 || crop.rotation === 270;
  const renderedWidth = (sideways ? height : width) * scale;
  const renderedHeight = (sideways ? width : height) * scale;
  const maxX = Math.max(0, (renderedWidth - AVATAR_VIEW_PX) / 2);
  const maxY = Math.max(0, (renderedHeight - AVATAR_VIEW_PX) / 2);
  return {
    zoom,
    rotation: crop.rotation,
    offsetX: Math.min(maxX, Math.max(-maxX, crop.offsetX)),
    offsetY: Math.min(maxY, Math.max(-maxY, crop.offsetY)),
  };
}

export function paintAvatar(
  context: CanvasRenderingContext2D,
  source: ImageBitmap,
  crop: AvatarCrop,
  outputPx: number
): void {
  const factor = outputPx / AVATAR_VIEW_PX;
  const scale = coverScale(source.width, source.height, crop.rotation) * crop.zoom * factor;
  const centre = outputPx / 2;

  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outputPx, outputPx);
  context.translate(centre + crop.offsetX * factor, centre + crop.offsetY * factor);
  context.rotate((crop.rotation * Math.PI) / 180);
  context.scale(scale, scale);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  context.restore();
}

export async function renderAvatar(source: ImageBitmap, crop: AvatarCrop): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE_PX;
  canvas.height = AVATAR_SIZE_PX;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot process images.");
  paintAvatar(context, source, crop, AVATAR_SIZE_PX);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9)
  );
  if (!blob) throw new Error("That image could not be processed.");
  return blob;
}
