// Presign via the backend, then PUT the file bytes straight to S3.
import { apiGet, apiPost } from "../lib/api-client.ts";

/** Mirrors the backend's ChecklistItemRequest record. */
export interface ChecklistItem {
  id: string;
  question: string;
}

/** Mirrors the backend's FileUploadRequest record. */
export interface FileUploadRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
  checklist?: ChecklistItem[];
  /** The advisor (Advisor.id) whose call this is; required by the backend. */
  advisorId: string;
}

/** Mirrors the backend's FileUploadResponse record. */
export interface FileUploadResponse {
  fileName: string;
  objectKey: string;
  presignedUrl: string;
  expiresIn: number;
}

export const PROCESSING_MODES = ["immediate", "batch"] as const;
export type ProcessingMode = (typeof PROCESSING_MODES)[number];

/** Mirrors the backend's PresignedUploadRequest record. */
export interface PresignedUploadRequest {
  files: FileUploadRequest[];
  // snake_case is the backend's contract here; every other field is camelCase.
  processing_mode?: ProcessingMode;
}

/** Mirrors the backend's PresignedUploadResponse record. */
export interface PresignedUploadResponse {
  uploads: FileUploadResponse[];
}

export function getDefaultChecklist(): Promise<ChecklistItem[]> {
  return apiGet<ChecklistItem[]>("/api/checklists/default");
}

export function requestPresignedUploads(
  files: FileUploadRequest[],
  processingMode?: ProcessingMode,
): Promise<PresignedUploadResponse> {
  return apiPost<PresignedUploadResponse>("/api/uploads/presigned-urls", {
    files,
    processing_mode: processingMode,
  } satisfies PresignedUploadRequest);
}

/** Thrown when the PUT to S3 itself fails; distinct from a presign-time ApiError. */
export class S3UploadError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "S3UploadError";
    this.status = status;
  }
}

/**
 * Plain XHR, not apiPost/fetch: the presigned URL carries its own signature, so an
 * Authorization header must NOT be sent — S3 rejects the request if one is present.
 * XHR (not fetch) is used so upload progress can be reported for large audio files.
 */
export function putToS3(
  presignedUrl: string,
  file: File,
  contentType: string,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new S3UploadError(xhr.status, `Upload to storage failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new S3UploadError(0, "Upload to storage failed: network error"));

    xhr.send(file);
  });
}
