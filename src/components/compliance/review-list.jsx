import { useAnalysisList } from "../../data/calls.js";
import Badge from "../shared/badge.jsx";

/**
 * The queue of analysed calls. One row per AI service response; opening a row
 * hands the officer that call's checklist and transcript.
 */
export default function ReviewList({ onOpen }) {
  const calls = useAnalysisList();

  if (!calls.length) return <p className="subtle">No analyses have been returned yet.</p>;

  return <div className="card">{calls.map(({ id, title, context, preview, risk, summary, hasAudio }) =>
    <button className="call-row" key={id} onClick={() => onOpen(id)}>
      <span className="call-main">
        <b>{title}</b>
        <small>{context}{hasAudio ? " · recording attached" : ""}</small>
        <em>{preview}…</em>
      </span>
      <span className="call-counts">
        {summary.pass > 0 && <Badge tone="good">{summary.pass} pass</Badge>}
        {summary.fail > 0 && <Badge tone="risk">{summary.fail} fail</Badge>}
        {summary.unclear > 0 && <Badge tone="watch">{summary.unclear} unclear</Badge>}
      </span>
      <Badge tone={risk.tone}>{risk.label}</Badge>
    </button>)}
  </div>;
}
