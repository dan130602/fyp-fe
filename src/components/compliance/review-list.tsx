import { Badge } from "@/components/ui/badge.tsx";
import { useAnalysisList } from "../../data/calls.ts";
import { useMediaAssetList } from "../../playback/use-playback-url.ts";

/** Real media-asset ids are UUIDs from the backend; this prefix keeps them out of that space. */
const MEDIA_ID_PREFIX = "media:";

type CallRow = ReturnType<typeof useAnalysisList>[number] & { isRecording: false };
type RecordingRow = ReturnType<typeof useMediaAssetRows>[number];
type ReviewRow = CallRow | RecordingRow;

/** A readable size for a recording that has no analysis yet. */
function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes)) return "";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

/** One row per uploaded recording, none of them analysed yet. */
function useMediaAssetRows() {
  const { data: assets } = useMediaAssetList();
  return (assets ?? []).map((asset) => ({
    id: `${MEDIA_ID_PREFIX}${asset.id}`,
    mediaAssetId: asset.id,
    isRecording: true as const,
    title: asset.originalFilename,
    context: formatFileSize(asset.fileSizeBytes),
  }));
}

/**
 * The queue of analysed calls plus the officer's own uploaded recordings that
 * have no analysis yet. Opening a mock row hands over its checklist and
 * transcript; opening a recording row hands over just its media asset id.
 */
export default function ReviewList({ onOpen }: { onOpen: (id: string) => void }) {
  const calls = useAnalysisList().map((call) => ({ ...call, isRecording: false as const }));
  const recordings = useMediaAssetRows();
  const rows: ReviewRow[] = [...calls, ...recordings];

  if (!rows.length) return <p className="subtle">No analyses have been returned yet.</p>;

  return (
    <div className="card">
      {rows.map((row) =>
        row.isRecording ? (
          <button type="button" className="call-row" key={row.id} onClick={() => onOpen(row.id)}>
            <span className="call-main">
              <b>{row.title}</b>
              <small>{row.context} · recording attached</small>
              <em>Analysis in progress…</em>
            </span>
            <Badge variant="watch">Awaiting analysis</Badge>
          </button>
        ) : (
          <button type="button" className="call-row" key={row.id} onClick={() => onOpen(row.id)}>
            <span className="call-main">
              <b>{row.title}</b>
              <small>
                {row.context}
                {row.hasAudio ? " · recording attached" : ""}
              </small>
              <em>{row.preview}…</em>
            </span>
            <span className="call-counts">
              {row.summary.pass > 0 && <Badge variant="good">{row.summary.pass} pass</Badge>}
              {row.summary.fail > 0 && <Badge variant="risk">{row.summary.fail} fail</Badge>}
              {row.summary.unclear > 0 && (
                <Badge variant="watch">{row.summary.unclear} unclear</Badge>
              )}
            </span>
            <Badge variant={row.risk.tone}>{row.risk.label}</Badge>
          </button>
        ),
      )}
    </div>
  );
}
