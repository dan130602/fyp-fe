import { describe, expect, it } from "vitest";
import type { MediaAssetAnalysis } from "../../playback/playback-api.ts";
import { toCallFindings } from "../call-findings.ts";

function analysis(overrides: MediaAssetAnalysis["review"] = null): MediaAssetAnalysis {
  return {
    mediaAssetId: "a1",
    fileName: "call.mp3",
    assetStatus: "COMPLETED",
    analysisStatus: "READY",
    failureReason: null,
    review: overrides,
    result: {
      segments: [{ id: "seg_1", speaker: "spk_0", start: 65, end: 70, text: "I can guarantee it" }],
      checklist: [
        { id: "q1", question: "Were risks explained?" },
        { id: "q2", question: "Was identity verified?" },
      ],
      final_results: [
        { item_id: "q1", status: "PASS", confidence: 0.9, reasoning: "Explained." },
        {
          item_id: "q2",
          status: "FAIL",
          confidence: 0.8,
          reasoning: "Not verified.",
          evidence: [{ segment_id: "seg_1", start_char: 0, end_char: 12 }],
        },
      ],
    },
  };
}

describe("toCallFindings", () => {
  it("returns nothing without a result", () => {
    expect(toCallFindings({ ...analysis(), result: null })).toEqual([]);
  });

  it("puts the most serious findings first and resolves evidence text", () => {
    const [first, second] = toCallFindings(analysis());

    expect(first?.question).toBe("Was identity verified?");
    expect(first?.evidence).toEqual([{ text: "I can guaran", timestamp: "01:05" }]);
    expect(second?.status).toBe("PASS");
    expect(second?.overriddenAiVerdict).toBeNull();
  });

  it("uses the reviewer's decision and keeps the AI verdict for reference", () => {
    const findings = toCallFindings(
      analysis({
        reviewedBy: "u1",
        reviewedAt: "2026-10-01T00:00:00Z",
        history: [],
        overrides: [
          {
            checklistItemId: "q2",
            aiVerdict: "FAIL",
            decision: "PASS",
            comment: "Verified off-call",
          },
        ],
      }),
    );

    const overridden = findings.find((finding) => finding.itemId === "q2");
    expect(overridden?.status).toBe("PASS");
    expect(overridden?.verdict).toBe("Pass");
    expect(overridden?.overriddenAiVerdict).toBe("Fail");
    expect(overridden?.reviewerComment).toBe("Verified off-call");
  });
});
