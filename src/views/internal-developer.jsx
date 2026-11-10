import { Info } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import AblationTable from "../components/developer/ablation-table.jsx";
import ProductionPanel from "../components/developer/production-panel.jsx";
import {
  useAblationRuns,
  useChecklistQuestions,
  useConfigKnobs,
  useEvalDataset,
  useMetricGroups,
} from "../data/ablation-runs.js";
import "./internal-developer.css";

const STATUS_FILTERS = ["All", "Candidate", "Deployed", "Rejected"];

/**
 * Internal developer view. Compares pipeline configurations against a fixed
 * labelled dataset and monitors production health.
 *
 * Read-only with respect to compliance: this view can promote a configuration,
 * but it cannot touch a verdict. That separation is enforced at the route level
 * by RequireRole, not here.
 */
export default function InternalDeveloper() {
  const { runs, live, nextVersion, patchRun, promoteRun } = useAblationRuns();
  const groups = useMetricGroups();
  const knobs = useConfigKnobs();
  const questions = useChecklistQuestions();
  const dataset = useEvalDataset();

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "production" ? "production" : "ablations";
  const setTab = (next) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.set("tab", next);
        return params;
      },
      { replace: true },
    );
  const [openId, setOpenId] = useState("R008");
  const [filter, setFilter] = useState("All");

  const shown = filter === "All" ? runs : runs.filter((r) => r.status === filter);

  return (
    <div className="tv">
      <div className="sh">
        <div className="hd">
          <div>
            <h1>Technical view</h1>
            <p className="sub">
              {tab === "production"
                ? "Production performance and officer review changes. Developer or reporting access required."
                : "Experiment comparisons from the local demo dataset."}
            </p>
          </div>
          {tab === "ablations" && (
            <div className="meta">
              live{" "}
              <b>
                {live?.version} · {live?.sha}
              </b>
              <br />
              dataset <b>{dataset.name}</b> · {dataset.items} items
              <br />
              {dataset.shape}
            </div>
          )}
        </div>

        <div className="tabs">
          <button
            type="button"
            className="tb"
            data-on={tab === "ablations"}
            onClick={() => setTab("ablations")}
          >
            Ablations
          </button>
          <button
            type="button"
            className="tb"
            data-on={tab === "production"}
            onClick={() => setTab("production")}
          >
            Production
          </button>
        </div>

        {tab === "ablations" && (
          <>
            <div className="bar">
              <span className="lab">Status</span>
              <select className="sel" value={filter} onChange={(e) => setFilter(e.target.value)}>
                {STATUS_FILTERS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <div className="sp" />
              <span className="note">
                deltas vs{" "}
                <b>
                  {live?.version} {live?.sha}
                </b>{" "}
                · rejected runs retained
              </span>
            </div>

            <AblationTable
              runs={shown}
              live={live}
              groups={groups}
              knobs={knobs}
              questions={questions}
              nextVersion={nextVersion}
              openId={openId}
              onToggle={setOpenId}
              onPatch={patchRun}
              onPromote={promoteRun}
            />

            <div className="foot">
              <span>
                <span className="dot" style={{ background: "var(--gain)" }} /> better than live
              </span>
              <span>
                <span className="dot" style={{ background: "var(--loss)" }} /> worse than live
              </span>
              <span>
                <span className="dot" style={{ background: "var(--amber)" }} /> trade-off: better on
                some, worse on others
              </span>
              <span>
                <Info size={11} /> Rejected runs stay in the ledger.
              </span>
            </div>
          </>
        )}

        {tab === "production" && <ProductionPanel live={live} />}
      </div>
    </div>
  );
}
