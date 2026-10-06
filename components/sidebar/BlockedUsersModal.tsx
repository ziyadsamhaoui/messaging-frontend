"use client";

import React from "react";
import { Modal } from "../ui/Modal";
import { Avatar } from "../ui/Avatar";
import { Skeleton } from "../ui/Skeleton";
import { useToast } from "../ui/Toast";
import { useBlockedUserIds, useUnblockUser } from "../../hooks/useBlocks";
import { useUser } from "../../hooks/useUser";
import { errorMessage } from "../../lib/errors";

interface BlockedUsersModalProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string | null;
}

export function BlockedUsersModal({ open, onClose, currentUserId }: BlockedUsersModalProps) {
  const toast = useToast();
  const blockedQuery = useBlockedUserIds(open ? currentUserId : null);
  const unblock = useUnblockUser(currentUserId);
  const blockedIds = blockedQuery.data ?? [];

  async function handleUnblock(userId: string) {
    try {
      await unblock.mutateAsync(userId);
      toast.push("User unblocked.", "success");
    } catch (error) {
      toast.push(errorMessage(error), "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Blocked users">
      <div className="flex flex-col gap-3">
        {blockedQuery.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        )}

        {!blockedQuery.isLoading && blockedIds.length === 0 && (
          <div className="py-6 text-center text-sm text-[rgba(164,190,123,0.7)]">
            You have not blocked anyone.
          </div>
        )}

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {blockedIds.map((userId) => (
            <BlockedUserRow key={userId} userId={userId} onUnblock={handleUnblock} />
          ))}
        </div>
      </div>
    </Modal>
  );
}

function BlockedUserRow({
  userId,
  onUnblock,
}: {
  userId: string;
  onUnblock: (userId: string) => void;
}) {
  const userQuery = useUser(userId);
  const username = userQuery.data?.username ?? userId.slice(0, 8);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-[rgba(164,190,123,0.15)] px-3 py-2">
      <Avatar name={username} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-[var(--color-parchment)]">
          @{username}
        </div>
        <div className="text-xs text-[rgba(164,190,123,0.7)]">Blocked · messaging disabled</div>
      </div>
      <button
        type="button"
        onClick={() => onUnblock(userId)}
        className="rounded-xl border border-[rgba(164,190,123,0.35)] px-3 py-1 text-xs text-[var(--color-parchment)]"
      >
        Unblock
      </button>
    </div>
  );
}
