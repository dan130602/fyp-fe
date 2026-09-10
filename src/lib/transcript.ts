/* Transcript span helpers. Pure functions, no React, no data.

   The AI service returns the transcript as one string plus a flat list of spans
   carrying character offsets. Spans may overlap — in the sample payload the
   opening sentence is cited by both `recording_notice` and `identity` — so the
   transcript cannot be rendered by simply wrapping each span in turn. */

import type { Tone } from "../components/ui/badge.tsx";
import type { SpanTimestamp } from "./audio.ts";

// The verdict strings the AI service emits. "Pass"/"Fail"/"Unclear" are the only
// values seen in the sample payloads; report.summary also counts a
// not_applicable bucket, so a fourth value almost certainly exists in the wild.
// Left as a plain string rather than a narrower union for that reason.
export type Verdict = string;

export type SpanLabel = "compliant" | "violation" | "unclear" | null;

/** One cited passage of the transcript, as the AI service emits it. */
export interface Span {
  text: string;
  start: number;
  end: number;
  label: SpanLabel;
  checklist_id: string;
  chunk_id: string;
  timestamp: SpanTimestamp | null;
}

/** A consecutive, non-overlapping slice of the transcript carrying every span that covers it. */
export interface Segment {
  text: string;
  start: number;
  end: number;
  spans: Span[];
}

/** The subset of a Finding that labelSpansByVerdict needs. */
export interface VerdictSource {
  checklist_id: string;
  verdict: Verdict;
}

/**
 * Resolve a span against the transcript it was cited from.
 * The offsets are authoritative when they still match the quoted text; when a
 * payload's offsets have drifted we fall back to locating the quote itself, and
 * a span we cannot place at all is dropped rather than shifting the rest.
 */
function resolveSpan(transcript: string, span: Span): Span | null {
  const { start, end, text } = span;
  if (transcript.slice(start, end) === text) return { ...span, start, end };
  const found = transcript.indexOf(text);
  return found === -1 ? null : { ...span, start: found, end: found + text.length };
}

/**
 * Cut the transcript into consecutive, non-overlapping segments, each carrying
 * every span that covers it. Segments tile the transcript exactly, so rendering
 * them in order reproduces the original text.
 */
export function segmentTranscript(transcript: string, spans: Span[] = []): Segment[] {
  if (!transcript) return [];
  const placed = spans
    .map((span) => resolveSpan(transcript, span))
    .filter((span): span is Span => span !== null);
  const cuts = [0, transcript.length];
  for (const span of placed) cuts.push(span.start, span.end);
  const bounds = [...new Set(cuts)].sort((a, b) => a - b);

  const segments: Segment[] = [];
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const [start, end] = [bounds[i], bounds[i + 1]];
    if (start === end) continue;
    segments.push({
      text: transcript.slice(start, end),
      start,
      end,
      spans: placed.filter((span) => span.start <= start && span.end >= end),
    });
  }
  return segments;
}

/** The label a verdict implies for the passages cited in support of it. */
function labelFor(verdict: Verdict): SpanLabel {
  if (verdict === "Pass") return "compliant";
  if (verdict === "Fail") return "violation";
  if (verdict === "Unclear") return "unclear";
  return null;
}

/**
 * Re-label spans from the verdict of the finding that cited them.
 *
 * The service labels each span independently of the answer it supports, and the
 * two can disagree: in the sample payload the `identity` check is a Fail whose
 * spans are both labelled `compliant`, because the model cited surrounding
 * conversation as context for evidence it could not find. Showing those in green
 * would tell the officer a failed check passed, so the verdict wins. A span whose
 * verdict implies nothing keeps the label the service gave it.
 */
export function labelSpansByVerdict(spans: Span[], findings: VerdictSource[]): Span[] {
  const verdicts = Object.fromEntries(findings.map((f) => [f.checklist_id, f.verdict]));
  return spans.map((span) => ({
    ...span,
    label: labelFor(verdicts[span.checklist_id]) ?? span.label,
  }));
}

/** Tone for a segment. Worst label wins, so red is never masked by amber or green. */
export function segmentTone(segment: Segment): SpanLabel {
  for (const tone of ["violation", "unclear", "compliant"] as const) {
    if (segment.spans.some((span) => span.label === tone)) return tone;
  }
  return null;
}

/** Map a finding's verdict onto the shared Badge tones in styles.css. */
export function verdictTone(verdict: Verdict): Tone {
  if (verdict === "Pass") return "good";
  if (verdict === "Fail") return "risk";
  if (verdict === "Unclear") return "watch";
  return "info";
}

/** The glyph the checklist row shows for a verdict. */
export function verdictIcon(verdict: Verdict): string {
  if (verdict === "Pass") return "✓";
  if (verdict === "Fail") return "!";
  return "?";
}
