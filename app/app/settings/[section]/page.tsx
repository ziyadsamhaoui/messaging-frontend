import React from "react";
import { notFound } from "next/navigation";
import { SettingsView } from "@/components/settings/SettingsView";
import { parseAppRoute } from "@/lib/appRoute";

/**
 * One settings editor, addressed by its section.
 *
 * The section is validated against the same parser the shell uses, so a typo in the
 * URL is a 404 rather than an empty pane, and the panel's selected row, the pane's
 * content and the address bar all read from one list of sections.
 */
export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const parsed = parseAppRoute(`/app/settings/${section}`);
  if (!parsed.settingsSection) notFound();
  return <SettingsView section={parsed.settingsSection} />;
}
