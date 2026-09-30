"use client";

import { useCallback, useEffect, useState } from "react";
import { ConversationDTO, ConversationPageDTO } from "../lib/types";
import { getConversations } from "../lib/api";

export function useConversations(token: string | null) {
  const [items, setItems] = useState<ConversationDTO[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPage = useCallback(
    async (cursor?: number | null, replace = false) => {
      if (!token) return;
      setLoading(true);
      try {
        const page: ConversationPageDTO = await getConversations(token, cursor, 20);
        setItems((prev) => (replace ? page.items : [...prev, ...page.items]));
        setNextCursor(page.nextCursor);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(null, true);
  }, [fetchPage, token]);

  const loadMore = useCallback(() => {
    if (!loading && nextCursor) {
      return fetchPage(nextCursor);
    }
    return Promise.resolve();
  }, [fetchPage, loading, nextCursor]);

  const refresh = useCallback(() => fetchPage(null, true), [fetchPage]);

  return { items, loading, nextCursor, loadMore, refresh, setItems };
}
