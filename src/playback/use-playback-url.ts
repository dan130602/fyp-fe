// A presigned URL is a bearer credential: only fetched once an asset is actually selected.
import { useQuery } from "@tanstack/react-query";
import { getPlaybackUrl, listMediaAssets } from "./playback-api.ts";

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

// Logged-out or errored callers still see the mock queue, so this never retries or throws.
export function useMediaAssetList() {
  return useQuery({
    queryKey: ["mediaAssets"],
    queryFn: listMediaAssets,
    retry: false,
  });
}
