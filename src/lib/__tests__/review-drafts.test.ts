import { describe, expect, it } from "vitest";
import {
  buildOverrides,
  chooseDecision,
  hasBlankComment,
  seedDrafts,
  setComment,
} from "../review-drafts.ts";

const findings = [
  { checklist_id: "K01", status: "PASS" as const },
  { checklist_id: "K02", status: "FAIL" as const },
  { checklist_id: "K03", status: "PARTIAL" as const },
];

describe("seedDrafts", () => {
  it("is empty without a review", () => {
    expect(seedDrafts(null)).toEqual({});
  });

  it("restores each saved override as a draft", () => {
    const review = {
      reviewedBy: "u1",
      reviewedAt: "2026-10-24T09:30:00",
      overrides: [
        {
          checklistItemId: "K02",
          aiVerdict: "FAIL" as const,
          decision: "PASS" as const,
          comment: "ok",
        },
      ],
    };
    expect(seedDrafts(review)).toEqual({ K02: { decision: "PASS", comment: "ok" } });
  });
});

describe("chooseDecision", () => {
  it("creates a draft with an empty comment for a differing decision", () => {
    expect(chooseDecision({}, "K01", "PASS", "FAIL")).toEqual({
      K01: { decision: "FAIL", comment: "" },
    });
  });

  it("keeps the comment when switching between overrides", () => {
    const drafts = { K01: { decision: "FAIL" as const, comment: "why" } };
    expect(chooseDecision(drafts, "K01", "PASS", "CANNOT_DETERMINE").K01).toEqual({
      decision: "CANNOT_DETERMINE",
      comment: "why",
    });
  });

  it("clears the override when the AI's own verdict is picked", () => {
    const drafts = { K01: { decision: "FAIL" as const, comment: "why" } };
    expect(chooseDecision(drafts, "K01", "PASS", "PASS")).toEqual({});
  });
});

describe("setComment", () => {
  it("updates an overridden question only", () => {
    const drafts = { K01: { decision: "FAIL" as const, comment: "" } };
    expect(setComment(drafts, "K01", "x").K01.comment).toBe("x");
    expect(setComment(drafts, "K02", "x")).toBe(drafts);
  });
});

describe("buildOverrides", () => {
  it("is empty when nothing was overridden", () => {
    expect(buildOverrides(findings, {})).toEqual([]);
  });

  it("emits overrides in findings order with trimmed comments", () => {
    const drafts = {
      K03: { decision: "PASS" as const, comment: "  fine " },
      K01: { decision: "FAIL" as const, comment: "bad" },
    };
    expect(buildOverrides(findings, drafts)).toEqual([
      { checklistItemId: "K01", decision: "FAIL", comment: "bad" },
      { checklistItemId: "K03", decision: "PASS", comment: "fine" },
    ]);
  });

  it("skips drafts equal to the AI status and unknown ids", () => {
    const drafts = {
      K01: { decision: "PASS" as const, comment: "same" },
      K99: { decision: "FAIL" as const, comment: "gone" },
    };
    expect(buildOverrides(findings, drafts)).toEqual([]);
  });
});

describe("hasBlankComment", () => {
  it("flags a whitespace-only comment once trimmed", () => {
    const overrides = buildOverrides(findings, { K01: { decision: "FAIL", comment: "   " } });
    expect(hasBlankComment(overrides)).toBe(true);
    expect(hasBlankComment([])).toBe(false);
  });
});
