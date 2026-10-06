"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { flattenPages } from "../../lib/pagination";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationFeed,
} from "../../hooks/useNotifications";
import { errorMessage } from "../../lib/errors";
import { useToast } from "../ui/Toast";
import { NotificationPreferencesModal } from "./NotificationPreferencesModal";

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const toast = useToast();
  const feed = useNotificationFeed(open);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const items = flattenPages(feed.data?.pages);

  async function handleMarkRead(id: string) {
    try {
      await markRead.mutateAsync(id);
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }

  async function handleMarkAll() {
    try {
      await markAll.mutateAsync();
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Notifications">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setPreferencesOpen(true)}
            className="text-xs text-[var(--color-sage)] hover:text-[var(--color-parchment)]"
          >
            Preferences
          </button>
          <button
            type="button"
            onClick={handleMarkAll}
            className="text-xs text-[var(--color-sage)] hover:text-[var(--color-parchment)]"
          >
            Mark all read
          </button>
        </div>

        {feed.isLoading && <div className="text-sm text-[rgba(164,190,123,0.7)]">Loading…</div>}

        {!feed.isLoading && items.length === 0 && (
          <div className="py-6 text-center text-sm text-[rgba(164,190,123,0.7)]">No notifications yet.</div>
        )}

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => !item.read && handleMarkRead(item.id)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                item.read
                  ? "border-[rgba(164,190,123,0.1)] text-[rgba(229,217,182,0.6)]"
                  : "border-[rgba(164,190,123,0.25)] bg-[rgba(95,141,78,0.15)] text-[var(--color-parchment)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide opacity-70">{item.type}</span>
                <span className="text-[10px] opacity-60">
                  {new Date(item.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="mt-1">{item.content}</div>
            </button>
          ))}
        </div>

        {feed.hasNextPage && (
          <button
            type="button"
            onClick={() => feed.fetchNextPage()}
            className="rounded-xl border border-[rgba(229,217,182,0.25)] px-4 py-2 text-sm text-[rgba(229,217,182,0.7)]"
          >
            Load more
          </button>
        )}
      </div>

      <NotificationPreferencesModal open={preferencesOpen} onClose={() => setPreferencesOpen(false)} />
    </Modal>
  );
}
