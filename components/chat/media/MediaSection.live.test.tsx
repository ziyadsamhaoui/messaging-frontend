import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MediaSection } from "./MediaSection";
import { invalidateRoomMedia } from "@/hooks/useAttachments";
import { AttachmentResponse } from "@/lib/types";

const state = vi.hoisted(() => ({
  items: [] as AttachmentResponse[],
}));

vi.mock("@/lib/services/attachments", () => ({
  listRoomMedia: vi.fn(async () => ({
    items: state.items,
    nextCursor: null,
    hasMore: false,
    totalCount: state.items.length,
  })),
}));

function image(index: number): AttachmentResponse {
  return {
    id: `a-${index}`,
    roomId: "r-1",
    messageId: `m-${index}`,
    fileName: `photo-${index}.png`,
    fileType: "image/png",
    kind: "IMAGE",
    fileSizeBytes: 1024,
    status: "READY",
    malwareStatus: "SAFE",
    moderationStatus: "SFW",
    uploadedAt: "2026-10-17T10:00:00Z",
    scannedAt: "2026-10-17T10:01:00Z",
    url: `https://files.test/photo-${index}.png`,
    urlExpiresAt: "2026-10-17T10:11:00Z",
  };
}

beforeEach(() => {
  state.items = [];
});

describe("MediaSection live updates", () => {
  it("shows both images after two are sent, once the room media cache is invalidated", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MediaSection roomId="r-1" onOpen={vi.fn()} />
      </QueryClientProvider>
    );

    expect(await screen.findByText("No media yet.")).toBeInTheDocument();

    state.items = [image(1), image(2)];
    await act(async () => {
      await invalidateRoomMedia(queryClient, "r-1");
    });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Open media:/ })).toHaveLength(2);
    });
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.queryByText("No media yet.")).toBeNull();
  });
});
