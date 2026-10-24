// Per-question decision history, derived from the review's append-only decision log.
import type { PipelineStatus } from "../data/pipeline-output.ts";
import type { ChecklistReview } from "../playback/playback-api.ts";

export interface HistoryEntry {
  from: PipelineStatus;
  to: PipelineStatus;
  /** The officer went back to the AI verdict, so `to` is the AI's own answer. */
  reverted: boolean;
  comment: string | null;
  decidedAt: string;
}

/** One question's decisions, newest first; each `from` is the verdict in force before it. */
export function historyFor(
  review: ChecklistReview | null | undefined,
  checklistItemId: string,
): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  let current: PipelineStatus | null = null;
  for (const d of review?.history ?? []) {
    if (d.checklistItemId !== checklistItemId) continue;
    const to = d.decision ?? d.aiVerdict;
    entries.push({
      from: current ?? d.aiVerdict,
      to,
      reverted: d.decision === null,
      comment: d.comment,
      decidedAt: d.decidedAt,
    });
    current = to;
  }
  return entries.reverse();
}

/** Same format as the "Reviewed ·" badge, so history times read like the header. */
export function formatReviewTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
