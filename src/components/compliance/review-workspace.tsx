import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useAnalysis } from "../../data/calls.ts";
import type { PipelineStatus } from "../../data/pipeline-output.ts";
import { toAnalysisView, VERDICTS } from "../../data/pipeline-output.ts";
import { segmentAtTime, segmentTime } from "../../lib/audio.ts";
import {
  buildOverrides,
  chooseDecision,
  hasBlankComment,
  seedDrafts,
  setComment,
} from "../../lib/review-drafts.ts";
import type { Segment, Span } from "../../lib/transcript.ts";
import {
  labelSpansByVerdict,
  segmentTone,
  segmentTranscript,
  verdictIcon,
  verdictTone,
} from "../../lib/transcript.ts";
import type { ChecklistReview } from "../../playback/playback-api.ts";
import {
  useIsBatchAsset,
  useMediaAssetAnalysis,
  usePlaybackUrl,
  useSubmitReview,
} from "../../playback/use-playback-url.ts";
import { Skeleton } from "../ui/skeleton.tsx";
import AudioPlayer from "./audio-player.tsx";
import ReviewConfirmDialog from "./review-confirm-dialog.tsx";

/** Stable identity for one cited span, so a single span can be highlighted alone. */
const spanKey = (span: Span) => `${span.checklist_id}:${span.start}:${span.end}`;

/** Same prefix review-list.tsx marks a real recording's row id with. */
const MEDIA_ID_PREFIX = "media:";

/** Varying widths so the placeholder reads as text, not a grid of identical bars. */
const TRANSCRIPT_LINE_WIDTHS = ["94%", "88%", "97%", "62%", "91%", "80%", "95%", "70%"];
const CHECKLIST_ROW_WIDTHS = ["82%", "68%", "90%", "75%"];

/** Placeholder lines shaped like the transcript pane, so layout does not jump on load. */
function TranscriptSkeleton() {
  return (
    <div className="evidence transcript">
      {TRANSCRIPT_LINE_WIDTHS.map((width) => (
        <Skeleton key={`transcript-line-${width}`} className="h-3 mb-2" style={{ width }} />
      ))}
    </div>
  );
}

/** Placeholder rows shaped like the checklist findings list. */
function ChecklistSkeleton() {
  return (
    <>
      {CHECKLIST_ROW_WIDTHS.map((width) => (
        <div className="result finding" key={`checklist-row-${width}`}>
          <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
          <span>
            <Skeleton className="h-3 mb-2" style={{ width }} />
            <Skeleton className="h-3 w-1/3" />
          </span>
        </div>
      ))}
    </>
  );
}

/** Reviewer buttons, in the pipeline vocabulary the backend stores. */
const DECISIONS: { status: PipelineStatus; label: string }[] = [
  { status: "PASS", label: "Pass" },
  { status: "FAIL", label: "Fail" },
  { status: "CANNOT_DETERMINE", label: "Unclear" },
];

type AnalysisView = NonNullable<ReturnType<typeof useAnalysis>>;

/** Which finding is lit up: hover always wins over the pinned selection. */
interface Highlight {
  checklistId: string;
  spanKey?: string;
}

/**
 * A recording that has no analysis yet: the player plus a skeleton shaped like
 * AnalysisWorkspace's two-pane layout, so nothing jumps once analysis lands.
 */
