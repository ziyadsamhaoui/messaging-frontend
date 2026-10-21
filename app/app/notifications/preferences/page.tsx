import React from "react";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { NotificationPreferencesView } from "@/components/notifications/NotificationPreferencesView";

export default function NotificationPreferencesPage() {
  return (
    <>
      <NotificationsPanel hideOnNarrow />
      <NotificationPreferencesView />
    </>
  );
}
