import { apiGet } from "../lib/api-client.ts";

export type MediaAssetStatus = "PENDING" | "UPLOADED";

/** Mirrors the backend's media asset response DTO; `objectKey` is deliberately never returned. */
export interface MediaAsset {
  id: string;
  originalFilename: string;
  contentType: string;
  fileSizeBytes: number;
  status: MediaAssetStatus;
  createdAt: string;
}

/** `expiresIn` is seconds, not milliseconds. */
export interface PlaybackUrl {
  url: string;
  expiresIn: number;
}

export function listMediaAssets(): Promise<MediaAsset[]> {
  return apiGet<MediaAsset[]>("/api/media-assets");
}

export function getPlaybackUrl(id: string): Promise<PlaybackUrl> {
  return apiGet<PlaybackUrl>(`/api/media-assets/${id}/playback-url`);
}
