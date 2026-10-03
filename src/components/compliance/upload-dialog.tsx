import { Download, FileUp, Plus } from "lucide-react";
import { type ChangeEvent, type DragEvent, useState } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  isCustomQuestion,
  mergeChecklist,
  newChecklistId,
  parseChecklistCsv,
} from "@/uploads/parse-checklist-csv.ts";
import type { ChecklistItem } from "@/uploads/upload-api.ts";
import { validateFile } from "@/uploads/upload-validation.ts";
import { useDefaultChecklist } from "@/uploads/use-default-checklist.ts";
import { type UploadResult, useUploadFile } from "@/uploads/use-upload-file.ts";

const STEPS = [
  {
    title: "Choose file",
    description: "Pick the call recording to analyse. MP3, WAV or M4A, up to 100 MB.",
  },
  {
    title: "Checklist",
    description:
      "These are the questions the AI will answer about this call. Remove any that don't apply, add your own, or import many at once from a CSV.",
  },
  {
    title: "Review",
    description:
      "Check the file and questions, then upload. Processing starts once the upload finishes.",
  },
] as const;

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: (result: UploadResult & { file: File }) => void;
}

/** Three-step upload: pick a recording, edit its checklist, review and upload. */
export default function UploadDialog({ open, onOpenChange, onUploaded }: UploadDialogProps) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [edited, setEdited] = useState<ChecklistItem[] | null>(null);
  const defaults = useDefaultChecklist();
  const checklist = edited ?? defaults.data ?? [];
  const [progress, setProgress] = useState(0);
  const mutation = useUploadFile();

  const reset = () => {
    setStep(0);
    setFile(null);
    setEdited(null);
    setProgress(0);
    mutation.reset();
  };

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return; // no closing mid-upload
    if (!next) reset();
    onOpenChange(next);
  };

  const upload = () => {
    if (!file) return;
    mutation.mutate(
      { file, checklist, onProgress: setProgress },
      {
        onSuccess: (result) => {
          onUploaded({ ...result, file });
          handleOpenChange(false);
        },
      },
    );
  };

  const canContinue = step === 0 ? file !== null : checklist.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Upload a call recording</DialogTitle>
          <p className="text-sm font-medium">
            Step {step + 1} of {STEPS.length} · {STEPS[step].title}
          </p>
          <DialogDescription>{STEPS[step].description}</DialogDescription>
        </DialogHeader>

        {step === 0 && <FileStep file={file} onChange={setFile} />}
        {step === 1 && defaults.isPending && <p className="text-sm">Loading checklist…</p>}
        {step === 1 && defaults.isError && (
          <p role="alert" className="text-sm text-destructive">
            Couldn't load the default checklist. You can still add questions.
          </p>
        )}
        {step === 1 && !defaults.isPending && (
          <ChecklistStep items={checklist} onChange={setEdited} />
        )}
        {step === 2 && file && <ReviewStep file={file} items={checklist} />}

        {mutation.isPending && <p className="text-sm">Uploading… {Math.round(progress * 100)}%</p>}
        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error.message}
          </p>
        )}

        <DialogFooter>
          {step > 0 && (
            <Button
              variant="outline"
              disabled={mutation.isPending}
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : (
            <Button disabled={mutation.isPending} onClick={upload}>
              {mutation.isPending ? "Uploading…" : "Upload"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileStep({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    const result = validateFile(picked);
    setError(result.ok ? "" : result.reason);
    onChange(result.ok ? picked : null);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files[0]);
  };

  return (
    <div className="grid gap-2">
      <label
        className={`grid cursor-pointer place-items-center gap-1 rounded-md border-2 border-dashed p-8 text-sm ${dragging ? "border-primary bg-muted" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <b>{file ? file.name : "Drop an MP3, WAV or M4A here"}</b>
        <span className="text-muted-foreground">or click to choose a file</span>
        <input
          type="file"
          className="sr-only"
          accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,.mp3,.wav,.m4a"
          onChange={(event) => pick(event.target.files?.[0])}
        />
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ChecklistStep({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [importResult, setImportResult] = useState<{ added: number; fileName: string } | null>(
    null,
  );

  const importCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const csv = event.target.files?.[0];
    event.target.value = ""; // lets the same file be picked again
    if (!csv) return;
    const merged = mergeChecklist(items, parseChecklistCsv(await csv.text()));
    setImportResult({ added: merged.length - items.length, fileName: csv.name });
    onChange(merged);
  };

  const add = () => {
    const question = draft.trim();
    if (!question) return;
    onChange([...items, { id: newChecklistId(), question }]);
    setDraft("");
  };

  return (
    <div className="grid gap-3">
      <ol className="grid max-h-80 gap-2 overflow-y-auto">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <SourceBadge item={item} />
              {item.question}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-red-soft hover:text-destructive"
              aria-label={`Remove: ${item.question}`}
              onClick={() => onChange(items.filter((other) => other.id !== item.id))}
            >
              Remove
            </Button>
          </li>
        ))}
      </ol>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a question"
          aria-label="New checklist question"
        />
        <Button type="submit" disabled={!draft.trim()}>
          <Plus aria-hidden="true" />
          Add question
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Button asChild variant="outline">
          <label className="cursor-pointer has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50">
            <FileUp aria-hidden="true" />
            Import CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={importCsv} />
          </label>
        </Button>
        <Button asChild variant="link" className="px-0">
          <a href="/checklist-template.csv" download="checklist-template.csv">
            <Download aria-hidden="true" />
            Download template
          </a>
        </Button>
        <span className="text-muted-foreground">One question per row.</span>
      </div>
      {importResult &&
        (importResult.added > 0 ? (
          <p role="status" className="rounded-md bg-green-soft px-3 py-2 text-sm text-green">
            Added {importResult.added} question{importResult.added === 1 ? "" : "s"} from{" "}
            {importResult.fileName}.
          </p>
        ) : (
          <p role="alert" className="rounded-md bg-red-soft px-3 py-2 text-sm text-red">
            No new questions found in {importResult.fileName}.
          </p>
        ))}
    </div>
  );
}

function SourceBadge({ item }: { item: ChecklistItem }) {
  return isCustomQuestion(item) ? (
    <Badge variant="secondary" className="shrink-0">
      Custom
    </Badge>
  ) : (
    <Badge variant="outline" className="shrink-0 text-muted-foreground">
      Default
    </Badge>
  );
}

function ReviewStep({ file, items }: { file: File; items: ChecklistItem[] }) {
  const custom = items.filter(isCustomQuestion).length;
  return (
    <div className="grid gap-3 text-sm">
      <p>
        <b>File:</b> {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
      </p>
      <p>
        <b>Checklist:</b> {items.length} questions ({items.length - custom} default, {custom}{" "}
        custom)
      </p>
      <ol className="grid max-h-96 gap-1.5 overflow-y-auto">
        {items.map((item, index) => (
          <li key={item.id} className="grid grid-cols-[2.5rem_auto_1fr] items-center gap-2">
            <span className="text-right text-muted-foreground tabular-nums">{index + 1}.</span>
            <SourceBadge item={item} />
            <span>{item.question}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
