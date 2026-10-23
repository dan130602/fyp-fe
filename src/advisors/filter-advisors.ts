// Pure client-side search: the full advisor list is small, so it is fetched once and narrowed here.
import type { Advisor } from "./advisors-api.ts";

/** Case-insensitive substring match on employee ID or name. */
export function filterAdvisors(advisors: Advisor[], search: string): Advisor[] {
  const query = search.trim().toLowerCase();
  if (!query) return advisors;
  return advisors.filter(
    (advisor) =>
      advisor.employeeId.toLowerCase().includes(query) ||
      advisor.fullName.toLowerCase().includes(query),
  );
}
