import React from "react";
import { MailPlus } from "lucide-react";
import { InvitesPanel } from "@/components/invites/InvitesPanel";
import { MainPane } from "@/components/layout/MainPane";
import { EmptyState } from "@/components/ui/EmptyState";

export default function InvitesPage() {
  return (
    <>
      <InvitesPanel />
      <MainPane hideOnNarrow>
        <EmptyState
          tone="pane"
          className="m-auto"
          icon={<MailPlus size={22} strokeWidth={1.75} />}
          title="Your invitations"
          description="Accepting an invitation opens the room and adds you to its members."
        />
      </MainPane>
    </>
  );
}
