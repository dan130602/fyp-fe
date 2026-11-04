/** Artificial UI fixtures only. Never imported by the production data hook. */
import type { Metric, ObservabilityOverview } from "../observability-api.ts";

const metric = (numerator: number, denominator: number): Metric => ({
  numerator,
  denominator,
  percentage: denominator ? (numerator / denominator) * 100 : null,
});
export function exampleOverview(): ObservabilityOverview {
  return {
    source: "production",
    generatedAt: "2026-10-31T02:00:00Z",
    windowDays: 7,
    reference:
      "Finalized officer reviews of the same AI result version; not independent ground truth",
    population: "Latest analysis per checklist; all Stage 2 items",
    counts: {
      calls: 175,
      savedResults: 176,
      failedResults: 0,
      checks: 2100,
      binaryDecisions: 2099,
      unclear: 1,
      predictionFailures: 0,
      notApplicable: 0,
      reviewedCalls: 175,
      reviewedChecks: 2100,
      unreviewedChecks: 0,
      staleReviewItems: 0,
    },
    metrics: {
      decisionCoverage: metric(2099, 2100),
      predictionFailureRate: metric(0, 2100),
      abstentionRate: metric(1, 2100),
      reviewedBreachRecall: metric(389, 390),
      reviewedBreachPrecision: metric(389, 391),
      reviewAgreement: metric(2096, 2099),
      reviewedBreachDetection: metric(389, 391),
      reviewedFalseClearanceRate: metric(1, 391),
    },
    matrix: {
      agreedPass: 1707,
      aiPassOfficerFail: 1,
      aiFailOfficerPass: 2,
      agreedBreach: 389,
      binaryPairs: 2099,
    },
    reviewedBreaches: {
      total: 391,
      detected: 389,
      unclear: 1,
      predictionFailures: 0,
      notApplicable: 0,
      falseClearances: 1,
    },
    cost: {
      reportedUsd: 7.42,
      pricedResults: 176,
      unknownResults: 0,
      scope: "Reported chat usage only; excludes transcription and hosting",
    },
    latency: {
      p50Ms: 18450,
      p95Ms: 32750,
      measuredResults: 176,
      unknownResults: 0,
      scope: "AI request wall time, excluding transcription",
    },
    overrides: {
      activeItems: 4,
      reviewedItems: 2100,
      rate: metric(4, 2100),
      eventCount: 4,
      highPriorityEvents: 1,
      recent: [
        {
          id: "ed812f96-ea21-44d8-b652-c24ac6013be0",
          mediaAssetId: null,
          checklistItemId: "C07",
          aiVerdict: "PASS",
          from: "PASS",
          to: "FAIL",
          reverted: false,
          decidedBy: "synthetic-reviewer",
          decidedAt: "2026-10-31T01:45:00Z",
          priority: "high",
        },
        {
          id: "5c2ac504-d061-4bc0-a833-00c8c1d256ce",
          mediaAssetId: null,
          checklistItemId: "C04",
          aiVerdict: "FAIL",
          from: "FAIL",
          to: "PASS",
          reverted: false,
          decidedBy: "synthetic-reviewer",
          decidedAt: "2026-10-31T01:20:00Z",
          priority: "normal",
        },
        {
          id: "ec6a31f0-6ff3-440c-80b9-82a01de95a17",
          mediaAssetId: null,
          checklistItemId: "C10",
          aiVerdict: "CANNOT_DETERMINE",
          from: "CANNOT_DETERMINE",
          to: "FAIL",
          reverted: false,
          decidedBy: "synthetic-reviewer",
          decidedAt: "2026-10-31T00:55:00Z",
          priority: "normal",
        },
      ],
    },
    stages: [
      { stage: "call_intent", p50Ms: 1200, p95Ms: 1800, count: 176 },
      { stage: "check_batch", p50Ms: 13200, p95Ms: 24000, count: 176 },
      { stage: "verify", p50Ms: 3200, p95Ms: 5500, count: 176 },
    ],
    models: [
      {
        model: "gemini-3.6-flash",
        inputTokens: 1820000,
        outputTokens: 520000,
        cacheReadTokens: 850000,
      },
    ],
    providerErrors: {},
    legacyResults: 0,
  };
}
export function emptyOverview(): ObservabilityOverview {
  const result = exampleOverview();
  result.counts = {
    calls: 0,
    savedResults: 0,
    failedResults: 0,
    checks: 0,
    binaryDecisions: 0,
    unclear: 0,
    predictionFailures: 0,
    notApplicable: 0,
    reviewedCalls: 0,
    reviewedChecks: 0,
    unreviewedChecks: 0,
    staleReviewItems: 0,
  };
  for (const key of Object.keys(result.metrics) as (keyof typeof result.metrics)[])
    result.metrics[key] = metric(0, 0);
  result.matrix = {
    agreedPass: 0,
    aiPassOfficerFail: 0,
    aiFailOfficerPass: 0,
    agreedBreach: 0,
    binaryPairs: 0,
  };
  result.reviewedBreaches = {
    total: 0,
    detected: 0,
    unclear: 0,
    predictionFailures: 0,
    notApplicable: 0,
    falseClearances: 0,
  };
  result.cost = { ...result.cost, reportedUsd: null, pricedResults: 0, unknownResults: 0 };
  result.latency = { ...result.latency, p50Ms: null, p95Ms: null, measuredResults: 0 };
  result.overrides = {
    activeItems: 0,
    reviewedItems: 0,
    rate: metric(0, 0),
    eventCount: 0,
    highPriorityEvents: 0,
    recent: [],
  };
  result.stages = [];
  result.models = [];
  return result;
}
