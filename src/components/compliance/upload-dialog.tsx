import { Download, FileUp, Plus } from "lucide-react";
import { type ChangeEvent, type DragEvent, useState } from "react";
import type { Advisor } from "@/advisors/advisors-api.ts";
import AdvisorPicker from "@/components/compliance/advisor-picker.tsx";
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
import type { ChecklistItem, ProcessingMode } from "@/uploads/upload-api.ts";
import { MAX_FILES_PER_UPLOAD } from "@/uploads/upload-constants.ts";
import { validateFile } from "@/uploads/upload-validation.ts";
import { useDefaultChecklist } from "@/uploads/use-default-checklist.ts";
import { type UploadItem, useUploadFiles } from "@/uploads/use-upload-files.ts";

const STEPS = [
  {
    title: "Choose files",
    description: `Pick up to ${MAX_FILES_PER_UPLOAD} call recordings to analyse. MP3, WAV or M4A, up to 100 MB each.`,
  },
  {
    title: "Advisor",
    description:
      "Choose the advisor on these calls, so the analysis counts towards their results. All files use the same advisor.",
  },
  {
    title: "Checklist",
    description:
      "These are the questions the AI will answer about each call. Remove any that don't apply, add your own, or import many at once from a CSV.",
  },
  {
    title: "Review",
    description:
      "Check the files, advisor and questions, choose when to process them, then upload.",
  },
] as const;

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}

