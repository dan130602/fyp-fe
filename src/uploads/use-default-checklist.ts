import { useQuery } from "@tanstack/react-query";
import { getDefaultChecklist } from "./upload-api.ts";

export function useDefaultChecklist() {
  return useQuery({ queryKey: ["defaultChecklist"], queryFn: getDefaultChecklist });
}
