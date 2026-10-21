"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Info, MailPlus, MessageSquareText, Smile } from "lucide-react";
import {
  SegmentedControl,
  segmentedPanelId,
  segmentedTabId,
} from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBlock } from "@/components/ui/ErrorBlock";
import { SectionPanel } from "@/components/layout/SectionPanel";
import { useToast } from "@/components/ui/Toast";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationFeed,
} from "@/hooks/useNotifications";
import { errorMessage } from "@/lib/errors";
import { formatDayLabel, formatRelative } from "@/lib/time";
import { flattenPages } from "@/lib/pagination";
import { invitationHref } from "@/lib/appRoute";
import { cn } from "@/lib/utils";
import { NotificationResponse, NotificationType } from "@/lib/types";

type Segment = "all" | "unread";

const SEGMENTS_ID = "notifications-segments";

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  MESSAGE: MessageSquareText,
  REACTION: Smile,
  INVITATION: MailPlus,
  SYSTEM: Info,
};

export function NotificationsPanel({ hideOnNarrow }: { hideOnNarrow?: boolean }) {
  const toast = useToast();
  const [segment, setSegment] = useState<Segment>("unread");
  const feed = useNotificationFeed(true);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = useMemo(() => flattenPages(feed.data?.pages) as NotificationResponse[], [feed.data]);
  const unreadCount = items.filter((item) => !item.read).length;
  const visible = segment === "unread" ? items.filter((item) => !item.read) : items;

  const groups = useMemo(() => {
    const byDay = new Map<string, NotificationResponse[]>();
    for (const item of visible) {
      const label = formatDayLabel(item.createdAt);
      const bucket = byDay.get(label);
      if (bucket) {
        bucket.push(item);
      } else {
        byDay.set(label, [item]);
      }
    }
    return Array.from(byDay.entries());
  }, [visible]);

  return (
    <SectionPanel
      title="Notifications"
      hideOnNarrow={hideOnNarrow}
      actions={
        <button
          type="button"
          onClick={async () => {
            try {
              await markAll.mutateAsync();
            } catch (error) {
              toast.push(errorMessage(error), "error");
            }
          }}
          disabled={unreadCount === 0 || markAll.isPending}
          className="focus-ring h-9 rounded-[var(--radius-control)] px-2.5 font-ui text-[13px] font-medium text-[var(--app-panel-text-soft)] hover:bg-[var(--app-panel-hover)] hover:text-[var(--app-panel-text)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Mark all read
        </button>
      }
      toolbar={
        <SegmentedControl
          idBase={SEGMENTS_ID}
          label="Notification filters"
          options={[
            { value: "all" as const, label: "All" },
            { value: "unread" as const, label: "Unread", count: unreadCount },
          ]}
          value={segment}
          onChange={setSegment}
        />
      }
    >
      <div
        role="tabpanel"
        id={segmentedPanelId(SEGMENTS_ID)}
        aria-labelledby={segmentedTabId(SEGMENTS_ID, segment)}
        tabIndex={-1}
        className="focus-ring rounded-xl"
      >
        {feed.isLoading && items.length === 0 ? (
          <div className="flex flex-col gap-1 px-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : feed.isError ? (
          <ErrorBlock
            title="Couldn't load notifications"
            reason="The notification feed did not come back from the server."
            onRetry={() => void feed.refetch()}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Bell size={22} strokeWidth={1.75} />}
            title={segment === "unread" ? "No unread notifications" : "You're all caught up"}
            description="New messages, reactions and invitations will show up here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map(([label, group]) => (
              <section key={label} className="flex flex-col gap-0.5">
                <h2 className="sticky top-0 z-10 bg-[var(--app-panel)] px-2 py-1.5 font-ui text-[13px] font-semibold text-[var(--app-panel-text-soft)]">
                  {label}
                </h2>
                <ul className="flex flex-col gap-0.5 px-1">
                  {group.map((item) => (
                    <li key={item.id}>
                      <NotificationRow
                        item={item}
                        onRead={() => void markRead.mutateAsync(item.id).catch(() => undefined)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {feed.hasNextPage && (
              <button
                type="button"
                onClick={() => void feed.fetchNextPage()}
                className="focus-ring mx-2 h-9 rounded-[var(--radius-control)] border border-[var(--app-panel-field-border)] font-ui text-[13px] text-[var(--app-panel-text)]"
              >
                {feed.isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </SectionPanel>
  );
}

function NotificationRow({ item, onRead }: { item: NotificationResponse; onRead: () => void }) {
  const Icon = TYPE_ICONS[item.type] ?? Bell;
  const href = item.type === "INVITATION" && item.sourceId ? invitationHref(item.sourceId) : null;

  const body = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          item.read
            ? "bg-[rgba(164,190,123,0.1)] text-[var(--app-panel-text-soft)]"
            : "bg-[rgba(164,190,123,0.2)] text-[var(--app-panel-text)]"
        )}
      >
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block font-ui text-[15px] leading-snug",
            item.read
              ? "text-[var(--app-panel-text-soft)]"
              : "font-medium text-[var(--app-panel-text)]"
          )}
        >
          {item.content}
        </span>
        <span className="mt-0.5 block font-ui text-xs text-[var(--app-panel-text-soft)]">
          {formatRelative(item.createdAt)}
        </span>
      </span>
    </>
  );

  const className =
    "focus-ring relative flex w-full items-start gap-3 rounded-[var(--radius-control)] px-2 py-2 text-left hover:bg-[var(--app-panel-hover)]";

  const marker = !item.read ? (
    <span
      aria-hidden="true"
      className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--color-sage)]"
    />
  ) : null;

  if (href) {
    return (
      <Link href={href} className={className} onClick={() => !item.read && onRead()}>
        {marker}
        {body}
      </Link>
    );
  }

  if (!item.read) {
    return (
      <button type="button" className={className} onClick={onRead}>
        {marker}
        {body}
      </button>
    );
  }

  return (
    <div className={className}>
      {marker}
      {body}
    </div>
  );
}
