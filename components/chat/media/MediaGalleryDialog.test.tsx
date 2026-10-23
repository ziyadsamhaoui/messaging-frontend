import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/Toast";
import { MediaGalleryDialog } from "./MediaGalleryDialog";
import { AttachmentResponse } from "@/lib/types";

const state = vi.hoisted(() => ({
  media: {} as Record<string, unknown>,
  deleteMessage: vi.fn(),
}));

vi.mock("@/hooks/useAttachments", () => ({
  useRoomMedia: () => state.media,
  invalidateRoomMedia: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/services/rooms", () => ({
  deleteMessage: (...args: unknown[]) => state.deleteMessage(...args),
}));

function attachment(id: string, messageId: string, fileName: string): AttachmentResponse {
  return {
    id,
    roomId: "r-1",
    messageId,
    fileName,
    fileType: "image/png",
    kind: "IMAGE",
    fileSizeBytes: 1024,
    status: "READY",
    malwareStatus: "SAFE",
    moderationStatus: "SFW",
    uploadedAt: new Date("2026-10-17T10:00:00Z").toISOString(),
    scannedAt: new Date("2026-10-17T10:01:00Z").toISOString(),
    url: `https://files.test/${id}.png`,
    urlExpiresAt: new Date("2026-10-17T10:11:00Z").toISOString(),
  };
}

function renderGallery() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MediaGalleryDialog roomId="r-1" initialManage onClose={vi.fn()} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  state.deleteMessage.mockReset().mockResolvedValue(undefined);
  state.media = {
    data: {
      pages: [
        {
          items: [
            attachment("a-1", "m-1", "first.png"),
            attachment("a-2", "m-1", "second.png"),
            attachment("a-3", "m-2", "third.png"),
          ],
          totalCount: 3,
          hasMore: false,
          nextCursor: null,
        },
      ],
      pageParams: [undefined],
    },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  };
});

describe("MediaGalleryDialog", () => {
  it("deletes once per unique message behind the selected media", async () => {
    renderGallery();

    expect(screen.getByText(/ready media only/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Select first.png" }));
    await user.click(screen.getByRole("button", { name: "Select second.png" }));
    await user.click(screen.getByRole("button", { name: "Select third.png" }));

    await user.click(screen.getByRole("button", { name: "Delete 3" }));

    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(state.deleteMessage).toHaveBeenCalledTimes(2));
    expect(state.deleteMessage).toHaveBeenNthCalledWith(1, "r-1", "m-1");
    expect(state.deleteMessage).toHaveBeenNthCalledWith(2, "r-1", "m-2");
  });

  it("keeps the delete action disabled until something is selected", () => {
    renderGallery();

    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
