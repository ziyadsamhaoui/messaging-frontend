import React from "react";
import { ChatsDestination } from "@/components/conversations/ChatsDestination";

/**
 * The open conversation is part of the URL, so a reload, a back button and a pasted
 * link all land on the same room. `params` is async in the App Router, which is why
 * this page awaits it before rendering the destination.
 */
export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <ChatsDestination roomId={roomId} />;
}
