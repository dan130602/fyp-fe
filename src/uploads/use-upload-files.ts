// Each file gets its own presign + PUT so one bad file never blocks the others.
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { MEDIA_ASSETS_QUERY_KEY } from "../playback/use-playback-url.ts";
import type { ChecklistItem, ProcessingMode } from "./upload-api.ts";
import { putToS3, requestPresignedUploads, S3UploadError } from "./upload-api.ts";

export type UploadStatus = "uploading" | "done" | "failed";

export interface UploadItem {
  key: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export interface UploadOptions {
  checklist: ChecklistItem[];
  advisorId: string;
  processingMode: ProcessingMode;
}

interface Target {
  presignedUrl: string;
  expiresAt: number;
}

// Re-presign if the URL is this close to expiring, so a slow PUT doesn't start with a dying signature.
const EXPIRY_MARGIN_MS = 60_000;

export function useUploadFiles() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<UploadItem[]>([]);
  const targets = useRef(new Map<string, Target>());
  const files = useRef(new Map<string, File>());
  const lastError = useRef(new Map<string, unknown>());
  const options = useRef<UploadOptions | null>(null);

  const isUploading = items.some((item) => item.status === "uploading");

  useEffect(() => {
    if (!isUploading) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = ""; // older browsers
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isUploading]);

  const patch = useCallback((key: string, changes: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    );
  }, []);

  const uploadOne = useCallback(
    async (key: string, reuseTarget: boolean): Promise<boolean> => {
      const file = files.current.get(key);
      const opts = options.current;
      if (!file || !opts) return false;
      patch(key, { status: "uploading", progress: 0, error: undefined });
      try {
        let target = reuseTarget ? targets.current.get(key) : undefined;
        if (!target) {
          targets.current.delete(key);
          const presigned = await requestPresignedUploads(
            [
              {
                fileName: file.name,
                contentType: file.type,
                fileSize: file.size,
                checklist: opts.checklist,
                advisorId: opts.advisorId,
              },
            ],
            opts.processingMode,
          );
          const upload = presigned.uploads[0];
          if (!upload) throw new Error("Server did not return an upload target");
          target = {
            presignedUrl: upload.presignedUrl,
            expiresAt: Date.now() + upload.expiresIn * 1000,
          };
          targets.current.set(key, target);
        }
        await putToS3(target.presignedUrl, file, file.type, (progress) => patch(key, { progress }));
        lastError.current.delete(key);
        patch(key, { status: "done", progress: 1 });
        return true;
      } catch (error) {
        lastError.current.set(key, error);
        patch(key, {
          status: "failed",
          error: error instanceof Error ? error.message : "Upload failed",
        });
        return false;
      }
    },
    [patch],
  );

  const start = useCallback(
    async (picked: File[], opts: UploadOptions) => {
      options.current = opts;
      targets.current.clear();
      files.current.clear();
      lastError.current.clear();
      const created = picked.map((file, index) => ({
        key: `${index}-${file.name}`,
        file,
        status: "uploading" as const,
        progress: 0,
      }));
      for (const item of created) files.current.set(item.key, item.file);
      setItems(created);

      const results = await Promise.all(created.map((item) => uploadOne(item.key, false)));
      const succeeded = results.filter(Boolean).length;
      if (succeeded > 0) queryClient.invalidateQueries({ queryKey: MEDIA_ASSETS_QUERY_KEY });
      return { succeeded, failed: results.length - succeeded };
    },
    [queryClient, uploadOne],
  );

  const retry = useCallback(
    async (key: string) => {
      const target = targets.current.get(key);
      const previous = lastError.current.get(key);
      const rejected = previous instanceof S3UploadError && previous.status === 403;
      const reuse = !!target && !rejected && Date.now() < target.expiresAt - EXPIRY_MARGIN_MS;
      const ok = await uploadOne(key, reuse);
      if (ok) queryClient.invalidateQueries({ queryKey: MEDIA_ASSETS_QUERY_KEY });
      return ok;
    },
    [queryClient, uploadOne],
  );

  const reset = useCallback(() => {
    setItems([]);
    targets.current.clear();
    files.current.clear();
    lastError.current.clear();
    options.current = null;
  }, []);

  return { items, isUploading, start, retry, reset };
}
