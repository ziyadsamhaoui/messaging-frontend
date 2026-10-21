import { redirect } from "next/navigation";
import { CHATS_HREF } from "@/lib/appRoute";

export default function AppIndexPage() {
  redirect(CHATS_HREF);
}
