import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttachmentPreview } from "./AttachmentPreview";
import { AttachmentResponse, PendingAttachmentUpload } from "@/lib/types";

function attachment(overrides: Partial<AttachmentResponse> = {}): AttachmentResponse {
  return {
    id: "a-1",
    roomId: "r-1",
    messageId: "m-1",
    fileName: "photo.png",
    fileType: "image/png",
    kind: "IMAGE",
    fileSizeBytes: 2048,
    status: "READY",
    malwareStatus: "SAFE",
    moderationStatus: "SFW",
    uploadedAt: new Date("2026-10-17T10:00:00Z").toISOString(),
    scannedAt: new Date("2026-10-17T10:01:00Z").toISOString(),
    url: "https://files.test/photo.png",
    urlExpiresAt: new Date("2026-10-17T10:11:00Z").toISOString(),
    ...overrides,
  };
}

const FAILED_UPLOAD: PendingAttachmentUpload = {
  messageId: "m-1",
  attachmentId: null,
  fileName: "holiday.jpg",
  kind: "IMAGE",
  status: "failed",
  error: "Upload failed: the storage service rejected the file.",
};

describe("AttachmentPreview", () => {
  it("shows a failed upload with its file name, error and a working retry", async () => {
    const onRetry = vi.fn();
    render(<AttachmentPreview attachments={[]} pendingUpload={FAILED_UPLOAD} onRetry={onRetry} />);

    expect(screen.getByText("holiday.jpg")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/storage service rejected/i);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders a ready image with the file name as its alternative text", () => {
    render(<AttachmentPreview attachments={[attachment()]} />);

    const image = screen.getByRole("img", { name: "photo.png" });
    expect(image).toHaveAttribute("src", "https://files.test/photo.png");
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://files.test/photo.png");
  });

  it("renders a document as a download link with its size", () => {
    render(
      <AttachmentPreview
        attachments={[
          attachment({
            id: "a-2",
            fileName: "notes.pdf",
            fileType: "application/pdf",
            kind: "FILE",
            fileSizeBytes: 12 * 1024,
            url: "https://files.test/notes.pdf",
          }),
        ]}
      />
    );

    const link = screen.getByRole("link", { name: /notes\.pdf/ });
    expect(link).toHaveTextContent("12 KB");
    expect(link).toHaveAttribute("download", "notes.pdf");
  });

  it("shows processing for a not-yet-ready attachment and no image", () => {
    render(
      <AttachmentPreview
        attachments={[attachment({ status: "PENDING_SCAN", url: undefined })]}
      />
    );

    expect(screen.getByText("Preparing…")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows unavailable for a rejected attachment and exposes no URL", () => {
    render(
      <AttachmentPreview
        attachments={[attachment({ status: "REJECTED", url: undefined })]}
      />
    );

    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
