import React from "react";
import { BellRing } from "lucide-react";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { MainPane } from "@/components/layout/MainPane";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotificationsPage() {
  return (
    <>
      <NotificationsPanel />
      <MainPane hideOnNarrow>
        <EmptyState
          tone="pane"
          className="m-auto"
          icon={<BellRing size={22} strokeWidth={1.75} />}
          title="One feed for everything"
          description="Messages, reactions, invitations and connection updates arrive here."
        />
      </MainPane>
    </>
  );
}
