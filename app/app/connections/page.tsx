import React from "react";
import { UserRoundSearch } from "lucide-react";
import { ConnectionsPanel } from "@/components/connections/ConnectionsPanel";
import { MainPane } from "@/components/layout/MainPane";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ConnectionsPage() {
  return (
    <>
      <ConnectionsPanel />
      <MainPane hideOnNarrow>
        <EmptyState
          tone="pane"
          className="m-auto"
          icon={<UserRoundSearch size={22} strokeWidth={1.75} />}
          title="Select a connection"
          description="Choose someone to see their profile and actions."
        />
      </MainPane>
    </>
  );
}
