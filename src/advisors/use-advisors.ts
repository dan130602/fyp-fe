import { useQuery } from "@tanstack/react-query";
import { getAdvisors } from "./advisors-api.ts";

export function useAdvisors() {
  return useQuery({ queryKey: ["advisors"], queryFn: getAdvisors });
}
