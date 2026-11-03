import { type PipelineStatus, toAnalysisView, VERDICTS } from "../data/pipeline-output.ts";
import type { MediaAssetAnalysis } from "../playback/playback-api.ts";

export interface CallFinding {
  itemId: string;
  question: string;
  /** The reviewer's current decision where there is one, otherwise the AI's verdict. */
  status: PipelineStatus;
  verdict: string;
  /** The AI's verdict, set only when a reviewer overrode it. */
  overriddenAiVerdict: string | null;
  reviewerComment: string | null;
  reasoning: string;
  evidence: { text: string; timestamp: string | null }[];
}

const SEVERITY: Record<PipelineStatus, number> = {
  FAIL: 0,
  PARTIAL: 1,
  CANNOT_DETERMINE: 2,
  PASS: 3,
  NOT_APPLICABLE: 4,
};

/** One row per checklist question for the read-only call detail, most serious first. */
export function toCallFindings(analysis: MediaAssetAnalysis): CallFinding[] {
  if (!analysis.result) return [];
  const overrides = new Map(
    (analysis.review?.overrides ?? []).map((override) => [override.checklistItemId, override]),
  );
  const findings = toAnalysisView(analysis.result, analysis.fileName).findings.map((finding) => {
    const aiStatus = finding.status as PipelineStatus;
    const override = overrides.get(finding.checklist_id);
    const status = override?.decision ?? aiStatus;
    return {
      itemId: finding.checklist_id,
      question: finding.question,
      status,
      verdict: VERDICTS[status] ?? status,
      overriddenAiVerdict: override ? (VERDICTS[aiStatus] ?? aiStatus) : null,
      reviewerComment: override?.comment || null,
      reasoning: finding.reason,
      evidence: finding.spans.map((span, index) => ({
        text: span.text,
        timestamp: index === 0 ? finding.timestamp : null,
      })),
    };
  });
  return findings.sort((a, b) => (SEVERITY[a.status] ?? 5) - (SEVERITY[b.status] ?? 5));
}
