"use client";

import React from "react";
import { FileText, ImageOff, Music, Play } from "lucide-react";
import { useRoomMedia } from "@/hooks/useAttachments";
import { flattenPages } from "@/lib/pagination";
import { AttachmentResponse } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBlock } from "@/components/ui/ErrorBlock";

export function MediaThumbnail({ attachment }: { attachment: AttachmentResponse }) {
  if (attachment.kind === "IMAGE" && attachment.url) {
    return (
      <img
        src={attachment.url}
        alt={attachment.fileName}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    );
  }
  if (attachment.kind === "VIDEO") {
    return (
      <span className="flex h-full w-full items-center justify-center bg-[rgba(40,84,48,0.12)]">
        <Play size={22} strokeWidth={1.75} aria-hidden="true" />
      </span>
    );
  }
  if (attachment.kind === "AUDIO") {
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[rgba(40,84,48,0.08)] px-1 text-center">
        <Music size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className="line-clamp-2 font-ui text-[10px] leading-tight">{attachment.fileName}</span>
      </span>
    );
  }
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[rgba(40,84,48,0.08)] px-1 text-center">
      <FileText size={20} strokeWidth={1.75} aria-hidden="true" />
      <span className="line-clamp-2 font-ui text-[10px] leading-tight">{attachment.fileName}</span>
    </span>
  );
}

export function MediaSection({ roomId, onOpen }: { roomId: string; onOpen: () => void }) {
  const media = useRoomMedia(roomId, 3);
  const items = flattenPages(media.data?.pages) as AttachmentResponse[];
  const total = media.data?.pages[0]?.totalCount ?? items.length;
  const remaining = Math.max(total - 3, 0);
  const visible = items.slice(0, 3);

  return (
    <section aria-labelledby="group-info-media-heading" className="px-4 pb-4">
      <div className="flex items-baseline justify-between pb-2">
        <h3
          id="group-info-media-heading"
          className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)]"
        >
          Media
        </h3>
        {(media.data?.pages.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={onOpen}
            className="focus-ring-light rounded px-1 font-ui text-[13px] font-medium text-[var(--app-pane-text)] underline decoration-1 underline-offset-2"
          >
            View all
          </button>
        )}
      </div>

      {media.isLoading ? (
        <div className="grid grid-cols-4 gap-1.5" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : media.isError ? (
        <ErrorBlock
          title="Media could not be loaded"
          reason="The room's files are unavailable right now."
          onRetry={() => void media.refetch()}
          tone="pane"
          className="py-6"
        />
      ) : visible.length === 0 ? (
        <p className="flex items-center gap-2 py-1 font-ui text-[13px] text-[var(--app-pane-text-soft)]">
          <ImageOff size={16} strokeWidth={1.75} aria-hidden="true" />
          No media yet.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {visible.map((attachment) => (
            <button
              key={attachment.id}
              type="button"
              onClick={onOpen}
              aria-label={`Open media: ${attachment.fileName}`}
              className="focus-ring-light aspect-square overflow-hidden rounded-lg border border-[var(--app-pane-control-border)] text-[var(--app-pane-text)]"
            >
              <MediaThumbnail attachment={attachment} />
            </button>
          ))}
          {remaining > 0 && (
            <button
              type="button"
              onClick={onOpen}
              aria-label={`Open the gallery, ${remaining} more item${remaining === 1 ? "" : "s"}`}
              className="focus-ring-light flex aspect-square items-center justify-center rounded-lg border border-[var(--app-pane-control-border)] bg-[rgba(40,84,48,0.08)] font-ui text-[15px] font-semibold text-[var(--app-pane-text)] hover:bg-[var(--app-pane-hover)]"
            >
              +{remaining}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
