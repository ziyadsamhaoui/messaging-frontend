import { Bell, MailPlus, MessagesSquare, Users, type LucideIcon } from "lucide-react";
import { AppDestination } from "@/lib/appRoute";

export interface NavDestination {
  value: AppDestination;
  label: string;
  Icon: LucideIcon;
  countKey?: "unread" | "requests" | "invites";
}

export const NAV_DESTINATIONS: readonly NavDestination[] = [
  { value: "chats", label: "Chats", Icon: MessagesSquare },
  { value: "connections", label: "Connections", Icon: Users, countKey: "requests" },
  { value: "invites", label: "Invites", Icon: MailPlus, countKey: "invites" },
  { value: "notifications", label: "Notifications", Icon: Bell, countKey: "unread" },
] as const;
