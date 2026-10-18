import { describe, expect, it } from "vitest";
import {
  AttachmentPreparationError,
  extensionForMimeType,
  kindOf,
  messageTypeOf,
  prepareUpload,
} from "./compress";
import { MAX_ATTACHMENT_BYTES } from "./upload";

describe("attachment preparation", () => {
  it("maps recording containers onto an audio kind and an AUDIO message", () => {
    expect(kindOf("audio/webm;codecs=opus")).toBe("AUDIO");
    expect(kindOf("audio/ogg")).toBe("AUDIO");
    expect(kindOf("audio/mp4")).toBe("AUDIO");
    expect(kindOf("application/pdf")).toBe("FILE");
    expect(kindOf("video/mp4")).toBe("VIDEO");
    expect(kindOf("image/jpeg")).toBe("IMAGE");

    expect(messageTypeOf("AUDIO")).toBe("AUDIO");
    expect(messageTypeOf("FILE")).toBe("FILE");
    expect(messageTypeOf("IMAGE")).toBe("IMAGE");
    expect(messageTypeOf("VIDEO")).toBe("VIDEO");
  });

  it("derives the same extension for both WebM containers and the other recordings", () => {
    expect(extensionForMimeType("audio/webm;codecs=opus")).toBe("webm");
    expect(extensionForMimeType("audio/ogg")).toBe("ogg");
    expect(extensionForMimeType("audio/mp4")).toBe("m4a");
    expect(extensionForMimeType("audio/mpeg")).toBe("mp3");
  });

  it("passes a document through without touching its bytes", async () => {
    const file = new File(["article body"], "article.pdf", { type: "application/pdf" });
    const prepared = await prepareUpload(file);

    expect(prepared.file).toBe(file);
    expect(prepared.fileName).toBe("article.pdf");
    expect(prepared.mimeType).toBe("application/pdf");
    expect(prepared.size).toBe(file.size);
    expect(prepared.kind).toBe("FILE");
  });

  it("rejects a document above the server limit instead of uploading it", async () => {
    const oversized = {
      name: "huge.pdf",
      type: "application/pdf",
      size: MAX_ATTACHMENT_BYTES + 1,
    } as File;

    await expect(prepareUpload(oversized)).rejects.toBeInstanceOf(AttachmentPreparationError);
  });
});
