"use client";

import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Trash2 } from "lucide-react";
import { useRoomMedia } from "@/hooks/useAttachments";
import { messagesQueryKey } from "@/hooks/useMessages";
import { deleteMessage } from "@/lib/services/rooms";
import { flattenPages } from "@/lib/pagination";
import { AttachmentResponse } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatFileSize } from "@/components/chat/AttachmentPreview";
import { MediaThumbnail } from "./MediaSection";

const PAGE_SIZE = 30;

export function MediaGalleryDialog({
  roomId,
  initialManage = false,
  onClose,
}: {
  roomId: string;
  initialManage?: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const media = useRoomMedia(roomId, PAGE_SIZE);
  const items = useMemo(
    () => flattenPages(media.data?.pages) as AttachmentResponse[],
    [media.data]
  );
  const total = media.data?.pages[0]?.totalCount ?? items.length;
  const usedBytes = items.reduce((sum, attachment) => sum + attachment.fileSizeBytes, 0);

  const [selecting, setSelecting] = useState(initialManage);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function stopSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function deleteSelected() {
    const messageIds = Array.from(
      new Set(
        items
          .filter((attachment) => selected.has(attachment.id))
          .map((attachment) => attachment.messageId)
          .filter((messageId): messageId is string => Boolean(messageId))
      )
    );

    setDeleting(true);
    let failures = 0;
    for (const messageId of messageIds) {
      try {
        await deleteMessage(roomId, messageId);
      } catch {
        failures += 1;
      }
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["room-media", roomId] }),
      queryClient.invalidateQueries({ queryKey: messagesQueryKey(roomId) }),
      queryClient.invalidateQueries({ queryKey: ["attachments", roomId] }),
    ]);

    setDeleting(false);
    setConfirmingDelete(false);
    setSelected(new Set());
    setSelecting(false);

    if (failures > 0) {
      toast.push(
        `${failures} ${failures === 1 ? "message" : "messages"} could not be deleted.`,
        "error"
      );
    } else {
      toast.push("Selected media deleted.", "success");
    }
  }

  return (
    <>
      <Modal open onClose={onClose} title="Media" className="max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-ui text-[13px] text-[var(--app-panel-text-soft)]">
              {total} ready {total === 1 ? "item" : "items"} · {formatFileSize(usedBytes)} loaded in this
              room
            </p>
            <p className="font-ui text-[11px] text-[var(--app-panel-text-soft)]">
              Ready media only; pending uploads and quarantined files are not counted.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selecting ? (
              <>
                <Button variant="ghost" size="sm" tone="dark" onClick={stopSelecting}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  tone="dark"
                  disabled={selected.size === 0 || deleting}
                  onClick={() => setConfirmingDelete(true)}
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                  Delete {selected.size > 0 ? selected.size : ""}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                tone="dark"
                disabled={items.length === 0}
                onClick={() => setSelecting(true)}
              >
                Select
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          {media.isLoading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="aspect-square rounded-lg" />
              ))}
            </div>
          ) : media.isError ? (
            <ErrorBlock
              title="Media could not be loaded"
              reason="The gallery is unavailable right now."
              onRetry={() => void media.refetch()}
              className="py-8"
            />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Trash2 size={20} strokeWidth={1.75} aria-hidden="true" />}
              title="No media in this room"
              description="Photos, videos, audio and files appear here once they are ready."
            />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {items.map((attachment) => {
                  const isSelected = selected.has(attachment.id);
                  return (
                    <button
                      key={attachment.id}
                      type="button"
                      aria-pressed={selecting ? isSelected : undefined}
                      aria-label={
                        selecting
                          ? `${isSelected ? "Deselect" : "Select"} ${attachment.fileName}`
                          : `Open ${attachment.fileName}`
                      }
                      onClick={() => {
                        if (selecting) {
                          toggle(attachment.id);
                        } else if (attachment.url) {
                          window.open(attachment.url, "_blank", "noopener,noreferrer");
                        }
                      }}
                      className={
                        isSelected
                          ? "focus-ring relative aspect-square overflow-hidden rounded-lg border-2 border-[var(--color-fern)] text-[var(--app-panel-text)]"
                          : "focus-ring relative aspect-square overflow-hidden rounded-lg border border-[rgba(164,190,123,0.25)] text-[var(--app-panel-text)]"
                      }
                    >
                      <MediaThumbnail attachment={attachment} />
                      {selecting && (
                        <span
                          aria-hidden="true"
                          className={
                            isSelected
                              ? "absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-parchment)]"
                              : "absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-[rgba(229,217,182,0.7)] bg-[rgba(12,28,16,0.55)]"
                          }
                        >
                          {isSelected && <Check size={13} strokeWidth={2.5} />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {media.hasNextPage && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    tone="dark"
                    disabled={media.isFetchingNextPage}
                    onClick={() => void media.fetchNextPage()}
                  >
                    {media.isFetchingNextPage ? "Loading…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete selected media?"
        description="Each selected item is deleted through its message, using the sender-or-room-owner rule Chat already enforces."
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={() => void deleteSelected()}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
