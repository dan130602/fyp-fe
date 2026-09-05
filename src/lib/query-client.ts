// Shared TanStack Query client. Auth failures are not worth retrying.
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api-client.ts";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && (error.isUnauthorized || error.isForbidden)) return false;
        return failureCount < 3;
      },
    },
  },
});
