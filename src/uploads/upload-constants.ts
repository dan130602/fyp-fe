// Mirrors app.upload.* in the backend's application.properties; keep both in step.
export const MAX_FILE_SIZE_BYTES = 104_857_600; // 100 MB
export const MAX_FILES_PER_REQUEST = 10;
// UI cap only: each file is presigned in its own request, so MAX_FILES_PER_REQUEST does not bind.
export const MAX_FILES_PER_UPLOAD = 5;
export const ALLOWED_CONTENT_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
] as const;
export const ALLOWED_EXTENSIONS = ["mp3", "wav", "m4a"] as const;
