"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageDTO, MessagePageDTO } from "../lib/types";
import { getMessages } from "../lib/api";

export function useMessages(token: string | null, conversationId: number | null) {
  const [items, setItems] = useState<MessageDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPage = useCallback(
    async (cursor?: number | null, replace = false) => {
      if (!token || !conversationId) return;
      setLoading(true);
      try {
        const page: MessagePageDTO = await getMessages(token, conversationId, cursor, 20);
        setItems((prev) => (replace ? page.items : [...prev, ...page.items]));
        setNextCursor(page.nextCursor);
      } finally {
        setLoading(false);
      }
    },
    [token, conversationId]
  );

  useEffect(() => {
    if (!token || !conversationId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(null, true);
  }, [fetchPage, token, conversationId]);

  const loadMore = useCallback(() => {
    if (!loading && nextCursor) {
      return fetchPage(nextCursor);
    }
    return Promise.resolve();
  }, [fetchPage, loading, nextCursor]);

  const appendMessage = useCallback((message: MessageDTO) => {
    setItems((prev) => {
      if (prev.some((item) => item.messageId === message.messageId)) return prev;
      return [message, ...prev];
    });
  }, []);

  return { items, loading, nextCursor, loadMore, appendMessage, setItems };
}
