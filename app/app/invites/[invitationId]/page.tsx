import React from "react";
import { InvitesPanel } from "@/components/invites/InvitesPanel";
import { InvitationDetail } from "@/components/invites/InvitationDetail";

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
