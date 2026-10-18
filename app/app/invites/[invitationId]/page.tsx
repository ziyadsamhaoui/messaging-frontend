import React from "react";
import { InvitesPanel } from "@/components/invites/InvitesPanel";
import { InvitationDetail } from "@/components/invites/InvitationDetail";

/**
 * An open invitation is part of the URL, like a room or a profile, so the link an
 * INVITATION notification carries (`/app/invites/<invitationId>`) resolves to a
 * screen instead of a 404. `params` is async in the App Router.
 */
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ invitationId: string }>;
}) {
  const { invitationId } = await params;
  return (
    <>
      <InvitesPanel activeInvitationId={invitationId} hideOnNarrow />
      <InvitationDetail invitationId={invitationId} />
    </>
  );
}
