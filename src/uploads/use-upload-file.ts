// One mutation covers presign + PUT: a successful presign with a failed PUT is still a failed upload.
import { useMutation } from "@tanstack/react-query";
import type { FileUploadResponse } from "./upload-api.ts";
import { putToS3, requestPresignedUploads } from "./upload-api.ts";

export interface UploadResult {
  fileName: string;
  objectKey: string;
}

interface UploadFileVariables {
  file: File;
  onProgress?: (fraction: number) => void;
}

async function uploadFile({ file, onProgress }: UploadFileVariables): Promise<UploadResult> {
  const presigned = await requestPresignedUploads([
    { fileName: file.name, contentType: file.type, fileSize: file.size },
  ]);

  const upload: FileUploadResponse | undefined = presigned.uploads[0];
  if (!upload) {
    throw new Error("Server did not return an upload target");
  }

  await putToS3(upload.presignedUrl, file, file.type, onProgress);

  return { fileName: upload.fileName, objectKey: upload.objectKey };
}

export function useUploadFile() {
  return useMutation({
    mutationFn: uploadFile,
  });
}
