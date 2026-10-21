"use client";

import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useUser } from "@/hooks/useUser";
import { groupInfoHeadingId, groupInfoSectionId } from "@/lib/groupInfo";
import { PendingInvitationDto } from "@/lib/types";

export function InvitationsSection({ invitations }: { invitations: PendingInvitationDto[] }) {
  return (
    <section
      id={groupInfoSectionId("invitations")}
      aria-labelledby={groupInfoHeadingId("invitations")}
      className="scroll-mt-[60px]"
    >
      <div className="px-4 pb-1 pt-4">
        <h3
          id={groupInfoHeadingId("invitations")}
          tabIndex={-1}
          className="font-ui text-[13px] font-semibold text-[var(--app-pane-text-soft)] focus:outline-none"
        >
          Invitations ({invitations.length})
        </h3>
      </div>
      <ul className="flex flex-col">
        {invitations.map((invitation) => (
          <InvitationRow key={invitation.id} userId={invitation.invitedId} />
        ))}
      </ul>
    </section>
  );
}

function InvitationRow({ userId }: { userId: string }) {
  const userQuery = useUser(userId);
  const username = userQuery.data?.username ?? userId.slice(0, 8);

  return (
    <li className="flex min-h-14 items-center gap-3 px-4">
      <Avatar
        name={username}
        seed={userId}
        src={userQuery.data?.profilePictureUrl}
        size={40}
        presenceRing="var(--app-pane)"
      />
      <span className="min-w-0 flex-1 truncate font-ui text-[15px] font-medium text-[var(--app-pane-text)]">
        {username}
      </span>
      <span className="shrink-0 rounded-full border border-[var(--app-pane-control-border)] px-2 py-0.5 font-ui text-[11px] font-medium text-[var(--app-pane-text-soft)]">
        Invited
      </span>
    </li>
  );
}
