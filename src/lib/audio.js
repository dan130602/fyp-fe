/* Audio clock formatting and the transcript-to-audio time mapping.
   Pure functions, no React, no data. */

const CLOCK = /^(\d{1,3}):([0-5]\d)$/;

/** Seconds as mm:ss, or --:-- when there is no usable value yet. */
export function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * Parse the `mm:ss-mm:ss` timestamp the backend puts on a span into seconds.
 * Returns null for the pasted-transcript path, where timestamps are null.
 */
export function parseTimestamp(timestamp) {
  if (typeof timestamp !== "string") return null;
  const at = (part) => {
    const match = CLOCK.exec((part ?? "").trim());
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  const [from, to] = timestamp.split("-");
  const start = at(from);
  return start === null ? null : { start, end: at(to) };
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
export function spanTime(span, transcriptLength, duration) {
  const parsed = parseTimestamp(span.timestamp);
  if (parsed) return { start: parsed.start, end: parsed.end, estimated: false };
  if (!Number.isFinite(duration) || duration <= 0 || !transcriptLength) return null;
  const at = (char) => (char / transcriptLength) * duration;
  return { start: at(span.start), end: at(span.end), estimated: true };
}

/**
 * Where a transcript segment sits in the recording.
 *
 * A segment carries no timestamp of its own — it is a slice of the transcript —
 * so its timing comes from a span that covers it, falling back to the estimate.
 */
export function segmentTime(segment, transcriptLength, duration) {
  const timed = segment.spans?.find((span) => span.timestamp) ?? segment;
  return spanTime({ ...segment, timestamp: timed.timestamp ?? null }, transcriptLength, duration);
}

/** The segment being spoken at `time`, for following playback through the transcript. */
export function segmentAtTime(segments, transcriptLength, duration, time) {
  if (!Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return null;
  return segments.find((segment) => {
    const window = segmentTime(segment, transcriptLength, duration);
    return window && time >= window.start && time < window.end;
  }) ?? null;
}
