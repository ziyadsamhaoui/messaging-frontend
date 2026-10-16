import React from "react";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { NotificationPreferencesView } from "@/components/notifications/NotificationPreferencesView";

/**
 * Preferences are a destination of the notifications section, so the panel stays
 * visible beside them and the browser history works.
 */
export default function NotificationPreferencesPage() {
  return (
    <>
      <NotificationsPanel hideOnNarrow />
      <NotificationPreferencesView />
    </>
  );
}
