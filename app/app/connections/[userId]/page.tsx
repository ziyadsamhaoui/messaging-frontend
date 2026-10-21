import React from "react";
import { ConnectionsPanel } from "@/components/connections/ConnectionsPanel";
import { ConnectionProfile } from "@/components/connections/ConnectionProfile";

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
