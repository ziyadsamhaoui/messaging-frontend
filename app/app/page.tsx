import { redirect } from "next/navigation";
import { CHATS_HREF } from "@/lib/appRoute";

/**
 * `/app` on its own is not a screen: the shell's four destinations all have their own
 * route, and the rail never points here. It still needs to resolve, because it is what
 * a person types, what a bookmark collapses to and what the parser already treats as
 * "chats" (`parseAppRoute` falls back to the conversations destination for it) — so it
 * redirects there rather than 404ing on the app's own root.
 */
export default function AppIndexPage() {
  redirect(CHATS_HREF);
}
