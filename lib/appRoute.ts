/**
 * The authenticated app is a set of real routes, so the active destination, the
 * open conversation and the open detail are all in the URL: a reload, a back
 * button and a pasted link all land where the user expects, which none of them did
 * while the destination lived only in component state.
 *
 *   /app/chats                    conversations panel, no conversation open
 *   /app/chats/<roomId>           conversations panel + that conversation
 *   /app/connections              connections panel
 *   /app/connections/<userId>     connections panel + that profile
 *   /app/invites                  invitations panel
 *   /app/invites/<invitationId>   invitations panel + that invitation
 *   /app/notifications            notifications panel
 *   /app/notifications/preferences notification preferences
 *   /app/settings                 profile settings
 *
 * Parsing is a plain split rather than `useParams` so the shell (which lives in the
 * layout, above every page) can derive the same route without a second source of
 * truth and without a synchronising effect.
 */

export type AppDestination = "chats" | "connections" | "invites" | "notifications";

export const APP_DESTINATIONS: readonly AppDestination[] = [
  "chats",
  "connections",
  "invites",
  "notifications",
] as const;

export interface AppRoute {
  destination: AppDestination;
  /** The open room, profile or invitation id for the active destination. */
  id: string | null;
  /** True on `/app/notifications/preferences`. */
  isPreferences: boolean;
  /** True on `/app/settings`. */
  isSettings: boolean;
}

const FALLBACK: AppRoute = {
  destination: "chats",
  id: null,
  isPreferences: false,
  isSettings: false,
};

function isDestination(value: string): value is AppDestination {
  return (APP_DESTINATIONS as readonly string[]).includes(value);
}

export function parseAppRoute(pathname: string | null | undefined): AppRoute {
  if (!pathname) return FALLBACK;
  const segments = pathname.split("/").filter(Boolean);
  // segments[0] is the "app" mount point; anything else is not an app route.
  if (segments[0] !== "app") return FALLBACK;
  const [, first, second] = segments;

  if (first === "settings") return { ...FALLBACK, isSettings: true };
  if (!first || !isDestination(first)) return FALLBACK;

  if (first === "notifications") {
    return { destination: "notifications", id: null, isPreferences: second === "preferences", isSettings: false };
  }

  return { destination: first, id: second ?? null, isPreferences: false, isSettings: false };
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
