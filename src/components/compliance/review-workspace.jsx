import { useMemo, useRef, useState } from "react";
import { useAnalysis } from "../../data/calls.js";
import { labelSpansByVerdict, segmentTranscript, segmentTone, verdictIcon, verdictTone } from "../../lib/transcript.js";
import { formatClock, segmentAtTime, segmentTime } from "../../lib/audio.js";
import Badge from "../shared/badge.jsx";
import Button from "../shared/button.jsx";
import AudioPlayer from "./audio-player.jsx";

/** Stable identity for one cited span, so a single span can be highlighted alone. */
const spanKey = (span) => `${span.checklist_id}:${span.start}:${span.end}`;

/**
 * The officer's working screen: the analysed transcript and the AI's answer to
 * each checklist question on the left, the evidence behind the selected answer
 * and the reviewer's own decision on the right.
 *
 * Everything shown here comes from one AI service response. The two panes are
 * linked by highlight: hovering a finding lights up the transcript it cited, and
 * hovering a cited passage lights up the finding that cited it.
 */
export default function ReviewWorkspace({ callId, onBack }) {
  const { title, transcript, findings, spans, report, summary } = useAnalysis(callId);
  const [activeId, setActiveId] = useState(findings[0]?.checklist_id ?? "");
  const [hover, setHover] = useState(null);
  const [decision, setDecision] = useState("");
  const audio = useRef(null);
  const [duration, setDuration] = useState(NaN);
  const [playhead, setPlayhead] = useState(0);

  const cited = useMemo(() => labelSpansByVerdict(spans, findings), [spans, findings]);
  const segments = useMemo(() => segmentTranscript(transcript, cited), [transcript, cited]);
  const citedCount = (label) => cited.filter((span) => span.label === label).length;
  // Seeking needs a duration, which only exists once the recording's metadata loads.
  const timeOf = (segment) => segmentTime(segment, transcript.length, duration);
  const speaking = segmentAtTime(segments, transcript.length, duration, playhead);
  const estimated = segments.some((segment) => timeOf(segment)?.estimated);

  const playFrom = (segment) => {
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
  const highlight = hover ?? { checklistId: activeId };
  const litSpan = (segment) => segment.spans.find((span) =>
    highlight.spanKey ? spanKey(span) === highlight.spanKey : span.checklist_id === highlight.checklistId);

  const pin = (id) => { setActiveId(id); setDecision(""); };
  const context = [report.business_area, report.risk_level && `${report.risk_level} risk`, `${summary.total} checklist questions`]
    .filter(Boolean).join(" · ");

  if (!active) return <p className="subtle">This analysis returned no checklist findings.</p>;

  return <>
    <section className="heading"><div><button className="back" onClick={onBack}>← Review queue</button><h1>{title}</h1><p>Validate AI-generated checklist answers against the passages they were drawn from.</p></div><div className="actions"><Button onClick={onBack}>Back to queue</Button><Button variant="primary">Approve current review</Button></div></section>

    <section className="review-layout">
      <article className="card padded">
        <div className="call-head">
          <div>
            <Badge tone={summary.requires_review ? "risk" : "good"}>{summary.requires_review ? "Requires review" : "Cleared"}</Badge>
            <h2>Call detail</h2>
            <p>{context}</p>
          </div>
          <div className="actions">
            <Badge tone="good">{summary.pass} pass</Badge>
            <Badge tone="risk">{summary.fail} fail</Badge>
            <Badge tone="watch">{summary.unclear} unclear</Badge>
          </div>
        </div>

        <AudioPlayer src={report.audio_url ?? null} audioRef={audio} onTime={setPlayhead} onDuration={setDuration}/>
        <div className="rule-heading"><h2>Transcript</h2><p>{citedCount("compliant")} compliant and {citedCount("violation")} violation {citedCount("violation") === 1 ? "passage" : "passages"} were cited. Hover a passage to see which question it answered{Number.isFinite(duration) ? ", or click it to play from there" : ""}.{estimated && " Passage times are estimated from position in the transcript."}</p></div>
        <div className="evidence transcript">{segments.map((segment) => {
          // A passage cited by more than one question rests on its worst label, but
          // takes the label of whichever finding is lighting it up.
          const lit = litSpan(segment);
          const tone = lit?.label ?? segmentTone(segment);
          if (!segment.spans.length) return <span key={segment.start}>{segment.text}</span>;
          const cited = segment.spans.map((span) => questions[span.checklist_id] ?? span.checklist_id);
          return <mark
            key={segment.start}
            className={`span ${tone} ${lit ? "on" : ""}`}
            tabIndex="0"
            title={cited.join("\n")}
            onMouseEnter={() => setHover({ checklistId: segment.spans[0].checklist_id })}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover({ checklistId: segment.spans[0].checklist_id })}
            onBlur={() => setHover(null)}
            onClick={() => { pin(segment.spans[0].checklist_id); playFrom(segment); }}
          >{segment.text}</mark>;
        })}</div>

        <div className="rule-heading"><h2>AI checklist assessment</h2><p>Select an item to inspect its evidence and change the outcome if required.</p></div>
        {findings.map(({ checklist_id: id, question, verdict, confidence, reason }) => <button
          className={`result finding ${activeId === id ? "selected" : ""} ${hover && highlight.checklistId !== id ? "dim" : ""}`}
          key={id}
          onMouseEnter={() => setHover({ checklistId: id })}
          onMouseLeave={() => setHover(null)}
          onClick={() => pin(id)}
        >
          <i className={verdictTone(verdict)}>{verdictIcon(verdict)}</i>
          <span><b>{question}</b><small>{reason}</small></span>
          <Badge tone={verdictTone(verdict)}>{verdict} · {confidence}</Badge>
        </button>)}
      </article>

      <aside className="card padded">
        <Badge tone={verdictTone(active.verdict)}>AI verdict: {active.verdict} · {active.confidence} confidence</Badge>
        <h3>{active.question}</h3>
        <p className="subtle">{active.reason}</p>

        <h3>Quoted evidence</h3>
        <div className="evidence">“{active.evidence_quote}”</div>
        <span className="timestamp">{active.timestamp ?? active.chunk_id}</span>

        <h3>Cited passages</h3>
        <div className="actions">{labelSpansByVerdict(active.spans, findings).map((span) => <button
          className={`span-chip ${span.label}`}
          key={spanKey(span)}
          onMouseEnter={() => setHover({ checklistId: span.checklist_id, spanKey: spanKey(span) })}
          onMouseLeave={() => setHover(null)}
        >{span.label} · {span.chunk_id} · {span.start}–{span.end}</button>)}</div>

        <div className="rule-heading"><h3>Retrieved evidence</h3><p>Chunks the retriever surfaced for this question, most relevant first.</p></div>
        {[...active.retrieved_evidence].sort((a, b) => b.score - a.score).map((chunk) => <div className="retrieved" key={chunk.chunk_id}>
          <div><b>{chunk.chunk_id}</b><span>{chunk.score.toFixed(4)}</span></div>
          <small>{chunk.text}</small>
        </div>)}

        <div className="rule-heading"><h3>Reviewer decision</h3><div className="actions"><Button variant={decision === "Pass" ? "primary" : undefined} onClick={() => setDecision("Pass")}>Pass</Button><Button variant="danger" ghost={decision !== "Fail"} onClick={() => setDecision("Fail")}>Confirm fail</Button><Button variant={decision === "Unclear" ? "primary" : undefined} onClick={() => setDecision("Unclear")}>Unclear</Button></div><textarea placeholder="Add an optional review note…"/></div>
        <p className="subtle">Your decision, note, and the cited passage become part of the final compliance report.</p>
      </aside>
    </section>
  </>;
}
