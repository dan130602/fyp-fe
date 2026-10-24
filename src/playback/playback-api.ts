import type { Advisor } from "../advisors/advisors-api.ts";
import type { PipelineOutput, PipelineStatus } from "../data/pipeline-output.ts";
import { apiGet, apiPut } from "../lib/api-client.ts";
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
  /** Null for recordings uploaded before advisor selection existed. */
  advisor: Advisor | null;
}

/** `expiresIn` is seconds, not milliseconds. */
export interface PlaybackUrl {
  url: string;
  expiresIn: number;
}

export type AnalysisStatus = "PENDING" | "READY" | "FAILED";

/** One question where the officer's decision differs from the AI's; `aiVerdict` is a server-side snapshot. */
export interface ReviewOverride {
  checklistItemId: string;
  aiVerdict: PipelineStatus;
  decision: PipelineStatus;
  comment: string;
}

/** `reviewedAt` is ISO-8601 with an offset. An empty `overrides` means the AI was approved as-is. */
export interface ChecklistReview {
  reviewedBy: string;
  reviewedAt: string;
  overrides: ReviewOverride[];
}

/** What the client sends per override; the backend fills in `aiVerdict`. */
export type ReviewOverrideInput = Pick<ReviewOverride, "checklistItemId" | "decision" | "comment">;

/** Mirrors the backend's MediaAssetAnalysisResponse; `result` is null unless `analysisStatus` is READY. */
export interface MediaAssetAnalysis {
  mediaAssetId: string;
  fileName: string;
  assetStatus: MediaAssetStatus;
  analysisStatus: AnalysisStatus;
  failureReason: string | null;
  result: PipelineOutput | null;
  /** Null until an officer submits a review. */
  review: ChecklistReview | null;
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

export function submitReview(
  id: string,
  overrides: ReviewOverrideInput[],
): Promise<ChecklistReview> {
  return apiPut<ChecklistReview>(`/api/media-assets/${id}/review`, { overrides });
}
