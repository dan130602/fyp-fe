import { Fragment, useState } from "react";
import { useCurrentReview } from "../../data/calls.js";
import Badge from "../shared/badge.jsx";
import Button from "../shared/button.jsx";
import UploadZone from "./upload-zone.jsx";

/**
 * The officer's working screen: AI verdicts on the left, evidence and the
 * reviewer's own decision on the right. This is the only place in the app where
 * a verdict can be changed.
 */
export default function ReviewWorkspace() {
  const review = useCurrentReview();
  const [selected, setSelected] = useState(0);
  const [decision, setDecision] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const item = review.checklist[selected];

  return <><section className="heading"><div><h1>Human review queue</h1><p>Validate AI-generated checklist answers with supporting transcript evidence.</p></div><div className="actions"><Button>Filter: priority first</Button><Button variant="primary">Approve current review</Button></div></section><UploadZone onUpload={() => setUploaded(true)}/>{uploaded && <p className="upload-note">Audio recorded for secure ingestion. The analysis job will appear in this queue when processing is complete.</p>}<section className="review-layout"><article className="card padded"><div className="call-head"><div><Badge tone={review.riskTone}>{review.riskLabel}</Badge><h2>{review.title}</h2><p>{review.context}</p></div><Badge tone="watch">{review.due}</Badge></div><div className="audio"><button className="play">▶</button><span>{review.waveform}</span><small>{review.duration}</small></div><div className="evidence">{review.transcript.map((line, index) => <Fragment key={line.time}>{index > 0 && <><br/><br/></>}<b>{line.time} · {line.speaker}:</b> {line.highlight ? <mark>{line.text}</mark> : line.text}</Fragment>)}</div><div className="rule-heading"><h2>AI checklist assessment</h2><p>Select an item to inspect its evidence and change the outcome if required.</p></div>{review.checklist.map(({ title, outcome, detail, tone }, index) => <button className={`result ${selected === index ? "selected" : ""}`} onClick={() => setSelected(index)} key={title}><i className={tone}>{outcome === "Pass" ? "✓" : outcome === "Fail" ? "!" : "?"}</i><span><b>{title}</b><small>AI outcome: {outcome} · {detail}</small></span><Badge tone={tone}>{outcome}</Badge></button>)}</article><aside className="card padded"><Badge tone={item.tone}>Selected checklist item</Badge><h3>{item.title}</h3><p className="subtle">The assistant’s evidence and recommendation are shown below for reviewer validation.</p><div className="evidence">{review.citations.map((citation, index) => <Fragment key={citation.time}>{index > 0 && <><br/><br/></>}<b>{citation.time}</b> {citation.quote}</Fragment>)}</div><span className="timestamp">{review.jumpLabel}</span><div className="rule-heading"><h3>Reviewer decision</h3><div className="actions"><Button variant={decision === "Pass" ? "primary" : undefined} onClick={() => setDecision("Pass")}>Pass</Button><Button variant="danger" ghost={decision !== "Fail"} onClick={() => setDecision("Fail")}>Confirm fail</Button><Button variant={decision === "Unclear" ? "primary" : undefined} onClick={() => setDecision("Unclear")}>Unclear</Button></div><textarea placeholder="Add an optional review note…"/></div><p className="subtle">Your decision, note, and cited timestamp become part of the final compliance report.</p></aside></section></>;
}
