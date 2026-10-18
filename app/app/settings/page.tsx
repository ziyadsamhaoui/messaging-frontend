import React from "react";
import { SettingsView } from "@/components/settings/SettingsView";

/**
 * `/app/settings` is the index: the list of sections on the left and a short
 * explanation on the right. Each section has its own nested route, so the list is
 * never the only thing the URL says.
 */
export default function SettingsPage() {
  return <SettingsView section={null} />;
}
