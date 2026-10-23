// One mutation covers presign + PUT: a successful presign with a failed PUT is still a failed upload.
import { useMutation } from "@tanstack/react-query";
import type { ChecklistItem, FileUploadResponse, ProcessingMode } from "./upload-api.ts";
import { putToS3, requestPresignedUploads } from "./upload-api.ts";

export interface UploadResult {
  fileName: string;
  objectKey: string;
  processingMode: ProcessingMode;
}

interface UploadFileVariables {
  file: File;
  checklist: ChecklistItem[];
  advisorId: string;
  processingMode?: ProcessingMode;
  onProgress?: (fraction: number) => void;
}

async function uploadFile({
  file,
  checklist,
  advisorId,
  processingMode = "immediate",
  onProgress,
}: UploadFileVariables): Promise<UploadResult> {
  const presigned = await requestPresignedUploads(
    [{ fileName: file.name, contentType: file.type, fileSize: file.size, checklist, advisorId }],
    processingMode,
  );

  const upload: FileUploadResponse | undefined = presigned.uploads[0];
  if (!upload) {
    throw new Error("Server did not return an upload target");
  }

  await putToS3(upload.presignedUrl, file, file.type, onProgress);

  return { fileName: upload.fileName, objectKey: upload.objectKey, processingMode };
}

export function useUploadFile() {
  return useMutation({
    mutationFn: uploadFile,
  });
}
