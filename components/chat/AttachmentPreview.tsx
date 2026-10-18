"use client";

import React from "react";
import { AlertCircle, Download, FileText, Loader2, RotateCw } from "lucide-react";
import { AttachmentResponse, PendingAttachmentUpload } from "@/lib/types";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PENDING_LABEL: Record<PendingAttachmentUpload["status"], string> = {
  preparing: "Preparing…",
  uploading: "Uploading…",
  scanning: "Processing…",
  failed: "Upload failed",
};

function PendingAttachmentCard({
  pending,
  onRetry,
}: {
  pending: PendingAttachmentUpload;
  onRetry?: () => void;
}) {
  const failed = pending.status === "failed";
  return (
    <div
      className={
        failed
          ? "flex max-w-full items-center gap-2 rounded-xl border border-[rgba(143,42,27,0.35)] bg-[rgba(143,42,27,0.08)] px-3 py-2"
          : "flex max-w-full items-center gap-2 rounded-xl border border-[var(--app-pane-control-border)] bg-[rgba(40,84,48,0.06)] px-3 py-2"
      }
    >
      {failed ? (
        <AlertCircle size={18} strokeWidth={1.75} className="shrink-0 text-[var(--app-danger-on-light)]" aria-hidden="true" />
      ) : (
        <Loader2 size={18} strokeWidth={1.75} className="shrink-0 animate-spin text-[var(--app-pane-text-soft)]" aria-hidden="true" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-ui text-[13px] font-medium text-[var(--app-pane-text)]">
          {pending.fileName}
        </span>
        <span role="status" className="block font-ui text-[12px] text-[var(--app-pane-text-soft)]">
          {failed ? pending.error ?? PENDING_LABEL.failed : PENDING_LABEL[pending.status]}
        </span>
      </span>
      {failed && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring-light flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-ui text-[12px] font-semibold text-[var(--app-danger-on-light)] underline"
        >
          <RotateCw size={13} strokeWidth={2} aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}

function AttachmentItem({ attachment }: { attachment: AttachmentResponse }) {
  const url = attachment.url ?? undefined;

  if (attachment.status !== "READY" || !url) {
    return (
      <div className="flex max-w-full items-center gap-2 rounded-xl border border-[var(--app-pane-control-border)] px-3 py-2">
        <FileText size={18} strokeWidth={1.75} className="shrink-0 text-[var(--app-pane-text-soft)]" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-ui text-[13px] font-medium text-[var(--app-pane-text)]">
            {attachment.fileName}
          </span>
          <span className="block font-ui text-[12px] text-[var(--app-pane-text-soft)]">
            {attachment.status === "REJECTED" ? "Unavailable" : "Preparing…"}
          </span>
        </span>
      </div>
    );
  }

  if (attachment.kind === "IMAGE") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring-light block max-w-full overflow-hidden rounded-xl"
      >
        <img
          src={url}
          alt={attachment.fileName}
          loading="lazy"
          className="max-h-72 w-full max-w-[420px] object-cover"
        />
      </a>
    );
  }

  if (attachment.kind === "VIDEO") {
    return (
      <video
        controls
        preload="metadata"
        src={url}
        aria-label={attachment.fileName}
        className="max-h-72 w-full max-w-[420px] rounded-xl"
      />
    );
  }

  if (attachment.kind === "AUDIO") {
    return (
      <div className="flex max-w-full flex-col gap-1">
        <audio controls preload="metadata" src={url} aria-label={attachment.fileName} className="max-w-full" />
        <span className="truncate font-ui text-[12px] text-[var(--app-pane-text-soft)]">
          {attachment.fileName}
        </span>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.fileName}
      className="focus-ring-light flex max-w-full items-center gap-2 rounded-xl border border-[var(--app-pane-control-border)] px-3 py-2 hover:bg-[var(--app-pane-hover)]"
    >
      <FileText size={18} strokeWidth={1.75} className="shrink-0 text-[var(--app-pane-text-soft)]" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-ui text-[13px] font-medium text-[var(--app-pane-text)]">
          {attachment.fileName}
        </span>
        <span className="block font-ui text-[12px] text-[var(--app-pane-text-soft)]">
          {formatFileSize(attachment.fileSizeBytes)}
        </span>
      </span>
      <Download size={16} strokeWidth={1.75} className="shrink-0 text-[var(--app-pane-text-soft)]" aria-hidden="true" />
    </a>
  );
}

export function AttachmentPreview({
  attachments,
  pendingUpload,
  onRetry,
}: {
  attachments: AttachmentResponse[];
  pendingUpload?: PendingAttachmentUpload;
  onRetry?: () => void;
}) {
  if (pendingUpload) {
    return <PendingAttachmentCard pending={pendingUpload} onRetry={onRetry} />;
  }
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {attachments.map((attachment) => (
        <AttachmentItem key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
}
