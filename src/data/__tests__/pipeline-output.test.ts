import { describe, expect, it } from "vitest";
import type { PipelineOutput } from "../pipeline-output.ts";
import { toAnalysisView } from "../pipeline-output.ts";

const output: PipelineOutput = {
  call_id: "call-1",
  segments: [
    {
      id: "seg_0001",
      speaker: "SPEAKER_0",
      role: "Agent",
      start: 0,
      end: 4.2,
      text: "Hello, this call is recorded.",
    },
    {
      id: "seg_0002",
      speaker: "SPEAKER_1",
      role: null,
      start: 4.5,
      end: 8,
      text: "Okay, go ahead.",
    },
  ],
  checklist: [
    { id: "notice", name: "Recording notice", question: "Was the recording notice given?" },
    { id: "named", name: "Named item" },
    { id: "bare" },
  ],
  final_results: [
    {
      item_id: "notice",
      status: "PASS",
      confidence: 0.916,
      reasoning: "Agent said so.",
      evidence: [
        { segment_id: "seg_0001", start_char: 7, end_char: 23 },
        { segment_id: "seg_0002", start_char: 6, end_char: 15 },
        { segment_id: "seg_9999", start_char: 0, end_char: 3 },
        { segment_id: "seg_0001", start_char: 5, end_char: 500 },
      ],
    },
    { item_id: "named", status: "PARTIAL", confidence: 0.5 },
    { item_id: "bare", status: "CANNOT_DETERMINE", confidence: 0.1 },
    { item_id: "na", status: "NOT_APPLICABLE", confidence: 1 },
    { item_id: "bad", status: "FAIL", confidence: 0.8 },
  ],
  summary: {
    total: 5,
    counts: { PASS: 1, FAIL: 1, PARTIAL: 1, CANNOT_DETERMINE: 1, NOT_APPLICABLE: 1 },
    needs_review: true,
  },
};

describe("toAnalysisView", () => {
  const view = toAnalysisView(output, "call.mp3");

  it("joins segments as role-or-speaker prefixed lines", () => {
    expect(view.transcript).toBe(
      "Agent: Hello, this call is recorded.\nSPEAKER_1: Okay, go ahead.",
    );
  });

  it("maps evidence offsets so the transcript slice equals the segment slice", () => {
    const spans = view.findings[0].spans;
    expect(spans).toHaveLength(2);
    expect(view.transcript.slice(spans[0].start, spans[0].end)).toBe("this call is rec");
    expect(spans[0].text).toBe("this call is rec");
    expect(view.transcript.slice(spans[1].start, spans[1].end)).toBe("go ahead.");
    expect(spans[1].timestamp).toEqual({ start: 4.5, end: 8 });
  });

  it("drops refs with an unknown segment or out-of-range offsets", () => {
    expect(view.findings[0].spans.map((s) => s.chunk_id)).toEqual(["seg_0001", "seg_0002"]);
    expect(view.spans).toHaveLength(2);
  });

  it("fills the finding from its first span", () => {
    const finding = view.findings[0];
    expect(finding.confidence).toBe("92%");
    expect(finding.reason).toBe("Agent said so.");
    expect(finding.evidence_quote).toBe("this call is rec");
    expect(finding.timestamp).toBe("00:00");
    expect(finding.chunk_id).toBe("seg_0001");
    expect(view.findings[1].timestamp).toBeNull();
    expect(view.findings[1].chunk_id).toBe("");
    expect(view.findings[1].evidence_quote).toBe("");
  });

  it("keeps the raw pipeline status beside the verdict", () => {
    expect(view.findings.map((f) => f.status)).toEqual(output.final_results?.map((r) => r.status));
  });

  it("maps statuses to verdicts", () => {
    expect(view.findings.map((f) => f.verdict)).toEqual([
      "Pass",
      "Partial",
      "Unclear",
      "Not applicable",
      "Fail",
    ]);
  });

  it("falls back from question to name to id", () => {
    expect(view.findings.map((f) => f.question)).toEqual([
      "Was the recording notice given?",
      "Named item",
      "bare",
      "na",
      "bad",
    ]);
  });

  it("counts partial and cannot-determine as unclear", () => {
    expect(view.summary).toEqual({
      total: 5,
      pass: 1,
      fail: 1,
      unclear: 2,
      not_applicable: 1,
      compliant_spans: 0,
      violation_spans: 0,
      requires_review: true,
    });
    expect(view.report.title).toBe("call.mp3");
    expect(view.report.summary).toBe(view.summary);
  });
});