/** Four-step upload: pick recordings, pick their advisor, edit the checklist, review and upload. */
export default function UploadDialog({ open, onOpenChange, onUploaded }: UploadDialogProps) {
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [edited, setEdited] = useState<ChecklistItem[] | null>(null);
  const defaults = useDefaultChecklist();
  const checklist = edited ?? defaults.data ?? [];
  const uploads = useUploadFiles();
  const [started, setStarted] = useState(false);

  const reset = () => {
    setStep(0);
    setFiles([]);
    setAdvisor(null);
    setEdited(null);
    setStarted(false);
    uploads.reset();
  };

  const handleOpenChange = (next: boolean) => {
    if (uploads.isUploading) return; // no closing mid-upload
    if (!next) reset();
    onOpenChange(next);
  };

  const upload = async (processingMode: ProcessingMode) => {
    if (files.length === 0 || !advisor) return;
    setStarted(true);
    const { succeeded } = await uploads.start(files, {
      checklist,
      advisorId: advisor.id,
      processingMode,
    });
    if (succeeded > 0) onUploaded();
  };

  const retry = async (key: string) => {
    if (await uploads.retry(key)) onUploaded();
  };

  const canContinue = [files.length > 0, advisor !== null, checklist.length > 0][step] ?? false;
  const lastStep = STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl" showCloseButton={!uploads.isUploading}>
        <DialogHeader>
          <DialogTitle>Upload call recordings</DialogTitle>
          <p className="text-sm font-medium">
            Step {step + 1} of {STEPS.length} · {STEPS[step].title}
          </p>
          <DialogDescription>{STEPS[step].description}</DialogDescription>
        </DialogHeader>

        {step === 0 && <FileStep files={files} onChange={setFiles} />}
        {step === 1 && <AdvisorPicker selected={advisor} onSelect={setAdvisor} />}
        {step === 2 && defaults.isPending && <p className="text-sm">Loading checklist…</p>}
        {step === 2 && defaults.isError && (
          <p role="alert" className="text-sm text-destructive">
            Couldn't load the default checklist. You can still add questions.
          </p>
        )}
        {step === 2 && !defaults.isPending && (
          <ChecklistStep items={checklist} onChange={setEdited} />
        )}
        {step === lastStep && files.length > 0 && advisor && !started && (
          <ReviewStep files={files} advisor={advisor} items={checklist} />
        )}
        {step === lastStep && started && <UploadProgress items={uploads.items} onRetry={retry} />}

        <DialogFooter>
          {step > 0 && !started && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < lastStep ? (
            <Button disabled={!canContinue} onClick={() => setStep(step + 1)}>
              Next
            </Button>
          ) : uploads.isUploading ? (
            <Button disabled>Uploading…</Button>
          ) : started ? (
            <Button onClick={() => handleOpenChange(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => upload("batch")}>
                Upload, process tonight
              </Button>
              <Button onClick={() => upload("immediate")}>Upload and process now</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const fileId = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;
const sizeMb = (file: File) => (file.size / (1024 * 1024)).toFixed(1);

function FileStep({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  const pick = (picked: File[]) => {
    if (picked.length === 0) return;
    const next = [...files];
    const reasons: string[] = [];
    for (const file of picked) {
      if (next.some((other) => fileId(other) === fileId(file))) continue;
      const result = validateFile(file);
      if (!result.ok) {
        reasons.push(result.reason);
      } else if (next.length >= MAX_FILES_PER_UPLOAD) {
        reasons.push(
          `Only ${MAX_FILES_PER_UPLOAD} files can be uploaded at once; '${file.name}' was not added.`,
        );
      } else {
        next.push(file);
      }
    }
    setErrors(reasons);
    onChange(next);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    pick(Array.from(event.dataTransfer.files));
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
        <b>Drop MP3, WAV or M4A files here</b>
        <span className="text-muted-foreground">or click to choose files</span>
        <input
          type="file"
          multiple
          className="sr-only"
          accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,.mp3,.wav,.m4a"
          onChange={(event) => {
            pick(Array.from(event.target.files ?? []));
            event.target.value = ""; // lets the same file be picked again
          }}
        />
      </label>
      {errors.length > 0 && (
        <div role="alert" className="grid gap-1 text-sm text-destructive">
          {errors.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <ul className="grid gap-1">
          {files.map((file) => (
            <li
              key={fileId(file)}
              className="flex items-center justify-between gap-3 rounded-md border p-2 text-sm"
            >
              <span>
                {file.name} ({sizeMb(file)} MB)
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(files.filter((other) => other !== file))}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
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

function ReviewStep({
  files,
  advisor,
  items,
}: {
  files: File[];
  advisor: Advisor;
  items: ChecklistItem[];
}) {
  const custom = items.filter(isCustomQuestion).length;
  return (
    <div className="grid gap-3 text-sm">
      <div>
        <b>Files:</b>
        <ul className="grid gap-0.5">
          {files.map((file) => (
            <li key={fileId(file)}>
              {file.name} ({sizeMb(file)} MB)
            </li>
          ))}
        </ul>
      </div>
      <p>
        <b>Advisor:</b> {advisor.fullName} ({advisor.employeeId}) · {advisor.department}
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
      <p role="note" className="rounded-md bg-blue-soft px-3 py-2">
        Tonight: processed at 8pm SGT on weekdays. The audio is deleted after processing, so
        playback won't be available.
      </p>
    </div>
  );
}

function UploadProgress({
  items,
  onRetry,
}: {
  items: UploadItem[];
  onRetry: (key: string) => void;
}) {
  const settled = items.every((item) => item.status !== "uploading");
  const done = items.filter((item) => item.status === "done").length;
  return (
    <div className="grid gap-3 text-sm">
      {settled && (
        <p role="status" className="font-medium">
          {done} of {items.length} uploaded
        </p>
      )}
      <ul className="grid gap-2">
        {items.map((item) => {
          const percent = Math.round(item.progress * 100);
          return (
            <li key={item.key} className="grid gap-1 rounded-md border p-2">
              <div className="flex items-center justify-between gap-3">
                <span>{item.file.name}</span>
                <span className={item.status === "failed" ? "text-destructive" : undefined}>
                  {item.status === "uploading" && `Uploading ${percent}%`}
                  {item.status === "done" && "Uploaded"}
                  {item.status === "failed" && `Failed: ${item.error}`}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${item.file.name} upload progress`}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={`h-full ${item.status === "failed" ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              {item.status === "failed" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-self-start"
                  aria-label={`Retry ${item.file.name}`}
                  onClick={() => onRetry(item.key)}
                >
                  Retry
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
