import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  type DashboardCallQuery,
  type DashboardFilters,
  getAdvisorCompliance,
  getChecklistCompletion,
  getComplianceOverview,
  getDashboardCalls,
  getOutstandingItems,
  getReviewStatus,
} from "./dashboard-api.ts";

const NO_FILTERS: DashboardFilters = { from: "", to: "", department: "" };

export function useComplianceOverview(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["dashboard", "complianceOverview", filters],
    queryFn: () => getComplianceOverview(filters),
  });
}

export function useReviewStatus(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["dashboard", "reviewStatus", filters],
    queryFn: () => getReviewStatus(filters),
  });
}

export function useOutstandingItems(filters: DashboardFilters = NO_FILTERS) {
  return useQuery({
    queryKey: ["dashboard", "outstandingItems", filters],
    queryFn: () => getOutstandingItems(filters),
  });
}

export function useChecklistCompletion(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["dashboard", "checklistCompletion", filters],
    queryFn: () => getChecklistCompletion(filters),
  });
}

export function useAdvisorCompliance(filters: DashboardFilters) {
  return useQuery({
    queryKey: ["dashboard", "advisorCompliance", filters],
    queryFn: () => getAdvisorCompliance(filters),
  });
}

export function useDashboardCalls(filters: DashboardFilters, calls: DashboardCallQuery) {
  return useQuery({
    queryKey: ["dashboard", "calls", filters, calls],
    queryFn: () => getDashboardCalls(filters, calls),
    placeholderData: keepPreviousData,
  });
}
