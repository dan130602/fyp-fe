import { useQuery } from "@tanstack/react-query";
import { ApiError } from "../lib/api-client.ts";
import { getObservability } from "./observability-api.ts";

export function useObservability(days: number) {
  return useQuery({
    queryKey: ["productionObservability", days],
    queryFn: () => getObservability(days),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 1,
  });
}
