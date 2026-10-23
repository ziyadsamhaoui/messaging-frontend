"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/lib/services/users";
import { ArrowLeft, Ban, Images, UserRound, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { MediaGalleryDialog } from "@/components/chat/media/MediaGalleryDialog";
import { MediaSection } from "@/components/chat/media/MediaSection";
import { connectionHref } from "@/lib/appRoute";
import { cn } from "@/lib/utils";
import { OnlineStatus, RoomResponse } from "@/lib/types";

export const DIRECT_INFO_PANEL_ID = "direct-info-panel";

interface DirectInfoPanelProps {
  room: RoomResponse;
  peerUserId: string;
  peerName: string;
  peerPictureUrl?: string | null;
  peerPresence?: OnlineStatus | null;
  peerLoading: boolean;
  isBlocked: boolean;
  onToggleBlock: () => void;
  onClose: () => void;
}

export function DirectInfoPanel({
  room,
  peerUserId,
  peerName,
  peerPictureUrl,
  peerPresence,
  peerLoading,
  isBlocked,
  onToggleBlock,
  onClose,
}: DirectInfoPanelProps) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryManage, setGalleryManage] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const profile = useQuery({
    queryKey: ["user", peerUserId],
    queryFn: () => getUser(peerUserId),
    enabled: Boolean(peerUserId),
    staleTime: 60_000,
  });
  const username = profile.data?.username;
  const bio = profile.data?.description?.trim() ?? "";

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 hidden bg-[rgba(12,28,16,0.82)] md:block xl:hidden"
      />

      <aside
        id={DIRECT_INFO_PANEL_ID}
        role="complementary"
        aria-label={`Contact info for ${peerName}`}
        className={cn(
          "group-info-panel fixed inset-0 z-50 flex h-[100dvh] w-full flex-col bg-[var(--app-pane)]",
          "pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]",
          "md:inset-y-0 md:left-auto md:right-0 md:h-full md:w-[420px] md:max-w-[92vw] md:border-l md:border-[var(--app-pane-divider)] md:pb-0 md:pt-0",
          "xl:relative xl:z-auto xl:h-full xl:w-[360px] xl:max-w-none xl:border-l"
        )}
      >
        <div className="app-scroll-light relative min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain">
          <div className="relative">
            <div className="absolute left-2 top-3 z-10">
              <IconButton
                surface="pane"
                size="sm"
                touch
                label="Back to conversation"
                tooltipSide="bottom-start"
                onClick={onClose}
                className="md:hidden"
              >
                <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
            </div>
            <div className="absolute right-2 top-3 z-10 hidden md:block">
              <IconButton
                surface="pane"
                size="sm"
                touch
                label="Close contact info"
                tooltipSide="bottom-end"
                onClick={onClose}
              >
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
            </div>

            {peerLoading ? (
              <div className="flex flex-col items-center gap-3 px-4 pb-5 pt-6" aria-busy="true">
                <Skeleton className="h-[120px] w-[120px] rounded-full" />
                <Skeleton className="h-6 w-40 rounded-lg" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 pb-5 pt-6 text-center">
                <Avatar
                  name={peerName}
                  seed={peerUserId}
                  src={peerPictureUrl ?? undefined}
                  size={120}
                  status={peerPresence ?? undefined}
                  presenceRing="var(--app-pane)"
                />
                <div className="min-w-0 max-w-full">
                  <h2 className="truncate font-ui text-[22px] font-semibold text-[var(--app-pane-text)]">
                    {peerName}
                  </h2>
                  {username && (
                    <p className="font-ui text-[14px] text-[var(--app-pane-text-soft)]">@{username}</p>
                  )}
                </div>
                {bio && (
                  <section aria-label="About" className="w-full pt-2 text-left">
                    <h3 className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)]">About</h3>
                    <p
                      className={cn(
                        "whitespace-pre-line break-words font-ui text-[14px] text-[var(--app-pane-text)]",
                        !bioExpanded && "line-clamp-2"
                      )}
                    >
                      {bio}
                    </p>
                    {bio.length > 120 && (
                      <button
                        type="button"
                        onClick={() => setBioExpanded((value) => !value)}
                        aria-expanded={bioExpanded}
                        className="focus-ring-light rounded px-1 font-ui text-[13px] font-medium text-[var(--app-pane-text)] underline underline-offset-2"
                      >
                        {bioExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>

          <MediaSection
            roomId={room.id}
            onOpen={() => {
              setGalleryManage(false);
              setGalleryOpen(true);
            }}
          />

          <div className="mx-4 h-px bg-[var(--app-pane-divider)]" aria-hidden="true" />

          <section aria-label="Actions" className="pb-2">
            <div className="px-4 pb-1 pt-4">
              <h3 className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)]">
                Actions
              </h3>
            </div>
            <div className="px-2">
              <button
                type="button"
                onClick={() => {
                  setGalleryManage(true);
                  setGalleryOpen(true);
                }}
                className="focus-ring-light flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] px-2 text-left font-ui text-[15px] font-medium text-[var(--app-pane-text)] transition-colors duration-150 motion-reduce:transition-none hover:bg-[var(--app-pane-hover)]"
              >
                <Images size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--app-pane-text-soft)]" />
                <span className="min-w-0 flex-1">Manage media</span>
              </button>
              <Link
                href={connectionHref(peerUserId)}
                className="focus-ring-light flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] px-2 text-left font-ui text-[15px] font-medium text-[var(--app-pane-text)] transition-colors duration-150 motion-reduce:transition-none hover:bg-[var(--app-pane-hover)]"
              >
                <UserRound size={20} strokeWidth={1.75} aria-hidden="true" className="text-[var(--app-pane-text-soft)]" />
                <span className="min-w-0 flex-1">View profile</span>
              </Link>
              <button
                type="button"
                onClick={onToggleBlock}
                className={cn(
                  "focus-ring-light flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-control)] px-2 text-left font-ui text-[15px] font-medium transition-colors duration-150 motion-reduce:transition-none",
                  isBlocked
                    ? "text-[var(--app-pane-text)] hover:bg-[var(--app-pane-hover)]"
                    : "text-[var(--app-danger-on-light)] hover:bg-[rgba(143,42,27,0.1)]"
                )}
              >
                <Ban size={20} strokeWidth={1.75} aria-hidden="true" />
                <span className="min-w-0 flex-1">{isBlocked ? "Unblock" : "Block"}</span>
              </button>
            </div>
          </section>
        </div>

        {galleryOpen && (
          <MediaGalleryDialog
            roomId={room.id}
            initialManage={galleryManage}
            onClose={() => {
              setGalleryOpen(false);
              setGalleryManage(false);
            }}
          />
        )}
      </aside>
    </>
  );
}
