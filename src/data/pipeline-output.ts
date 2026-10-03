/* The fyp-ai /runs/wait response, and its conversion into the view AnalysisWorkspace renders. */

import { formatClock } from "../lib/audio.ts";
import type { Span } from "../lib/transcript.ts";
import type { ChecklistItem, Finding, Report, Summary } from "./calls.ts";

export type PipelineStatus = "PASS" | "FAIL" | "PARTIAL" | "NOT_APPLICABLE" | "CANNOT_DETERMINE";

export interface PipelineSegment {
  id: string;
  speaker: string;
  start: number;
  end: number;
  text: string;
  role?: string | null;
}

export interface PipelineChecklistItem {
  id: string;
  name?: string;
  question?: string;
}

/** Offsets are relative to the cited segment's own text. */
export interface PipelineEvidenceRef {
  segment_id: string;
  start_char: number;
  end_char: number;
}

export interface PipelineResult {
  item_id: string;
  status: PipelineStatus;
  confidence: number;
  reasoning?: string;
  evidence?: PipelineEvidenceRef[];
}

export interface PipelineOutput {
  call_id?: string | null;
  segments?: PipelineSegment[];
  checklist?: PipelineChecklistItem[];
  final_results?: PipelineResult[];
  summary?: {
    total?: number;
    counts?: Partial<Record<PipelineStatus, number>>;
    needs_review?: boolean;
  };
}

const VERDICTS: Record<PipelineStatus, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  PARTIAL: "Partial",
  CANNOT_DETERMINE: "Unclear",
  NOT_APPLICABLE: "Not applicable",
};

export function toAnalysisView(output: PipelineOutput, title: string) {
  const segments = output.segments ?? [];
  const lines: string[] = [];
  const segmentsById = new Map<string, { segment: PipelineSegment; base: number }>();
  let length = 0;
  for (const segment of segments) {
    const prefix = `${segment.role ?? segment.speaker}: `;
    segmentsById.set(segment.id, { segment, base: length + prefix.length });
    lines.push(prefix + segment.text);
    length += prefix.length + segment.text.length + 1;
  }
  const transcript = lines.join("\n");

  const checklist: ChecklistItem[] = (output.checklist ?? []).map((item) => ({
    id: item.id,
    question: item.question || item.name || item.id,
  }));
  const questions = new Map(checklist.map((item) => [item.id, item.question]));

  const findings: Finding[] = (output.final_results ?? []).map((result) => {
    const spans: Span[] = [];
    for (const ref of result.evidence ?? []) {
      const known = segmentsById.get(ref.segment_id);
      if (!known) continue;
      const { segment, base } = known;
      if (
        ref.start_char < 0 ||
        ref.end_char > segment.text.length ||
        ref.start_char >= ref.end_char
      ) {
        continue;
      }
      spans.push({
        text: segment.text.slice(ref.start_char, ref.end_char),
        start: base + ref.start_char,
        end: base + ref.end_char,
        label: null,
        checklist_id: result.item_id,
        chunk_id: segment.id,
        timestamp: { start: segment.start, end: segment.end },
      });
    }
    const firstStart = spans[0]?.timestamp?.start;
    return {
      checklist_id: result.item_id,
      question: questions.get(result.item_id) ?? result.item_id,
      verdict: VERDICTS[result.status] ?? result.status,
      reason: result.reasoning ?? "",
      confidence: `${Math.round(result.confidence * 100)}%`,
      spans,
      evidence_quote: spans[0]?.text ?? "",
      timestamp: firstStart === undefined ? null : formatClock(firstStart),
      chunk_id: spans[0]?.chunk_id ?? "",
      retrieved_evidence: [],
    };
  });

  const spans = findings.flatMap((finding) => finding.spans);
  const counts = output.summary?.counts ?? {};
  const summary: Summary = {
    total: output.summary?.total ?? findings.length,
    pass: counts.PASS ?? 0,
    fail: counts.FAIL ?? 0,
    unclear: (counts.PARTIAL ?? 0) + (counts.CANNOT_DETERMINE ?? 0),
    not_applicable: counts.NOT_APPLICABLE ?? 0,
    compliant_spans: 0,
    violation_spans: 0,
    requires_review: output.summary?.needs_review ?? false,
  };
  const report: Report = {
    call_id: output.call_id ?? null,
    title,
    business_area: null,
    risk_level: null,
    summary,
    findings,
    spans,
  };

  return {
    id: output.call_id ?? title,
    title,
    transcript,
    chunks: [],
    checklist,
    findings,
    spans,
    report,
    summary,
  };
}
