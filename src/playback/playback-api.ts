import type { PipelineOutput } from "../data/pipeline-output.ts";
import { apiGet } from "../lib/api-client.ts";
import type { ProcessingMode } from "../uploads/upload-api.ts";

// QUEUED and PROCESSING only occur for batch assets.
export type MediaAssetStatus = "PENDING" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

/** Mirrors the backend's media asset response DTO; `objectKey` is deliberately never returned. */
export interface MediaAsset {
  id: string;
  originalFilename: string;
  contentType: string;
  fileSizeBytes: number;
  status: MediaAssetStatus;
  processingMode: ProcessingMode;
  createdAt: string;
}

/** `expiresIn` is seconds, not milliseconds. */
export interface PlaybackUrl {
  url: string;
  expiresIn: number;
}

export type AnalysisStatus = "PENDING" | "READY" | "FAILED";

/** Mirrors the backend's MediaAssetAnalysisResponse; `result` is null unless `analysisStatus` is READY. */
export interface MediaAssetAnalysis {
  mediaAssetId: string;
  fileName: string;
  assetStatus: MediaAssetStatus;
  analysisStatus: AnalysisStatus;
  failureReason: string | null;
  result: PipelineOutput | null;
}

export function listMediaAssets(): Promise<MediaAsset[]> {
  return apiGet<MediaAsset[]>("/api/media-assets");
}

export function getPlaybackUrl(id: string): Promise<PlaybackUrl> {
  return apiGet<PlaybackUrl>(`/api/media-assets/${id}/playback-url`);
}

export function getMediaAssetAnalysis(id: string): Promise<MediaAssetAnalysis> {
  return apiGet<MediaAssetAnalysis>(`/api/media-assets/${id}/analysis`);
}
