/* ---------------------------------------------------------------------------
   Data for the compliance officer view. The review queue reads the captured AI service responses in ./analyses, which
   are already in the shape the API returns.

   Nothing here is exported directly. Views read this module through the hooks
   at the bottom, so swapping in a real API later is a change to this file only.
--------------------------------------------------------------------------- */

import type { Tone } from "../components/ui/badge.tsx";
import type { Span, Verdict } from "../lib/transcript.ts";
import type { PipelineStatus } from "./pipeline-output.ts";

export interface Chunk {
  chunk_id: string;
  start_char: number;
  end_char: number;
  text: string;
}

export interface EvidenceChunk extends Chunk {
  score: number;
}

export interface ChecklistItem {
  id: string;
  question: string;
}

export interface Finding {
  checklist_id: string;
  question: string;
  verdict: Verdict;
  /** The AI service's raw status; absent on the mock analyses. */
  status?: PipelineStatus;
  reason: string;
  confidence: string;
  spans: Span[];
  evidence_quote: string;
  timestamp: string | null;
  chunk_id: string;
  retrieved_evidence: EvidenceChunk[];
}

export interface Summary {
  total: number;
  pass: number;
  fail: number;
  unclear: number;
  not_applicable: number;
  compliant_spans: number;
  violation_spans: number;
  requires_review: boolean;
}

/**
 * Call metadata and the summary counts. `audio_url` is not emitted by the
 * pipeline yet (see useAnalysis doc comment below) — every captured sample in
 * ./analyses is missing it, so it is typed optional rather than required.
 */
export interface Report {
  call_id: string | null;
  title: string | null;
  business_area: string | null;
  risk_level: string | null;
  summary: Summary;
  findings: Finding[];
  spans: Span[];
  audio_url?: string;
}

/** One analysed call, in the exact shape the AI service returns. */
export interface AnalysisPayload {
  transcript: string;
  chunks: Chunk[];
  checklist: ChecklistItem[];
  evidence: Record<string, EvidenceChunk[]>;
  findings: Finding[];
  spans: Span[];
  report: Report;
}

/* Every analysis in ./analyses is a call in the review queue. Dropping another
   captured response into that folder adds it to the list — no code change. */
const ANALYSES = Object.entries(
  import.meta.glob<AnalysisPayload>("./analyses/*.json", { eager: true, import: "default" }),
)
  .map(([path, analysis]) => ({ id: path.replace(/^.*\/|\.json$/g, ""), analysis }))
  .sort((a, b) => a.id.localeCompare(b.id));

/** Verdicts that decide how urgent a call looks in the list. */
function riskOf(summary: Summary): { label: string; tone: Tone } {
  if (summary.fail > 0) return { label: "High risk", tone: "risk" };
  if (summary.unclear > 0) return { label: "Needs review", tone: "watch" };
  return { label: "Clear", tone: "good" };
}

/** A readable name for a call the pipeline did not name itself. */
function titleOf(id: string, report: Report): string {
  return (
    report.title ?? report.call_id ?? id.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/**
 * One row per analysed call, for the review queue list. Everything shown is
 * derived from the payload itself, since the pipeline leaves `call_id`, `title`,
 * `business_area`, and `risk_level` null on the pasted-transcript path.
 */
export function useAnalysisList() {
  return ANALYSES.map(({ id, analysis }) => {
    const summary = analysis.report.summary;
    return {
      id,
      title: titleOf(id, analysis.report),
      context: analysis.report.business_area ?? `${summary.total} checklist questions`,
      preview: analysis.transcript.slice(0, 140),
      risk: riskOf(summary),
      summary,
      hasAudio: Boolean(analysis.report.audio_url),
    };
  });
}

/**
 * One call's analysis, in the exact shape the AI service returns. `findings` and
 * `spans` are read from the top level rather than from `report`, which repeats
 * them; `report` is the place to look for call metadata and the summary counts.
 *
 * The recording is expected at `report.audio_url` — a field the pipeline does not
 * emit yet, so today it is absent and the player renders disabled. Add it to the
 * output node and the player picks it up with no frontend change.
 */
export function useAnalysis(id: string) {
  const entry = ANALYSES.find((a) => a.id === id) ?? ANALYSES[0];
  if (!entry) return null;
  const { transcript, chunks, checklist, findings, spans, report } = entry.analysis;
  return {
    id: entry.id,
    title: titleOf(entry.id, report),
    transcript,
    chunks,
    checklist,
    findings,
    spans,
    report,
    summary: report.summary,
  };
}
