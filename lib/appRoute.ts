
export type AppDestination = "chats" | "connections" | "invites" | "notifications";

export type SettingsSection =
  | "profile"
  | "account"
  | "notifications"
  | "push"
  | "blocked"
  | "appearance"
  | "shortcuts"
  | "about";

export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  "profile",
  "account",
  "notifications",
  "push",
  "blocked",
  "appearance",
  "shortcuts",
  "about",
] as const;

export const APP_DESTINATIONS: readonly AppDestination[] = [
  "chats",
  "connections",
  "invites",
  "notifications",
] as const;

export interface AppRoute {
  destination: AppDestination;
  id: string | null;
  isPreferences: boolean;
  isSettings: boolean;
  settingsSection: SettingsSection | null;
}

const FALLBACK: AppRoute = {
  destination: "chats",
  id: null,
  isPreferences: false,
  isSettings: false,
  settingsSection: null,
};

function isDestination(value: string): value is AppDestination {
  return (APP_DESTINATIONS as readonly string[]).includes(value);
}

function isSettingsSection(value: string | undefined): value is SettingsSection {
  return typeof value === "string" && (SETTINGS_SECTIONS as readonly string[]).includes(value);
}

export function parseAppRoute(pathname: string | null | undefined): AppRoute {
  if (!pathname) return FALLBACK;
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "app") return FALLBACK;
  const [, first, second] = segments;

  if (first === "settings") {
    return {
      ...FALLBACK,
      isSettings: true,
      settingsSection: isSettingsSection(second) ? second : null,
    };
  }
  if (!first || !isDestination(first)) return FALLBACK;

  if (first === "notifications") {
    return {
      destination: "notifications",
      id: null,
      isPreferences: second === "preferences",
      isSettings: false,
      settingsSection: null,
    };
  }

  return {
    destination: first,
    id: second ?? null,
    isPreferences: false,
    isSettings: false,
    settingsSection: null,
  };
}

export function settingsHref(section: SettingsSection): string {
  return `${SETTINGS_HREF}/${section}`;
}

export function destinationHref(destination: AppDestination): string {
  return `/app/${destination}`;
}

export function roomHref(roomId: string): string {
  return `/app/chats/${roomId}`;
}

export function connectionHref(userId: string): string {
  return `/app/connections/${userId}`;
}

export function invitationHref(invitationId: string): string {
  return `/app/invites/${invitationId}`;
}

export const NOTIFICATION_PREFERENCES_HREF = "/app/notifications/preferences";
export const SETTINGS_HREF = "/app/settings";
export const CHATS_HREF = "/app/chats";
