// Per-question reviewer drafts and their derivation into the overrides sent to the backend.
import type { PipelineStatus } from "../data/pipeline-output.ts";
import type { ChecklistReview, ReviewOverrideInput } from "../playback/playback-api.ts";

export interface Draft {
  decision: PipelineStatus;
  comment: string;
}

/** Keyed by checklist item id; a question with no entry is accepted as the AI answered. */
export type Drafts = Record<string, Draft>;

interface AiAnswer {
  checklist_id: string;
  status?: PipelineStatus;
}

/** Rebuilds the drafts from a saved review, so a returning officer sees their overrides. */
export function seedDrafts(review: ChecklistReview | null | undefined): Drafts {
  const drafts: Drafts = {};
  for (const o of review?.overrides ?? []) {
    drafts[o.checklistItemId] = { decision: o.decision, comment: o.comment };
  }
  return drafts;
}

/** Choosing the AI's own verdict clears the override; the comment goes with it. */
export function chooseDecision(
  drafts: Drafts,
  id: string,
  aiStatus: PipelineStatus | undefined,
  decision: PipelineStatus,
): Drafts {
  if (decision === aiStatus) {
    const { [id]: _removed, ...rest } = drafts;
    return rest;
  }
  return { ...drafts, [id]: { decision, comment: drafts[id]?.comment ?? "" } };
}

/** Ignored unless the question is currently overridden. */
export function setComment(drafts: Drafts, id: string, comment: string): Drafts {
  const draft = drafts[id];
  return draft ? { ...drafts, [id]: { ...draft, comment } } : drafts;
}

/** Only questions whose decision differs from the AI, in findings order. */
export function buildOverrides(findings: AiAnswer[], drafts: Drafts): ReviewOverrideInput[] {
  const overrides: ReviewOverrideInput[] = [];
  for (const { checklist_id: id, status } of findings) {
    const draft = drafts[id];
    if (!draft || draft.decision === status) continue;
    overrides.push({
      checklistItemId: id,
      decision: draft.decision,
      comment: draft.comment.trim(),
    });
  }
  return overrides;
}

/** Overridden questions still missing a comment, in findings order, so the first is the next to fix. */
export function missingCommentIds(overrides: ReviewOverrideInput[]): string[] {
  return overrides.filter((o) => o.comment === "").map((o) => o.checklistItemId);
}

/**
 * Checklist items whose current override differs from the saved review: new, changed
 * decision or comment, or a saved override that has since been reverted.
 */
export function pendingChangeCount(
  overrides: ReviewOverrideInput[],
  review: ChecklistReview | null | undefined,
): number {
  const saved = new Map((review?.overrides ?? []).map((o) => [o.checklistItemId, o]));
  let count = 0;
  for (const o of overrides) {
    const prior = saved.get(o.checklistItemId);
    if (!prior || prior.decision !== o.decision || prior.comment !== o.comment) count++;
    saved.delete(o.checklistItemId);
  }
  return count + saved.size;
}
