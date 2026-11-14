// A presigned URL is a bearer credential: only fetched once an asset is actually selected.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMediaAssetAnalysis,
  getPlaybackUrl,
  listMediaAssets,
  type MediaAsset,
  type ReviewOverrideInput,
  submitReview,
} from "./playback-api.ts";

// Margin taken off the server's own expiry, so a cached URL goes stale before it
// would actually fail at the player. ~10 minutes off a 60-minute default.
const STALE_TIME_MARGIN_MS = 10 * 60 * 1000;

// Used only until the first response arrives (queryFn has no data to derive from
// yet). Server default expiry is 3600s; 3000s (50 min) sits safely under it.
const FALLBACK_STALE_TIME_MS = 3000 * 1000;

export function usePlaybackUrl(mediaAssetId: string | undefined) {
  return useQuery({
    queryKey: ["playbackUrl", mediaAssetId],
    queryFn: () => getPlaybackUrl(mediaAssetId as string),
    enabled: Boolean(mediaAssetId),
    staleTime: (query) => {
      const expiresIn = query.state.data?.expiresIn;
      if (!expiresIn) return FALLBACK_STALE_TIME_MS;
      return Math.max(expiresIn * 1000 - STALE_TIME_MARGIN_MS, 0);
    },
  });
}

const IMMEDIATE_POLL_MS = 10 * 1000;
// Batch items sit unchanged until the 8pm run, so there is no point polling fast.
const BATCH_POLL_MS = 5 * 60 * 1000;

export function listPollInterval(assets: MediaAsset[] | undefined): number | false {
  const open = (assets ?? []).filter((a) => a.status !== "COMPLETED" && a.status !== "FAILED");
  if (open.some((a) => a.processingMode !== "batch")) return IMMEDIATE_POLL_MS;
  return open.length > 0 ? BATCH_POLL_MS : false;
}

export const MEDIA_ASSETS_QUERY_KEY = ["mediaAssets"] as const;

// Logged-out or errored callers still see the mock queue, so this never retries or throws.
export function useMediaAssetList() {
  return useQuery({
    queryKey: MEDIA_ASSETS_QUERY_KEY,
    queryFn: listMediaAssets,
    retry: false,
    refetchInterval: (query) => listPollInterval(query.state.data),
  });
}

/** Batch audio is deleted once processing completes, so batch assets have no playback. */
export function useIsBatchAsset(mediaAssetId: string | undefined) {
  const { data } = useMediaAssetList();
  return data?.find((asset) => asset.id === mediaAssetId)?.processingMode === "batch";
}

const ANALYSIS_POLL_MS = 15000;

export function useMediaAssetAnalysis(mediaAssetId: string) {
  return useQuery({
    queryKey: ["mediaAssetAnalysis", mediaAssetId],
    queryFn: () => getMediaAssetAnalysis(mediaAssetId),
    refetchInterval: (query) =>
      query.state.data?.analysisStatus === "PENDING" ? ANALYSIS_POLL_MS : false,
  });
}

export function useSubmitReview(mediaAssetId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (overrides: ReviewOverrideInput[]) => submitReview(mediaAssetId, overrides),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["mediaAssetAnalysis", mediaAssetId] }),
  });
}
