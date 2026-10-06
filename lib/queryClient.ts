import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "./errors";

const NON_RETRYABLE = new Set(["unauthenticated", "forbidden", "not-found", "validation", "blocked", "invitation-expired"]);

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (isApiError(error) && NON_RETRYABLE.has(error.kind)) return false;
          return failureCount < 1;
        },
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
