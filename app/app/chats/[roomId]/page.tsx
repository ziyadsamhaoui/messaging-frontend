import React from "react";
import { ChatsDestination } from "@/components/conversations/ChatsDestination";

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <ChatsDestination roomId={roomId} />;
}
