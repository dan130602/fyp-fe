import type { Advisor } from "../advisors/advisors-api.ts";
import type { PipelineStatus } from "../data/pipeline-output.ts";
import { apiGet } from "../lib/api-client.ts";

export type CallOutcome = "COMPLIANT" | "VIOLATION" | "INCONCLUSIVE";
export type ReviewStage = "PROCESSING" | "AWAITING_REVIEW" | "REVIEWED" | "FAILED";

/** Dates are inclusive, as YYYY-MM-DD. An empty value leaves that side of the filter open. */
export interface DashboardFilters {
  from: string;
  to: string;
  department: string;
}

/** Reviewed calls only; the three counts add up to `reviewedCalls`. */
export interface ComplianceOverview {
  reviewedCalls: number;
  compliantCalls: number;
  violationCalls: number;
  inconclusiveCalls: number;
  compliancePct: number;
  violationPct: number;
  inconclusivePct: number;
}

export interface ReviewStatus {
  totalCalls: number;
  processing: number;
  awaitingReview: number;
  reviewed: number;
  failed: number;
  reviewCoveragePct: number;
}

/** `proposedActionsByOwner` counts what the AI proposed; completion is not recorded anywhere. */
export interface OutstandingItems {
  awaitingReview: number;
  oldestAwaitingReviewAt: string | null;
  overdueReviews: number;
  overdueAfterDays: number;
  unreviewedEscalations: number;
  unreviewedHolds: number;
  reviewedWithUndeterminedItems: number;
  proposedActionsByOwner: Record<string, number>;
}

export interface ChecklistCompletion {
  determinedItems: number;
  applicableItems: number;
  completionPct: number;
}

export interface AdvisorCompliance {
  advisorId: string;
  employeeId: string;
  fullName: string;
  department: string;
  status: "ACTIVE" | "INACTIVE";
  totalCalls: number;
  reviewedCalls: number;
  compliantCalls: number;
  violationCalls: number;
  inconclusiveCalls: number;
  redFlagCalls: number;
  compliancePct: number;
  violationPct: number;
  inconclusivePct: number;
  reviewCoveragePct: number;
}

export interface AdvisorComplianceList {
  from: string | null;
  to: string | null;
  advisors: AdvisorCompliance[];
}

export interface DashboardCall {
  mediaAssetId: string;
  fileName: string | null;
  createdAt: string;
  /** Null for recordings uploaded before advisor selection existed. */
  advisor: Advisor | null;
  reviewStage: ReviewStage;
  /** Null until the call is reviewed. */
  outcome: CallOutcome | null;
  violatedItems: { itemId: string; question: string; verdict: PipelineStatus }[];
  redFlags: number;
}

export interface DashboardCallList {
  calls: DashboardCall[];
  page: number;
  size: number;
  totalCalls: number;
}

export interface DashboardCallQuery {
  advisorId: string | null;
  outcome: CallOutcome | null;
  page: number;
}

function query(params: Record<string, string | number | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function getComplianceOverview(filters: DashboardFilters): Promise<ComplianceOverview> {
  return apiGet(`/api/dashboard/compliance-overview${query({ ...filters })}`);
}

export function getReviewStatus(filters: DashboardFilters): Promise<ReviewStatus> {
  return apiGet(`/api/dashboard/review-status${query({ ...filters })}`);
}

export function getOutstandingItems(filters: DashboardFilters): Promise<OutstandingItems> {
  return apiGet(`/api/dashboard/outstanding-items${query({ ...filters })}`);
}

export function getChecklistCompletion(filters: DashboardFilters): Promise<ChecklistCompletion> {
  return apiGet(`/api/dashboard/checklist-completion${query({ ...filters })}`);
}

export function getAdvisorCompliance(filters: DashboardFilters): Promise<AdvisorComplianceList> {
  return apiGet(`/api/dashboard/advisor-compliance${query({ ...filters })}`);
}

export function getDashboardCalls(
  filters: DashboardFilters,
  calls: DashboardCallQuery,
): Promise<DashboardCallList> {
  return apiGet(`/api/dashboard/calls${query({ ...filters, ...calls })}`);
}
