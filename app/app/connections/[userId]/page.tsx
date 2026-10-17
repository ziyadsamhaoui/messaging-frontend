import React from "react";
import { ConnectionsPanel } from "@/components/connections/ConnectionsPanel";
import { ConnectionProfile } from "@/components/connections/ConnectionProfile";

/**
 * The open profile is part of the URL, like a room: `/app/connections/<userId>`
 * survives a reload, the back button and a pasted link. `params` is async in the
 * App Router, so the page awaits it before rendering.
 */
export default async function ConnectionPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <>
      <ConnectionsPanel activeUserId={userId} hideOnNarrow />
      <ConnectionProfile userId={userId} />
    </>
  );
}
