import { apiGet } from "../lib/api-client.ts";

export interface Metric {
  numerator: number;
  denominator: number;
  percentage: number | null;
}
export interface OverrideEvent {
  id: string;
  mediaAssetId: string | null;
  checklistItemId: string;
  aiVerdict: string;
  from: string;
  to: string;
  reverted: boolean;
  decidedBy: string;
  decidedAt: string;
  priority: "high" | "normal";
}
export interface ObservabilityOverview {
  source: "production";
  generatedAt: string;
  windowDays: number;
  reference: string;
  population: string;
  counts: {
    calls: number;
    savedResults: number;
    failedResults: number;
    checks: number;
    binaryDecisions: number;
    unclear: number;
    predictionFailures: number;
    notApplicable: number;
    reviewedCalls: number;
    reviewedChecks: number;
    unreviewedChecks: number;
    staleReviewItems: number;
  };
  metrics: Record<
    | "decisionCoverage"
    | "predictionFailureRate"
    | "abstentionRate"
    | "reviewedBreachRecall"
    | "reviewedBreachPrecision"
    | "reviewAgreement"
    | "reviewedBreachDetection"
    | "reviewedFalseClearanceRate",
    Metric
  >;
  matrix: {
    agreedPass: number;
    aiPassOfficerFail: number;
    aiFailOfficerPass: number;
    agreedBreach: number;
    binaryPairs: number;
  };
  reviewedBreaches: {
    total: number;
    detected: number;
    unclear: number;
    predictionFailures: number;
    notApplicable: number;
    falseClearances: number;
  };
  cost: {
    reportedUsd: number | null;
    pricedResults: number;
    unknownResults: number;
    scope: string;
  };
  latency: {
    p50Ms: number | null;
    p95Ms: number | null;
    measuredResults: number;
    unknownResults: number;
    scope: string;
  };
  overrides: {
    activeItems: number;
    reviewedItems: number;
    rate: Metric;
    eventCount: number;
    highPriorityEvents: number;
    recent: OverrideEvent[];
  };
  stages: { stage: string; p50Ms: number | null; p95Ms: number | null; count: number }[];
  models: { model: string; inputTokens: number; outputTokens: number; cacheReadTokens: number }[];
  providerErrors: Record<string, number>;
  legacyResults: number;
}
export async function getObservability(days: number): Promise<ObservabilityOverview> {
  const data = await apiGet<ObservabilityOverview>(`/api/observability?days=${days}`);
  if (data?.source !== "production" || !data.counts || !data.matrix || !data.metrics) {
    throw new Error(
      "The backend did not return production observability records. Check the API URL and backend version.",
    );
  }
  return data;
}
