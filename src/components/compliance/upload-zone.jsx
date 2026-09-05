import { useRef, useState } from "react";
import { validateFile } from "../../uploads/upload-validation.ts";
import { useUploadFile } from "../../uploads/use-upload-file.ts";

/** Drag-and-drop target for a new call recording. Validates, then presigns and PUTs to S3. */
export default function UploadZone({ onUpload }) {
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [validationError, setValidationError] = useState("");
  const [progress, setProgress] = useState(0);
  const mutation = useUploadFile();

  const isBusy = mutation.isPending;

  const handleFile = (file) => {
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

  const backendMessage = mutation.isError ? mutation.error.message : "";
  const statusText = isBusy
    ? `Uploading ${fileName}… ${Math.round(progress * 100)}%`
    : mutation.isSuccess
      ? `${fileName} · Ready to analyse`
      : "Drag and drop MP3, WAV, or M4A here, or choose a file";

  return (
    <div
      className={`upload-zone ${dragging ? "dragging" : ""}`}
      role="button"
      tabIndex="0"
      aria-disabled={isBusy}
      onClick={() => !isBusy && input.current?.click()}
      onKeyDown={(e) => !isBusy && (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        !isBusy && setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
    >
      <div className="upload-icon">↑</div>
      <div>
        <b>Upload a new call recording</b>
        <small className={mutation.isSuccess ? "uploaded" : ""}>{statusText}</small>
        {(validationError || backendMessage) && (
          <small className="upload-zone-error">{validationError || backendMessage}</small>
        )}
      </div>
      <button
        type="button"
        disabled={isBusy}
        onClick={(e) => {
          e.stopPropagation();
          input.current?.click();
        }}
      >
        {isBusy ? "Uploading…" : "Choose audio"}
      </button>
      <input
        ref={input}
        type="file"
        accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,.mp3,.wav,.m4a"
        disabled={isBusy}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  );
}
