import { Fragment } from "react";
import { ChevronRight, GitCommit } from "lucide-react";
import { formatDelta, formatMetricValue } from "../../lib/format.js";
import {
  deltaBarWidth,
  deltaColor,
  metricDelta,
  runShape,
  statusBadge,
} from "../../lib/metrics.js";
import RunDetail from "./run-detail.jsx";

/**
 * The experiment ledger. Every number is a delta against the live version, so a
 * run is read by how far it moved rather than by its absolute score.
 */
export default function AblationTable({
  runs,
  live,
  groups,
  knobs,
  questions,
  nextVersion,
  openId,
  onToggle,
  onPatch,
  onPromote,
}) {
  const metricColumns = groups.reduce((total, group) => total + group.metrics.length, 0);
  const columnCount = 2 + metricColumns + 2;

  return (
    <div className="wrap">
      <table className="main">
        <thead>
          <tr className="grp">
            <th colSpan={2}>Run</th>
            {groups.map((group) => (
              <th key={group.id} colSpan={group.metrics.length} data-b="true">
                {group.label}
                <span className="gnote">{group.note}</span>
              </th>
            ))}
            <th colSpan={2} data-b="true">
              Decision
            </th>
          </tr>
          <tr className="hr">
            <th className="l">ID</th>
            <th className="l">Experiment / config</th>
            {groups.map((group) =>
              group.metrics.map((metric, i) => (
                <th key={metric.key} data-b={i === 0 ? "true" : "false"}>
                  {metric.label}
                </th>
              )),
            )}
            <th className="l" data-b="true">
              Status
            </th>
            <th className="l">Commit</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run, idx) => {
            const prev = runs[idx - 1];
            const open = openId === run.id;
            const badge = statusBadge(run);
            const shape = runShape(run, live, groups);
            return (
              <Fragment key={run.id}>
                <tr
                  className="row"
                  data-cur={run.current}
                  onClick={() => onToggle(open ? null : run.id)}
                >
                  <td>
                    <div className="rid" data-o={open}>
                      <ChevronRight size={12} />
                      {run.id}
                    </div>
                    <div className="dt">{run.date}</div>
                  </td>
                  <td>
                    <div className="nm">
                      {run.name}
                      {shape && (
                        <span className="shp" style={{ color: shape.c }}>
                          {shape.t}
                        </span>
                      )}
                    </div>
                    <div className="chips">
                      {knobs.map((knob) => (
                        <span
                          key={knob}
                          className="chip"
                          data-d={prev ? prev.config[knob] !== run.config[knob] : false}
                        >
                          {knob}={run.config[knob]}
                        </span>
                      ))}
                    </div>
                  </td>
                  {groups.map((group) =>
                    group.metrics.map((metric, i) => {
                      const d = metricDelta(run, live, metric);
                      return (
                        <td key={metric.key} className="num" data-b={i === 0 ? "true" : "false"}>
                          {formatMetricValue(run[metric.key], metric.fmt)}
                          {run.current && <div className="lv">LIVE</div>}
                          {d && (
                            <div className="dl" data-g={String(d.good)}>
                              <span
                                className="sk"
                                style={{
                                  width: `${deltaBarWidth(d.d, metric.fmt)}px`,
                                  background: deltaColor(d.good),
                                }}
                              />
                              {formatDelta(d.d, metric.fmt)}
                            </div>
                          )}
                        </td>
                      );
                    }),
                  )}
                  <td data-b="true">
                    <span className={`bdg ${badge.cls}`}>{badge.text}</span>
                  </td>
                  <td>
                    <div className="sha">
                      <GitCommit size={11} />
                      {run.sha}
                    </div>
                    <div className="msg">{run.msg}</div>
                  </td>
                </tr>

                {open && (
                  <tr className="exp">
                    <td colSpan={columnCount}>
                      <RunDetail
                        run={run}
                        live={live}
                        questions={questions}
                        nextVersion={nextVersion}
                        onPatch={onPatch}
                        onPromote={onPromote}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
