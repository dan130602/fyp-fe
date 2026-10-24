import type { PipelineStatus } from "../../data/pipeline-output.ts";
import { VERDICTS } from "../../data/pipeline-output.ts";
import { Button } from "../ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";

export interface OverrideRow {
  id: string;
  question: string;
  aiVerdict: PipelineStatus | undefined;
  decision: PipelineStatus;
  comment: string;
}

interface ReviewConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overrides: OverrideRow[];
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
}

const label = (status: PipelineStatus | undefined) => (status ? VERDICTS[status] : "Unknown");

/** Last look at what will be saved; a resubmit overwrites the previous review. */
export default function ReviewConfirmDialog({
  open,
  onOpenChange,
  overrides,
  pending,
  error,
  onConfirm,
}: ReviewConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit review</DialogTitle>
          <DialogDescription>
            {overrides.length === 0
              ? "Approve all AI verdicts as-is."
              : `${overrides.length} AI verdict${overrides.length === 1 ? "" : "s"} will be overridden. Any earlier review is replaced.`}
          </DialogDescription>
        </DialogHeader>

        {overrides.length > 0 && (
          <ul className="grid max-h-[24rem] gap-3 overflow-y-auto">
            {overrides.map((row) => (
              <li key={row.id}>
                <b>{row.question}</b>
                <p className="subtle">
                  {label(row.aiVerdict)} → {label(row.decision)}
                </p>
                <p>{row.comment}</p>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p role="alert" className="subtle">
            Could not submit the review: {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={pending}>
            {pending ? "Submitting…" : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
