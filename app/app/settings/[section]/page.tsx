import React from "react";
import { notFound, redirect } from "next/navigation";
import { SettingsView } from "@/components/settings/SettingsView";
import { parseAppRoute, settingsHref } from "@/lib/appRoute";

const REDIRECTS: Record<string, string> = {
  account: `${settingsHref("profile")}#security`,
  appearance: settingsHref("profile"),
};

export default async function SettingsSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const target = REDIRECTS[section];
  if (target) redirect(target);
  const parsed = parseAppRoute(`/app/settings/${section}`);
  if (!parsed.settingsSection) notFound();
  return <SettingsView section={parsed.settingsSection} />;
}
