import { type DragEvent, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { validateFile } from "../../uploads/upload-validation.ts";
import type { UploadResult } from "../../uploads/use-upload-file.ts";
import { useUploadFile } from "../../uploads/use-upload-file.ts";

export interface UploadZoneResult extends UploadResult {
  file: File;
}

interface UploadZoneProps {
  onUpload: (result: UploadZoneResult) => void;
}

/** Drag-and-drop target for a new call recording. Validates, then presigns and PUTs to S3. */
export default function UploadZone({ onUpload }: UploadZoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [validationError, setValidationError] = useState("");
  const [progress, setProgress] = useState(0);
  const mutation = useUploadFile();
  const statusId = useId();

  const isBusy = mutation.isPending;

  const handleFile = (file: File | undefined) => {
    if (!file || isBusy) return;

    const result = validateFile(file);
    if (!result.ok) {
      setValidationError(result.reason);
      setFileName("");
      return;
    }

    setValidationError("");
    setFileName(file.name);
    setProgress(0);
    mutation.mutate(
      { file, onProgress: setProgress },
      { onSuccess: (uploadResult) => onUpload({ ...uploadResult, file }) },
    );
  };

  const stopDragging = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
  };

  const backendMessage = mutation.isError ? mutation.error.message : "";
  const statusText = isBusy
    ? `Uploading ${fileName}… ${Math.round(progress * 100)}%`
    : mutation.isSuccess
      ? `${fileName} · Ready to analyse`
      : "Drag and drop MP3, WAV, or M4A here, or choose a file";

  // Drag events only; the Choose audio button is the keyboard and pointer path, so this
  // element is decorative for interaction purposes and takes no role or tab stop.
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drag-only; the button is the a11y path
    <div
      className={`upload-zone ${dragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!isBusy) setDragging(true);
      }}
      onDragLeave={stopDragging}
      onDrop={(event) => {
        stopDragging(event);
        handleFile(event.dataTransfer.files[0]);
      }}
    >
      <div className="upload-icon" aria-hidden="true">
        ↑
      </div>
      <div>
        <b>Upload a new call recording</b>
        <small id={statusId} className={mutation.isSuccess ? "uploaded" : ""}>
          {statusText}
        </small>
        {(validationError || backendMessage) && (
          <small className="upload-zone-error" role="alert">
            {validationError || backendMessage}
          </small>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={isBusy}
        aria-describedby={statusId}
        onClick={() => input.current?.click()}
      >
        {isBusy ? "Uploading…" : "Choose audio"}
      </Button>
      <input
        ref={input}
        type="file"
        accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,.mp3,.wav,.m4a"
        disabled={isBusy}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
