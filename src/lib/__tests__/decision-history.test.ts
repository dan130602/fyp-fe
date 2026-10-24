import { describe, expect, it } from "vitest";
import type { ChecklistDecision, ChecklistReview } from "../../playback/playback-api.ts";
import { historyFor } from "../decision-history.ts";

const decision = (over: Partial<ChecklistDecision>): ChecklistDecision => ({
  checklistItemId: "K01",
  aiVerdict: "PASS",
  decision: "FAIL",
  comment: "No",
  decidedBy: "u1",
  decidedAt: "2026-10-24T09:30:00+08:00",
  ...over,
});

const reviewOf = (history: ChecklistDecision[]): ChecklistReview => ({
  reviewedBy: "u1",
  reviewedAt: "2026-10-24T09:30:00+08:00",
  overrides: [],
  history,
});

describe("historyFor", () => {
  it("starts the first entry from the AI verdict", () => {
    expect(historyFor(reviewOf([decision({})]), "K01")).toEqual([
      {
        from: "PASS",
        to: "FAIL",
        reverted: false,
        comment: "No",
        decidedAt: "2026-10-24T09:30:00+08:00",
      },
    ]);
  });

  it("chains each entry from the previous decision and lists newest first", () => {
    const review = reviewOf([
      decision({ decision: "FAIL", decidedAt: "t1" }),
      decision({ decision: "PARTIAL", comment: "Half", decidedAt: "t2" }),
    ]);
    const result = historyFor(review, "K01");
    expect(result.map((e) => [e.from, e.to, e.decidedAt])).toEqual([
      ["FAIL", "PARTIAL", "t2"],
      ["PASS", "FAIL", "t1"],
    ]);
  });

  it("reads a revert as going back to the AI verdict, and the next change starts from it", () => {
    const review = reviewOf([
      decision({ decision: "FAIL", decidedAt: "t1" }),
      decision({ decision: null, comment: null, decidedAt: "t2" }),
      decision({ decision: "PARTIAL", decidedAt: "t3" }),
    ]);
    const result = historyFor(review, "K01");
    expect(result[0]).toMatchObject({ from: "PASS", to: "PARTIAL", reverted: false });
    expect(result[1]).toMatchObject({ from: "FAIL", to: "PASS", reverted: true, comment: null });
  });

  it("leaves out other questions and tolerates no review", () => {
    const review = reviewOf([
      decision({ checklistItemId: "K02", aiVerdict: "FAIL", decision: "PASS" }),
      decision({}),
    ]);
    expect(historyFor(review, "K01")).toHaveLength(1);
    expect(historyFor(review, "K03")).toEqual([]);
    expect(historyFor(null, "K01")).toEqual([]);
  });
});