function RecordingInProgress({
  mediaAssetId,
  onBack,
}: {
  mediaAssetId: string;
  onBack: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const isBatch = useIsBatchAsset(mediaAssetId);
  const { data: playback } = usePlaybackUrl(isBatch ? undefined : mediaAssetId);

  return (
    <>
      <section className="heading">
        <div>
          <Button variant="ghost" size="xs" className="mb-2 self-start" onClick={onBack}>
            ← Review queue
          </Button>
          <h1>Recording</h1>
          <p>This recording has not been analysed yet.</p>
        </div>
        <div className="actions">
          <Button variant="outline" onClick={onBack}>
            Back to queue
          </Button>
        </div>
      </section>
      <section className="review-layout" aria-busy="true" role="status">
        <article className="card padded">
          {!isBatch && <AudioPlayer src={playback?.url ?? null} audioRef={audio} />}
          <p className="subtle">
            <strong>Analysis in progress.</strong> Check back once the compliance pipeline has
            processed this recording.
            {isBatch && " Batch jobs run at 8pm SGT on weekdays."}
          </p>
          <div className="rule-heading">
            <h2>Transcript</h2>
          </div>
          <TranscriptSkeleton />
        </article>

        <section className="card padded">
          <div className="rule-heading">
            <h2>AI checklist assessment</h2>
          </div>
          <ChecklistSkeleton />
        </section>
      </section>
    </>
  );
}

/**
 * The officer's working screen: the analysed transcript on the left; on the right,
 * the AI's answer to each checklist question above the evidence behind the selected
 * answer and the reviewer's own decision.
 *
 * Everything shown here comes from one AI service response. The transcript and checklist are
 * linked by highlight: hovering a finding lights up the transcript it cited, and
 * hovering a cited passage lights up the finding that cited it.
 *
 * `mediaAssetId` is which recording (if any) belongs to this analysis. Nothing
 * currently links the two — see Current Gaps.md — so callers leave it unset and
 * the player honestly shows "No recording attached".
 */
export default function ReviewWorkspace({
  callId,
  onBack,
  mediaAssetId,
}: {
  callId: string;
  onBack: () => void;
  mediaAssetId?: string;
}) {
  if (callId?.startsWith(MEDIA_ID_PREFIX)) {
    return (
      <RecordingWorkspace mediaAssetId={callId.slice(MEDIA_ID_PREFIX.length)} onBack={onBack} />
    );
  }

  return <MockWorkspace callId={callId} onBack={onBack} mediaAssetId={mediaAssetId} />;
}

function MockWorkspace({
  callId,
  onBack,
  mediaAssetId,
}: {
  callId: string;
  onBack: () => void;
  mediaAssetId?: string;
}) {
  const analysis = useAnalysis(callId);
  return <AnalysisWorkspace analysis={analysis} onBack={onBack} mediaAssetId={mediaAssetId} />;
}

/** A real recording: in-progress, failed, or the analysis fetched from the backend. */
function RecordingWorkspace({
  mediaAssetId,
  onBack,
}: {
  mediaAssetId: string;
  onBack: () => void;
}) {
  const { data, isError, error, refetch } = useMediaAssetAnalysis(mediaAssetId);

  if (isError) {
    return (
      <>
        <section className="heading">
          <div>
            <h1>Recording</h1>
          </div>
        </section>
        <p role="alert" className="subtle">
          Could not load the analysis{error instanceof Error ? `: ${error.message}` : "."}
        </p>
        <div className="actions">
          <Button onClick={() => refetch()}>Retry</Button>
          <Button variant="outline" onClick={onBack}>
            Back to queue
          </Button>
        </div>
      </>
    );
  }

  if (data?.analysisStatus === "FAILED") {
    return (
      <>
        <section className="heading">
          <div>
            <h1>{data.fileName}</h1>
          </div>
        </section>
        <p role="alert" className="subtle">
          Analysis failed{data.failureReason ? `: ${data.failureReason}` : "."}
        </p>
        <div className="actions">
          <Button variant="outline" onClick={onBack}>
            Back to queue
          </Button>
        </div>
      </>
    );
  }

  if (data?.analysisStatus === "READY" && data.result) {
    return (
      <AnalysisWorkspace
        analysis={toAnalysisView(data.result, data.fileName)}
        mediaAssetId={mediaAssetId}
        review={data.review}
        onBack={onBack}
      />
    );
  }

  return <RecordingInProgress mediaAssetId={mediaAssetId} onBack={onBack} />;
}

/** The analysis workspace, for mock and real analyses alike. */
function AnalysisWorkspace({
  analysis,
  onBack,
  mediaAssetId,
  review,
}: {
  analysis: AnalysisView | null;
  onBack: () => void;
  mediaAssetId?: string;
  review?: ChecklistReview | null;
}) {
  // useAnalysis returns null only when the analyses corpus is empty (see
  // report: NEW GUARD). Every hook below must still run unconditionally, so
  // the fields it reads are given empty-but-typed fallbacks rather than
  // gating the hooks themselves on `analysis`.
  const { title, transcript, findings, spans, report, summary } = analysis ?? {
    title: "",
    transcript: "",
    findings: [],
    spans: [],
    report: { business_area: null, risk_level: null },
    summary: { total: 0, pass: 0, fail: 0, unclear: 0, requires_review: false },
  };
  const [activeId, setActiveId] = useState(findings[0]?.checklist_id ?? "");
  const [hover, setHover] = useState<Highlight | null>(null);
  const [drafts, setDrafts] = useState(() => seedDrafts(review));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(NaN);
  const [playhead, setPlayhead] = useState(0);
  const isBatch = useIsBatchAsset(mediaAssetId);
  const { data: playback } = usePlaybackUrl(isBatch ? undefined : mediaAssetId);
  const submit = useSubmitReview(mediaAssetId ?? "");

  const overrides = useMemo(() => buildOverrides(findings, drafts), [findings, drafts]);
  const overrideIds = new Set(overrides.map((o) => o.checklistItemId));
  const blankComment = hasBlankComment(overrides);
  // Mock analyses have no recording to review against.
  const canSubmit = Boolean(mediaAssetId);

  const cited = useMemo(() => labelSpansByVerdict(spans, findings), [spans, findings]);
  const segments = useMemo(() => segmentTranscript(transcript, cited), [transcript, cited]);
  const citedCount = (label: string) => cited.filter((span) => span.label === label).length;
  // Seeking needs a duration, which only exists once the recording's metadata loads.
  const timeOf = (segment: Segment) => segmentTime(segment, transcript.length, duration);
  const speaking = segmentAtTime(segments, transcript.length, duration, playhead);
  const estimated = segments.some((segment) => timeOf(segment)?.estimated);
  // `speaking` is computed but not yet consumed anywhere — same as pre-migration.
  void speaking;

  const playFrom = (segment: Segment) => {
    const window = timeOf(segment);
    if (!window || !audio.current) return;
    audio.current.currentTime = window.start;
    audio.current.play().catch(() => {});
  };
  const questions = useMemo(
    () => Object.fromEntries(findings.map((f) => [f.checklist_id, f.question])),
    [findings],
  );

  const active = findings.find((f) => f.checklist_id === activeId) ?? findings[0];
  // Hover always wins over the pinned selection, so the transcript follows the pointer.
  const highlight: Highlight = hover ?? { checklistId: activeId };
  const litSpan = (segment: Segment) =>
    segment.spans.find((span) =>
      highlight.spanKey
        ? spanKey(span) === highlight.spanKey
        : span.checklist_id === highlight.checklistId,
    );

  const pin = (id: string) => setActiveId(id);
  const confirmRows = overrides.map((o) => {
    const finding = findings.find((f) => f.checklist_id === o.checklistItemId);
    return {
      id: o.checklistItemId,
      question: finding?.question ?? o.checklistItemId,
      aiVerdict: finding?.status,
      decision: o.decision,
      comment: o.comment,
    };
  });
  const closeConfirm = (open: boolean) => {
    setConfirmOpen(open);
    if (!open) submit.reset();
  };
  const confirmSubmit = () => submit.mutate(overrides, { onSuccess: () => setConfirmOpen(false) });
  const activeDraft = drafts[active?.checklist_id ?? ""];
  const context = [
    report.business_area,
    report.risk_level && `${report.risk_level} risk`,
    `${summary.total} checklist questions`,
  ]
    .filter(Boolean)
    .join(" · ");

  // NEW GUARD (see report): analysis === null previously reached this point and
  // threw on the destructure above. It now renders the same "nothing to show"
  // message the missing-findings case below already used.
  if (!analysis) return <p className="subtle">No analyses have been returned yet.</p>;
  if (!active) return <p className="subtle">This analysis returned no checklist findings.</p>;

  return (
    <>
      <section className="heading">
        <div>
          <Button variant="ghost" size="xs" className="mb-2 self-start" onClick={onBack}>
            ← Review queue
          </Button>
          <h1>{title}</h1>
          <p>Validate AI-generated checklist answers against the passages they were drawn from.</p>
        </div>
        <div className="actions">
          <Button variant="outline" onClick={onBack}>
            Back to queue
          </Button>
          {review && (
            <span className="subtle">Reviewed {new Date(review.reviewedAt).toLocaleString()}</span>
          )}
          {canSubmit && (
            <Button disabled={blankComment} onClick={() => setConfirmOpen(true)}>
              {overrides.length === 0
                ? "Approve AI review"
                : `Submit review · ${overrides.length} override${overrides.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>
      </section>

      <section className="review-layout">
        <article className="card padded">
          <div className="call-head">
            <div>
              <Badge variant={summary.requires_review ? "risk" : "good"}>
                {summary.requires_review ? "Requires review" : "Cleared"}
              </Badge>
              <h2>Call detail</h2>
              <p>{context}</p>
            </div>
            <div className="actions">
              <Badge variant="good">{summary.pass} pass</Badge>
              <Badge variant="risk">{summary.fail} fail</Badge>
              <Badge variant="watch">{summary.unclear} unclear</Badge>
            </div>
          </div>

          {isBatch ? (
            <p className="subtle">Audio is not kept for batch-processed recordings.</p>
          ) : (
            <AudioPlayer
              src={playback?.url ?? null}
              audioRef={audio}
              onTime={setPlayhead}
              onDuration={setDuration}
            />
          )}
          <div className="rule-heading">
            <h2>Transcript</h2>
            <p>
              {citedCount("compliant")} compliant and {citedCount("violation")} violation{" "}
              {citedCount("violation") === 1 ? "passage" : "passages"} were cited. Hover a passage
              to see which question it answered
              {Number.isFinite(duration) ? ", or click it to play from there" : ""}.
              {estimated && " Passage times are estimated from position in the transcript."}
            </p>
          </div>
          <div className="evidence transcript whitespace-pre-wrap">
            {segments.map((segment) => {
              // A passage cited by more than one question rests on its worst label, but
              // takes the label of whichever finding is lighting it up.
              const lit = litSpan(segment);
              const tone = lit?.label ?? segmentTone(segment);
              if (!segment.spans.length) return <span key={segment.start}>{segment.text}</span>;
              const citedQuestions = segment.spans.map(
                (span) => questions[span.checklist_id] ?? span.checklist_id,
              );
              return (
                // A real <button> inside the <mark>: the mark carries the highlight
                // semantics, the button carries the click, focus and Enter/Space handling.
                <mark key={segment.start} className={`span ${tone} ${lit ? "on" : ""}`}>
                  <button
                    type="button"
                    className="span-button"
                    title={citedQuestions.join("\n")}
                    aria-label={
                      isBatch
                        ? `Cited by: ${citedQuestions.join(", ")}`
                        : `Play the audio cited by: ${citedQuestions.join(", ")}`
                    }
                    onMouseEnter={() => setHover({ checklistId: segment.spans[0].checklist_id })}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover({ checklistId: segment.spans[0].checklist_id })}
                    onBlur={() => setHover(null)}
                    onClick={() => {
                      pin(segment.spans[0].checklist_id);
                      playFrom(segment);
                    }}
                  >
                    {segment.text}
                  </button>
                </mark>
              );
            })}
          </div>
        </article>

        {/* Right column: checklist above the selected item's evaluation, beside the transcript. */}
        <div className="grid content-start gap-5">
          <section className="card padded">
            <div className="rule-heading">
              <h2>AI checklist assessment</h2>
              <p>Select an item to inspect its evidence and change the outcome if required.</p>
            </div>
            <div className="max-h-[28rem] overflow-y-auto overscroll-contain pr-1">
              {findings.map(({ checklist_id: id, question, verdict, confidence, reason }) => {
                const overridden = overrideIds.has(id);
                return (
                  <button
                    type="button"
                    className={`result finding ${activeId === id ? "selected" : ""} ${hover && highlight.checklistId !== id ? "dim" : ""}`}
                    key={id}
                    onMouseEnter={() => setHover({ checklistId: id })}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => pin(id)}
                  >
                    <i className={verdictTone(verdict)}>{verdictIcon(verdict)}</i>
                    <span>
                      <b>{question}</b>
                      <small>{reason}</small>
                    </span>
                    <Badge variant={verdictTone(verdict)}>
                      {verdict} · {confidence}
                    </Badge>
                    {overridden && (
                      <Badge variant="watch">Overridden → {VERDICTS[drafts[id].decision]}</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card padded">
            <Badge variant={verdictTone(active.verdict)}>
              AI verdict: {active.verdict} · {active.confidence} confidence
            </Badge>
            <h3>{active.question}</h3>
            <p className="subtle">{active.reason}</p>

            <h3>Quoted evidence</h3>
            <div className="evidence">"{active.evidence_quote}"</div>
            <span className="timestamp">{active.timestamp ?? active.chunk_id}</span>

            <h3>Cited passages</h3>
            <div className="actions">
              {labelSpansByVerdict(active.spans, findings).map((span) => (
                <button
                  type="button"
                  className={`span-chip ${span.label}`}
                  key={spanKey(span)}
                  onMouseEnter={() =>
                    setHover({ checklistId: span.checklist_id, spanKey: spanKey(span) })
                  }
                  onMouseLeave={() => setHover(null)}
                >
                  {span.label} · {span.chunk_id} · {span.start}–{span.end}
                </button>
              ))}
            </div>

            {active.retrieved_evidence.length > 0 && (
              <>
                <div className="rule-heading">
                  <h3>Retrieved evidence</h3>
                  <p>Chunks the retriever surfaced for this question, most relevant first.</p>
                </div>
                {[...active.retrieved_evidence]
                  .sort((a, b) => b.score - a.score)
                  .map((chunk) => (
                    <div className="retrieved" key={chunk.chunk_id}>
                      <div>
                        <b>{chunk.chunk_id}</b>
                        <span>{chunk.score.toFixed(4)}</span>
                      </div>
                      <small>{chunk.text}</small>
                    </div>
                  ))}
              </>
            )}

            <div className="rule-heading">
              <h3>Reviewer decision</h3>
              <div className="actions">
                {DECISIONS.map(({ status, label }) => {
                  const chosen = (activeDraft?.decision ?? active.status) === status;
                  return (
                    <Button
                      key={status}
                      variant={chosen ? (status === "FAIL" ? "destructive" : "default") : "outline"}
                      aria-pressed={chosen}
                      onClick={() =>
                        setDrafts(
                          chooseDecision(drafts, active.checklist_id, active.status, status),
                        )
                      }
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              <textarea
                placeholder={
                  activeDraft
                    ? "Explain why you disagree with the AI (required)…"
                    : "Choose a different decision to add a comment…"
                }
                value={activeDraft?.comment ?? ""}
                disabled={!activeDraft}
                onChange={(e) => setDrafts(setComment(drafts, active.checklist_id, e.target.value))}
              />
            </div>
            <p className="subtle">
              Questions where your decision differs from the AI, with your comment, are saved when
              you submit the review.
            </p>
          </section>
        </div>
      </section>

      <ReviewConfirmDialog
        open={confirmOpen}
        onOpenChange={closeConfirm}
        overrides={confirmRows}
        pending={submit.isPending}
        error={submit.error?.message ?? null}
        onConfirm={confirmSubmit}
      />
    </>
  );
}
