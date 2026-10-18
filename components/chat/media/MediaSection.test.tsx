import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediaSection } from "./MediaSection";
import { AttachmentResponse } from "@/lib/types";

const state = vi.hoisted(() => ({
  media: {} as Record<string, unknown>,
}));

vi.mock("@/hooks/useAttachments", () => ({
  useRoomMedia: () => state.media,
}));

function attachment(index: number): AttachmentResponse {
  return {
    id: `a-${index}`,
    roomId: "r-1",
    messageId: `m-${index}`,
    fileName: `image-${index}.png`,
    fileType: "image/png",
    kind: "IMAGE",
    fileSizeBytes: 1024,
    status: "READY",
    malwareStatus: "SAFE",
    moderationStatus: "SFW",
    uploadedAt: new Date("2026-10-17T10:00:00Z").toISOString(),
    scannedAt: new Date("2026-10-17T10:01:00Z").toISOString(),
    url: `https://files.test/image-${index}.png`,
    urlExpiresAt: new Date("2026-10-17T10:11:00Z").toISOString(),
  };
}

function page(totalCount: number, count: number, hasMore = false, nextCursor: string | null = null) {
  return {
    data: {
      pages: [
        {
          items: Array.from({ length: count }).map((_, index) => attachment(index)),
          totalCount,
          hasMore,
          nextCursor,
        },
      ],
      pageParams: [undefined],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
}

beforeEach(() => {
  state.media = page(7, 3);
});

describe("MediaSection", () => {
  it("renders three thumbnails and an exact remaining-count tile", () => {
    render(<MediaSection roomId="r-1" onOpen={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: /Open media:/ })).toHaveLength(3);
    const remaining = screen.getByRole("button", { name: /4 more items/i });
    expect(remaining).toHaveTextContent("+4");
  });

  it("renders no count tile when the gallery has three items or fewer", () => {
    state.media = page(2, 2);
    render(<MediaSection roomId="r-1" onOpen={vi.fn()} />);

    expect(screen.getAllByRole("button", { name: /Open media:/ })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /more item/i })).toBeNull();
  });

  it("shows a busy strip while the first page loads", () => {
    state.media = { data: undefined, isLoading: true, isError: false, refetch: vi.fn() };
    render(<MediaSection roomId="r-1" onOpen={vi.fn()} />);

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("offers a retry when the gallery fails", async () => {
    const refetch = vi.fn();
    state.media = { data: undefined, isLoading: false, isError: true, refetch };
    render(<MediaSection roomId="r-1" onOpen={vi.fn()} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
