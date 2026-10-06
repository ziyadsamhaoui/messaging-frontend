"use client";

import { useQuery } from "@tanstack/react-query";
import { getUser } from "@/lib/services/users";

export function useUser(id: string | null | undefined) {
  return useQuery({
    queryKey: ["user", id ?? "none"],
    enabled: Boolean(id),
    queryFn: () => getUser(id as string),
    staleTime: 60_000,
  });
}
