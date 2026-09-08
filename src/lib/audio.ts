/* Audio clock formatting and the transcript-to-audio time mapping.
   Pure functions, no React, no data. */

// The minimal span/segment shape these functions need, kept independent of the
// richer transcript.ts Span/Segment so this file stays a leaf with no imports.
export interface TimedSpan {
  start: number;
  end: number;
  timestamp: SpanTimestamp | null;
}

export interface TimedSegment {
  start: number;
  end: number;
  spans: TimedSpan[];
}

/** Real timing for a span, in seconds. End is null if the pipeline could not bound it. */
export interface SpanTimestamp {
  start: number;
  end: number | null;
}

export interface TimeWindow {
  start: number;
  end: number;
  estimated: boolean;
}

/** Seconds as mm:ss, or --:-- when there is no usable value yet. */
export function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * Where a cited passage sits in the recording.
 *
 * Real timings win whenever the backend supplies them. Otherwise the passage's
 * character offset is mapped proportionally onto the duration — an estimate, and
 * marked as one, so the transcript stays clickable for audio that arrived without
 * per-chunk timings. It assumes an even speaking rate, so it drifts around pauses;
 * it is a navigation aid, not evidence.
 */
export function spanTime(
  span: TimedSpan,
  transcriptLength: number,
  duration: number,
): TimeWindow | null {
  const { timestamp } = span;
  if (timestamp && timestamp.end !== null) {
    return { start: timestamp.start, end: timestamp.end, estimated: false };
  }
  if (!Number.isFinite(duration) || duration <= 0 || !transcriptLength) return null;
  const at = (char: number) => (char / transcriptLength) * duration;
  return { start: at(span.start), end: at(span.end), estimated: true };
}

/**
 * Where a transcript segment sits in the recording.
 *
 * A segment carries no timestamp of its own — it is a slice of the transcript —
 * so its timing comes from a span that covers it, falling back to the estimate.
 */
export function segmentTime(
  segment: TimedSegment,
  transcriptLength: number,
  duration: number,
): TimeWindow | null {
  const timed: TimedSpan | undefined = segment.spans?.find((span) => span.timestamp);
  return spanTime({ ...segment, timestamp: timed?.timestamp ?? null }, transcriptLength, duration);
}

/** The segment being spoken at `time`, for following playback through the transcript. */
export function segmentAtTime(
  segments: TimedSegment[],
  transcriptLength: number,
  duration: number,
  time: number,
): TimedSegment | null {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return null;
  return (
    segments.find((segment) => {
      const window = segmentTime(segment, transcriptLength, duration);
      return window && time >= window.start && time < window.end;
    }) ?? null
  );
}
