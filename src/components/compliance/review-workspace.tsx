import type { ComponentType, ReactNode, RefObject } from "react";
import { useMemo, useRef, useState } from "react";
import { useAnalysis } from "../../data/calls.ts";
import { segmentAtTime, segmentTime } from "../../lib/audio.ts";
import type { Segment, Span } from "../../lib/transcript.ts";
import {
  labelSpansByVerdict,
  segmentTone,
  segmentTranscript,
  verdictIcon,
  verdictTone,
} from "../../lib/transcript.ts";
import { usePlaybackUrl } from "../../playback/use-playback-url.ts";
import Badge from "../shared/badge.jsx";
import UntypedButton from "../shared/button.jsx";
import { Skeleton } from "../ui/skeleton.tsx";
import UntypedAudioPlayer from "./audio-player.jsx";

// button.jsx and audio-player.jsx are plain JS (out of migration scope): TS
// infers their optional props as required from the undefaulted destructure, so
// they are recast here to the shape the JS actually accepts at runtime.
interface ButtonProps {
  variant?: "primary" | "danger";
  ghost?: boolean;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
}
const Button = UntypedButton as ComponentType<ButtonProps>;

interface AudioPlayerProps {
  src: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  onTime?: (time: number) => void;
  onDuration?: (duration: number) => void;
}
const AudioPlayer = UntypedAudioPlayer as ComponentType<AudioPlayerProps>;

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
  const { data: playback } = usePlaybackUrl(mediaAssetId);

  return (
    <>
      <section className="heading">
        <div>
          <button className="back" onClick={onBack}>
            ← Review queue
          </button>
          <h1>Recording</h1>
          <p>This recording has not been analysed yet.</p>
        </div>
        <div className="actions">
          <Button onClick={onBack}>Back to queue</Button>
        </div>
      </section>
      <section className="review-layout" aria-busy="true" role="status">
        <article className="card padded">
          <AudioPlayer src={playback?.url ?? null} audioRef={audio} />
          <p className="subtle">
            <strong>Analysis in progress.</strong> Check back once the compliance pipeline has
            processed this recording.
          </p>
          <div className="rule-heading">
            <h2>Transcript</h2>
          </div>
          <TranscriptSkeleton />
        </article>

        <aside className="card padded">
          <div className="rule-heading">
            <h2>AI checklist assessment</h2>
          </div>
          <ChecklistSkeleton />
        </aside>
      </section>
    </>
  );
}

/**
 * The officer's working screen: the analysed transcript and the AI's answer to
 * each checklist question on the left, the evidence behind the selected answer
 * and the reviewer's own decision on the right.
 *
 * Everything shown here comes from one AI service response. The two panes are
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
  const isRecording = callId?.startsWith(MEDIA_ID_PREFIX);
  if (isRecording) {
    return (
      <RecordingInProgress mediaAssetId={callId.slice(MEDIA_ID_PREFIX.length)} onBack={onBack} />
    );
  }

  return <AnalysisWorkspace callId={callId} onBack={onBack} mediaAssetId={mediaAssetId} />;
}

/** The existing analysis workspace, unchanged, for mock and future real analyses. */
function AnalysisWorkspace({
  callId,
  onBack,
  mediaAssetId,
}: {
  callId: string;
  onBack: () => void;
  mediaAssetId?: string;
}) {
  const analysis = useAnalysis(callId);
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
  const [decision, setDecision] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(NaN);
  const [playhead, setPlayhead] = useState(0);
  const { data: playback } = usePlaybackUrl(mediaAssetId);

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

  const pin = (id: string) => {
    setActiveId(id);
    setDecision("");
  };
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
          <button className="back" onClick={onBack}>
            ← Review queue
          </button>
          <h1>{title}</h1>
          <p>Validate AI-generated checklist answers against the passages they were drawn from.</p>
        </div>
        <div className="actions">
          <Button onClick={onBack}>Back to queue</Button>
          <Button variant="primary">Approve current review</Button>
        </div>
      </section>

      <section className="review-layout">
        <article className="card padded">
          <div className="call-head">
            <div>
              <Badge tone={summary.requires_review ? "risk" : "good"}>
                {summary.requires_review ? "Requires review" : "Cleared"}
              </Badge>
              <h2>Call detail</h2>
              <p>{context}</p>
            </div>
            <div className="actions">
              <Badge tone="good">{summary.pass} pass</Badge>
              <Badge tone="risk">{summary.fail} fail</Badge>
              <Badge tone="watch">{summary.unclear} unclear</Badge>
            </div>
          </div>

          <AudioPlayer
            src={playback?.url ?? null}
            audioRef={audio}
            onTime={setPlayhead}
            onDuration={setDuration}
          />
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
          <div className="evidence transcript">
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
                <mark
                  key={segment.start}
                  className={`span ${tone} ${lit ? "on" : ""}`}
                  tabIndex={0}
                  title={citedQuestions.join("\n")}
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
                </mark>
              );
            })}
          </div>

          <div className="rule-heading">
            <h2>AI checklist assessment</h2>
            <p>Select an item to inspect its evidence and change the outcome if required.</p>
          </div>
          {findings.map(({ checklist_id: id, question, verdict, confidence, reason }) => (
            <button
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
              <Badge tone={verdictTone(verdict)}>
                {verdict} · {confidence}
              </Badge>
            </button>
          ))}
        </article>

        <aside className="card padded">
          <Badge tone={verdictTone(active.verdict)}>
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

          <div className="rule-heading">
            <h3>Reviewer decision</h3>
            <div className="actions">
              <Button
                variant={decision === "Pass" ? "primary" : undefined}
                onClick={() => setDecision("Pass")}
              >
                Pass
              </Button>
              <Button
                variant="danger"
                ghost={decision !== "Fail"}
                onClick={() => setDecision("Fail")}
              >
                Confirm fail
              </Button>
              <Button
                variant={decision === "Unclear" ? "primary" : undefined}
                onClick={() => setDecision("Unclear")}
              >
                Unclear
              </Button>
            </div>
            <textarea placeholder="Add an optional review note…" />
          </div>
          <p className="subtle">
            Your decision, note, and the cited passage become part of the final compliance report.
          </p>
        </aside>
      </section>
    </>
  );
}
