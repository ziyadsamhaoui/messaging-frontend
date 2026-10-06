"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { searchUsers } from "@/lib/services/users";

export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

export function useUserSearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), 250);

  return useQuery({
    queryKey: ["user-search", debounced],
    enabled: debounced.length >= 2,
    queryFn: () => searchUsers(debounced, 20),
    staleTime: 10_000,
  });
}
