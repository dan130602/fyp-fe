import { describe, expect, it } from "vitest";
import { formatClock, segmentAtTime, segmentTime, spanTime } from "../audio.ts";

describe("formatClock", () => {
  it("formats a valid duration as mm:ss", () => {
    expect(formatClock(65)).toBe("01:05");
  });

  it("floors fractional seconds", () => {
    expect(formatClock(65.9)).toBe("01:05");
  });

  it("returns --:-- for a negative value", () => {
    expect(formatClock(-1)).toBe("--:--");
  });

  it("returns --:-- for NaN", () => {
    expect(formatClock(Number.NaN)).toBe("--:--");
  });

  it("returns --:-- for Infinity", () => {
    expect(formatClock(Number.POSITIVE_INFINITY)).toBe("--:--");
  });

  it("does not cap minutes past 60", () => {
    expect(formatClock(3661)).toBe("61:01");
  });

  it("formats zero", () => {
    expect(formatClock(0)).toBe("00:00");
  });
});

describe("spanTime", () => {
  it("uses the real timestamp when present, ignoring char offsets", () => {
    const span = { start: 0, end: 10, timestamp: { start: 10, end: 20 } };
    expect(spanTime(span, 1000, 60)).toEqual({ start: 10, end: 20, estimated: false });
  });

  it("falls back to the proportional estimate when the timestamp has a null end", () => {
    const span = { start: 0, end: 100, timestamp: { start: 65, end: null } };
    expect(spanTime(span, 200, 60)).toEqual({ start: 0, end: 30, estimated: true });
  });

  it("falls back to a proportional estimate when timestamp is null", () => {
    const span = { start: 0, end: 100, timestamp: null };
    // transcriptLength=200, duration=60 -> factor 0.3
    expect(spanTime(span, 200, 60)).toEqual({ start: 0, end: 30, estimated: true });
  });

  it("marks the fallback estimate as estimated: true", () => {
    const span = { start: 50, end: 100, timestamp: null };
    const result = spanTime(span, 200, 60);
    expect(result?.estimated).toBe(true);
  });

  it("returns null when duration is NaN", () => {
    const span = { start: 0, end: 100, timestamp: null };
    expect(spanTime(span, 200, Number.NaN)).toBeNull();
  });

  it("returns null when duration is zero", () => {
    const span = { start: 0, end: 100, timestamp: null };
    expect(spanTime(span, 200, 0)).toBeNull();
  });

  it("returns null when duration is negative", () => {
    const span = { start: 0, end: 100, timestamp: null };
    expect(spanTime(span, 200, -5)).toBeNull();
  });

  it("returns null when transcriptLength is zero", () => {
    const span = { start: 0, end: 100, timestamp: null };
    expect(spanTime(span, 0, 60)).toBeNull();
  });
});

describe("segmentTime", () => {
  it("uses a real timestamp from a covering span when the segment itself has none", () => {
    const segment = {
      start: 0,
      end: 100,
      spans: [{ start: 0, end: 100, timestamp: { start: 5, end: 15 } }],
    };
    expect(segmentTime(segment, 1000, 60)).toEqual({ start: 5, end: 15, estimated: false });
  });

  it("falls back to the proportional estimate when no span carries a timestamp", () => {
    const segment = {
      start: 0,
      end: 100,
      spans: [{ start: 0, end: 100, timestamp: null }],
    };
    expect(segmentTime(segment, 200, 60)).toEqual({ start: 0, end: 30, estimated: true });
  });

  it("falls back to the estimate when spans is empty", () => {
    const segment = { start: 0, end: 100, spans: [] };
    expect(segmentTime(segment, 200, 60)).toEqual({ start: 0, end: 30, estimated: true });
  });
});

describe("segmentAtTime", () => {
  const segments = [
    { start: 0, end: 100, spans: [{ start: 0, end: 100, timestamp: null }] },
    { start: 100, end: 200, spans: [{ start: 100, end: 200, timestamp: null }] },
  ];

  it("finds the segment whose estimated window contains the time", () => {
    // transcriptLength=200, duration=60: seg0 -> [0,30), seg1 -> [30,60)
    expect(segmentAtTime(segments, 200, 60, 45)).toBe(segments[1]);
  });

  it("returns null when time is not finite", () => {
    expect(segmentAtTime(segments, 200, 60, Number.NaN)).toBeNull();
  });

  it("returns null when duration is not finite", () => {
    expect(segmentAtTime(segments, 200, Number.NaN, 10)).toBeNull();
  });

  it("returns null when duration is zero", () => {
    expect(segmentAtTime(segments, 200, 0, 10)).toBeNull();
  });

  it("returns null when no segment window contains the time", () => {
    expect(segmentAtTime(segments, 200, 60, 999)).toBeNull();
  });
});
