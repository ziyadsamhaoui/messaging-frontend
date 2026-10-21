import React from "react";
import { notFound } from "next/navigation";
import { SettingsView } from "@/components/settings/SettingsView";
import { parseAppRoute } from "@/lib/appRoute";

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
