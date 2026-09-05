import { Check, ExternalLink, GitCommit, Upload } from "lucide-react";
import { formatCost, formatSeconds } from "../../lib/format.js";
import { escalatesMoreThanLive } from "../../lib/metrics.js";
import ConfusionMatrix from "./confusion-matrix.jsx";
import PerQuestionBars from "./per-question-bars.jsx";

/**
 * The expanded row under a run: the decision the team recorded, where the run
 * is weak, and the record needed to reproduce it.
 *
 * Every column stops click propagation so interacting with the detail does not
 * collapse the row it belongs to.
 */
export default function RunDetail({ run, live, questions, nextVersion, onPatch, onPromote }) {
  const stop = (event) => event.stopPropagation();

  return (
    <div className="ein">
      <div onClick={stop}>
        <div className="eh">Decision</div>
        <div className="dec">
          {["Candidate", "Rejected"].map((status) => (
            <button
              key={status}
              className="db"
              data-on={run.status === status}
              onClick={() => onPatch(run.id, { status })}
            >
              {status}
            </button>
          ))}
        </div>
        <textarea
          placeholder="Why this outcome. One or two lines. This is what the report quotes."
          value={run.rationale}
          onChange={(e) => onPatch(run.id, { rationale: e.target.value })}
        />
        <div className="acts">
          <button className="btn" onClick={() => onPatch(run.id, { decided: "Team · today" })}>
            <Check size={11} /> Record decision
          </button>
          <button
            className="btn pri"
            disabled={run.status === "Deployed"}
            onClick={() => onPromote(run.id)}
          >
            <Upload size={11} />
            {run.status === "Deployed" ? `Deployed as ${run.version}` : `Promote to ${nextVersion}`}
          </button>
        </div>
        <div className="hint">
          Promoting assigns the next version and moves the live badge off {live?.version}.
        </div>
        <div className="links">
          <a className="lnk" href="#" onClick={(e) => e.preventDefault()}>
            <ExternalLink size={11} /> All {run.items} items in Langfuse
          </a>
          <a className="lnk" href="#" onClick={(e) => e.preventDefault()}>
            <GitCommit size={11} /> config.yaml @ {run.sha}
          </a>
        </div>
      </div>

      <div onClick={stop}>
        <PerQuestionBars perQuestion={run.perQ} questions={questions} />
      </div>

      <div onClick={stop}>
        <div className="eh">Layer scores & confusion</div>
        <div className="stat">
          <div>
            <div className="sv">{run.layers.l0}%</div>
            <div className="sl">L0 schema</div>
          </div>
          <div>
            <div className="sv">{run.layers.l1}%</div>
            <div className="sl">L1 grounded</div>
          </div>
          <div>
            <div className="sv">{run.layers.l5}%</div>
            <div className="sl">L5 stable</div>
          </div>
        </div>
        <ConfusionMatrix cm={run.cm} />
        <div className="eh" style={{ marginTop: 15 }}>
          Run record
        </div>
        <dl className="kv">
          <dt>dataset</dt>
          <dd>
            {run.dataset} · {run.items}
          </dd>
          <dt>escalation</dt>
          <dd>{escalatesMoreThanLive(run, live) ? <em>{run.esc}%</em> : `${run.esc}%`}</dd>
          <dt>cost/call</dt>
          <dd>{formatCost(run.cost)}</dd>
          <dt>p95</dt>
          <dd>{formatSeconds(run.latency)}</dd>
          <dt>runtime</dt>
          <dd>{run.runtime}</dd>
          <dt>ran by</dt>
          <dd>{run.ranBy}</dd>
          <dt>decided</dt>
          <dd>{run.decided}</dd>
        </dl>
      </div>
    </div>
  );
}
