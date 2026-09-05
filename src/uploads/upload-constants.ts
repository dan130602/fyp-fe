// Mirrors app.upload.* in the backend's application.properties; keep both in step.
export const MAX_FILE_SIZE_BYTES = 104_857_600; // 100 MB
export const MAX_FILES_PER_REQUEST = 10;
export const ALLOWED_CONTENT_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
] as const;
export const ALLOWED_EXTENSIONS = ["mp3", "wav", "m4a"] as const;
