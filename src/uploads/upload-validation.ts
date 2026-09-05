// Fast client-side feedback only; the server re-validates and is authoritative.
import {
  ALLOWED_CONTENT_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
} from "./upload-constants.ts";

export type ValidationResult = { ok: true } | { ok: false; reason: string };

function extractExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === fileName.length - 1) return "";
  return fileName.slice(dotIndex + 1).toLowerCase();
}

// Extension and content type are checked independently, mirroring PresignedUrlService.validateFile.
export function validateFile(file: File): ValidationResult {
  const contentType = file.type.toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.includes(contentType as (typeof ALLOWED_CONTENT_TYPES)[number])) {
    return {
      ok: false,
      reason: `File type '${file.type || "unknown"}' is not supported. Use MP3, WAV, or M4A.`,
    };
  }

  const extension = extractExtension(file.name);
  if (
    !extension ||
    !ALLOWED_EXTENSIONS.includes(extension as (typeof ALLOWED_EXTENSIONS)[number])
  ) {
    return {
      ok: false,
      reason: `File extension for '${file.name}' is not supported. Use .mp3, .wav, or .m4a.`,
    };
  }

  if (file.size <= 0) {
    return { ok: false, reason: `'${file.name}' is empty.` };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const maxMb = Math.floor(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    return { ok: false, reason: `'${file.name}' exceeds the maximum size of ${maxMb} MB.` };
  }

  return { ok: true };
}
