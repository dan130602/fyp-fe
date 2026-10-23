import { apiGet } from "../lib/api-client.ts";

/** Mirrors the backend's AdvisorResponse record. */
export interface Advisor {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  department: string;
}

/** Active advisors only, sorted by name. */
export function getAdvisors(): Promise<Advisor[]> {
  return apiGet<Advisor[]>("/api/advisors");
}
