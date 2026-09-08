import { describe, expect, it } from "vitest";
import type { Segment, Span } from "../transcript.ts";
import {
  labelSpansByVerdict,
  segmentTone,
  segmentTranscript,
  verdictIcon,
  verdictTone,
} from "../transcript.ts";

// Real transcript and spans lifted from src/data/analyses/call-01.json.
const TRANSCRIPT =
  "Advisor: Good morning, just to let you know this call is recorded for training purposes. " +
  "The balanced fund carries a 1.2% annual management fee and a 25 pound exit charge. " +
  "Honestly, you really cannot lose money on this one, it is a sure thing. " +
  "Customer: That sounds good to me, let us go ahead.";

const RECORDING_NOTICE_SPAN: Span = {
  text: "Advisor: Good morning, just to let you know this call is recorded for training purposes.",
  start: 0,
  end: 88,
  label: "compliant",
  checklist_id: "recording_notice",
  chunk_id: "chunk-01",
  timestamp: null,
};

const FEES_SPAN: Span = {
  text: "The balanced fund carries a 1.2% annual management fee and a 25 pound exit charge.",
  start: 89,
  end: 171,
  label: "compliant",
  checklist_id: "fees",
  chunk_id: "chunk-01",
  timestamp: null,
};

const GUARANTEES_SPAN: Span = {
  text: "Honestly, you really cannot lose money on this one, it is a sure thing.",
  start: 172,
  end: 243,
  label: "violation",
  checklist_id: "guarantees",
  chunk_id: "chunk-01",
  timestamp: null,
};

// The real payload also cites the recording-notice sentence again for `identity`,
// overlapping RECORDING_NOTICE_SPAN exactly.
const IDENTITY_SPAN: Span = {
  text: "Advisor: Good morning, just to let you know this call is recorded for training purposes.",
  start: 0,
  end: 88,
  label: "compliant",
  checklist_id: "identity",
  chunk_id: "chunk-01",
  timestamp: null,
};

describe("segmentTranscript", () => {
  it("places spans whose offsets match the quoted text", () => {
    const segments = segmentTranscript(TRANSCRIPT, [RECORDING_NOTICE_SPAN]);
    const hit = segments.find((s) => s.spans.length > 0);
    expect(hit?.text).toBe(RECORDING_NOTICE_SPAN.text);
    expect(hit?.start).toBe(0);
    expect(hit?.end).toBe(88);
  });

  it("falls back to indexOf when offsets have drifted from the quoted text", () => {
    const drifted = { ...RECORDING_NOTICE_SPAN, start: 5, end: 93 };
    const segments = segmentTranscript(TRANSCRIPT, [drifted]);
    const hit = segments.find((s) => s.spans.length > 0);
    expect(hit?.text).toBe(RECORDING_NOTICE_SPAN.text);
    expect(hit?.start).toBe(0);
    expect(hit?.end).toBe(88);
  });

  it("drops a span whose text cannot be found in the transcript at all", () => {
    const unplaceable = { ...RECORDING_NOTICE_SPAN, start: 5, end: 93, text: "this text is nowhere in the transcript" };
    const segments = segmentTranscript(TRANSCRIPT, [unplaceable]);
    expect(segments.every((s) => s.spans.length === 0)).toBe(true);
  });

  it("handles overlapping spans by tiling the overlap into its own segment", () => {
    // RECORDING_NOTICE_SPAN and IDENTITY_SPAN cover the exact same [0,88) range.
    const segments = segmentTranscript(TRANSCRIPT, [RECORDING_NOTICE_SPAN, IDENTITY_SPAN]);
    const overlap = segments.find((s) => s.start === 0 && s.end === 88);
    expect(overlap?.spans).toHaveLength(2);
    expect(overlap?.spans.map((s) => s.checklist_id).sort()).toEqual(["identity", "recording_notice"]);
  });

  it("tiles the transcript exactly, so concatenating segment text reproduces the original", () => {
    const segments = segmentTranscript(TRANSCRIPT, [RECORDING_NOTICE_SPAN, FEES_SPAN, GUARANTEES_SPAN]);
    const rebuilt = segments.map((s) => s.text).join("");
    expect(rebuilt).toBe(TRANSCRIPT);
  });

  it("segments are contiguous and non-overlapping in bounds", () => {
    const segments = segmentTranscript(TRANSCRIPT, [RECORDING_NOTICE_SPAN, FEES_SPAN, GUARANTEES_SPAN]);
    for (let i = 1; i < segments.length; i += 1) {
      expect(segments[i].start).toBe(segments[i - 1].end);
    }
    expect(segments[0].start).toBe(0);
    expect(segments[segments.length - 1].end).toBe(TRANSCRIPT.length);
  });

  it("returns an empty array for an empty transcript", () => {
    expect(segmentTranscript("", [RECORDING_NOTICE_SPAN])).toEqual([]);
  });

  it("returns an empty array for a falsy transcript with no spans arg", () => {
    expect(segmentTranscript("")).toEqual([]);
  });

  it("returns one whole-transcript segment with no spans given", () => {
    const segments = segmentTranscript(TRANSCRIPT);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ text: TRANSCRIPT, start: 0, end: TRANSCRIPT.length, spans: [] });
  });
});

describe("labelSpansByVerdict", () => {
  it("relabels a span from its finding's verdict, overriding the span's own label", () => {
    const findings = [{ checklist_id: "identity", verdict: "Fail" }];
    // identity's span is labelled "compliant" in the raw payload, but the finding failed.
    const [result] = labelSpansByVerdict([IDENTITY_SPAN], findings);
    expect(result.label).toBe("violation");
  });

  it("keeps the span's own label when the verdict implies nothing", () => {
    const findings = [{ checklist_id: "fees", verdict: "Not Applicable" }];
    const [result] = labelSpansByVerdict([FEES_SPAN], findings);
    expect(result.label).toBe("compliant");
  });
});

describe("segmentTone", () => {
  it("prefers violation over unclear and compliant", () => {
    const segment: Segment = {
      text: "irrelevant",
      start: 0,
      end: 10,
      spans: [
        { ...FEES_SPAN, label: "compliant" },
        { ...GUARANTEES_SPAN, label: "violation" },
        { ...FEES_SPAN, label: "unclear" },
      ],
    };
    expect(segmentTone(segment)).toBe("violation");
  });

  it("returns null when no span carries a recognised label", () => {
    const segment: Segment = { text: "irrelevant", start: 0, end: 10, spans: [] };
    expect(segmentTone(segment)).toBeNull();
  });
});

describe("verdictTone", () => {
  it("maps Pass/Fail/Unclear and falls back to info", () => {
    expect(verdictTone("Pass")).toBe("good");
    expect(verdictTone("Fail")).toBe("risk");
    expect(verdictTone("Unclear")).toBe("watch");
    expect(verdictTone("Not Applicable")).toBe("info");
  });
});

describe("verdictIcon", () => {
  it("maps Pass/Fail and falls back to ?", () => {
    expect(verdictIcon("Pass")).toBe("✓");
    expect(verdictIcon("Fail")).toBe("!");
    expect(verdictIcon("Unclear")).toBe("?");
  });
});
