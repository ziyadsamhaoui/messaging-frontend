import React from "react";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { MainPane } from "@/components/layout/MainPane";
import { EmptyState } from "@/components/ui/EmptyState";
import { NOTIFICATION_PREFERENCES_HREF } from "@/lib/appRoute";
import { buttonClasses } from "@/components/ui/Button";

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
          description="Messages, reactions, invitations and connection updates arrive here. Choose which of them reach you outside the app."
          action={
            <Link
              href={NOTIFICATION_PREFERENCES_HREF}
              className={buttonClasses({ variant: "secondary", size: "md", tone: "pane" })}
            >
              Notification preferences
            </Link>
          }
        />
      </MainPane>
    </>
  );
}
