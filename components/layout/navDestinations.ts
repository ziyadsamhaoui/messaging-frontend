import { Bell, MailPlus, MessagesSquare, Users, type LucideIcon } from "lucide-react";
import { AppDestination } from "@/lib/appRoute";

/**
 * The four destinations, in one list.
 *
 * Both navigations read it — the rail on a desk and the bottom bar on a phone — so a
 * destination cannot be renamed, reordered or given a different badge in one place
 * and not the other. "Chats" is the name everywhere; the URLs still say `chats`.
 */
export interface NavDestination {
  value: AppDestination;
  label: string;
  Icon: LucideIcon;
  /** Which live count the badge shows, if any. */
  countKey?: "unread" | "requests" | "invites";
}

export const NAV_DESTINATIONS: readonly NavDestination[] = [
  { value: "chats", label: "Chats", Icon: MessagesSquare },
  { value: "connections", label: "Connections", Icon: Users, countKey: "requests" },
  { value: "invites", label: "Invites", Icon: MailPlus, countKey: "invites" },
  { value: "notifications", label: "Notifications", Icon: Bell, countKey: "unread" },
] as const;
