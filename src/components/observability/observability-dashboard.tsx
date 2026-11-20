import {
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Info,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useId, useState } from "react";
import { ApiError } from "../../lib/api-client.ts";
import type { Metric, ObservabilityOverview } from "../../observability/observability-api.ts";
import { useObservability } from "../../observability/use-observability.ts";
import "./observability.css";

const number = (value: number) => value.toLocaleString("en-SG");
export function percentage(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const digits =
    (value > 99.9 && value < 100) || (value > 0 && value < 0.1) ? 2 : value % 1 === 0 ? 0 : 1;
  return `${value.toFixed(digits)}%`;
}
function time(value: string): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}
export function overrideImpact(event: {
  aiVerdict: string;
  to: string;
  reverted: boolean;
}): string {
  if (event.reverted) return "Reverted to AI";
  if (event.aiVerdict === "PASS" && event.to === "FAIL") return "False negative (FN)";
  if (event.aiVerdict === "FAIL" && event.to === "PASS") return "False positive (FP)";
  if (!["PASS", "FAIL"].includes(event.aiVerdict) && ["PASS", "FAIL"].includes(event.to))
    return "Non-binary decision resolved";
  return "Other officer override";
}
function Help({ label, text }: { label: string; text: string }) {
  const id = useId();
  return (
    <span className="obs-help">
      <button type="button" aria-label={label} aria-describedby={id}>
        <Info size={13} />
      </button>
      <span role="tooltip" id={id}>
        {text}
      </span>
    </span>
  );
}
function MetricCard({ label, metric, help }: { label: string; metric: Metric; help: string }) {
  return (
    <div className="obs-metric">
      <div className="obs-metric-label">
        {label}
        <Help label={`About ${label}`} text={help} />
      </div>
      <strong>{percentage(metric.percentage)}</strong>
      <small>
        {number(metric.numerator)} / {number(metric.denominator)}
      </small>
    </div>
  );
}
type Segment = { label: string; count: number; tone: string };
function Distribution({
  segments,
  total,
  label,
}: {
  segments: Segment[];
  total: number;
  label: string;
}) {
  return (
    <div className="obs-distribution">
      <div
        className="obs-track"
        role="img"
        aria-label={`${label}: ${segments.map((s) => `${s.label} ${s.count}`).join(", ")}`}
      >
        {total > 0 ? (
          segments
            .filter((s) => s.count > 0)
            .map((s) => (
              <span
                key={s.label}
                className={`obs-fill obs-${s.tone}`}
                style={{ flexGrow: s.count }}
              />
            ))
        ) : (
          <span className="obs-empty-track" />
        )}
      </div>
      <div className="obs-legend">
        {segments.map((s) => (
          <span key={s.label} className={s.count === 0 ? "obs-muted-segment" : ""}>
            <i className={`obs-dot obs-${s.tone}`} />
            {s.label} <b>{number(s.count)}</b>
            <em>({percentage(total === 0 ? null : (s.count / total) * 100)})</em>
          </span>
        ))}
      </div>
    </div>
  );
}
function DecisionPanel({ data }: { data: ObservabilityOverview }) {
  const { counts: c, metrics: m, matrix, reviewedBreaches: b } = data;
  return (
    <section className="obs-panel obs-decision" aria-labelledby="obs-decision-title">
      <div className="obs-panel-heading">
        <h2 id="obs-decision-title">
          Compliance decisioning{" "}
          <Help label="About compliance decisioning" text={data.population} />
        </h2>
        <span className="obs-reference">Officer-reviewed reference</span>
      </div>
      <div className="obs-four-grid">
        <MetricCard
          label="Decision coverage"
          metric={m.decisionCoverage}
          help="AI PASS or FAIL decisions divided by all configured Stage 2 checklist checks. Unclear, failed and N/A checks remain in the denominator."
        />
        <MetricCard
          label="Reviewed breach recall"
          metric={m.reviewedBreachRecall}
          help="AI FAIL / officer FAIL pairs divided by all officer FAIL cases with a binary AI decision. This excludes unclear and failed predictions. Officer reviews are not independent ground truth."
        />
        <MetricCard
          label="Reviewed breach precision"
          metric={m.reviewedBreachPrecision}
          help="AI FAIL / officer FAIL pairs divided by all reviewed binary AI FAIL decisions."
        />
        <MetricCard
          label="Prediction failure rate"
          metric={m.predictionFailureRate}
          help="Checks that failed to produce a usable prediction divided by all checks. A correctly identified compliance breach is not a prediction failure."
        />
      </div>
      <div className="obs-section-label">
        <span>Outcome of all {number(c.checks)} checklist checks</span>
        <span className="obs-inline-note">
          Abstention rate{" "}
          <Help
            label="About abstention rate"
            text="Structurally successful unclear or partial answers divided by all checks. Runtime failures are counted separately."
          />{" "}
          <b>{percentage(m.abstentionRate.percentage)}</b>
        </span>
      </div>
      <Distribution
        total={c.checks}
        label="All checklist outcomes"
        segments={[
          { label: "PASS / FAIL decision", count: c.binaryDecisions, tone: "blue" },
          { label: "UNCLEAR / PARTIAL", count: c.unclear, tone: "amber" },
          { label: "Prediction failed", count: c.predictionFailures, tone: "violet" },
          { label: "Marked N/A", count: c.notApplicable, tone: "gray" },
        ]}
      />
      <div className="obs-decision-columns">
        <div>
          <div className="obs-section-label">
            <span>AI decisions vs officer review</span>
            <Help
              label="About the decision matrix"
              text="Finalized officer reviews of the saved output, with binary PASS/FAIL decisions on both sides. Newer AI results and conflicting snapshots are excluded until reviewed. Unchanged answers in a finalized review count as accepted."
            />
          </div>
          <table className="obs-matrix" aria-label="AI and officer decision matrix">
            <colgroup>
              <col className="obs-matrix-label-column" />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">Officer PASS</th>
                <th scope="col">Officer FAIL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  AI said
                  <br />
                  PASS
                </th>
                <td className="obs-matrix-cell obs-agreed">
                  <span>
                    <Check size={14} />
                    True negative (TN)
                  </span>
                  <strong>{number(matrix.agreedPass)}</strong>
                </td>
                <td className="obs-matrix-cell obs-disagreed">
                  <span>
                    <X size={14} />
                    False negative (FN)
                  </span>
                  <strong>{number(matrix.aiPassOfficerFail)}</strong>
                </td>
              </tr>
              <tr>
                <th scope="row">
                  AI said
                  <br />
                  FAIL
                </th>
                <td className="obs-matrix-cell obs-disagreed">
                  <span>
                    <X size={14} />
                    False positive (FP)
                  </span>
                  <strong>{number(matrix.aiFailOfficerPass)}</strong>
                </td>
                <td className="obs-matrix-cell obs-agreed">
                  <span>
                    <Check size={14} />
                    True positive (TP)
                  </span>
                  <strong>{number(matrix.agreedBreach)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="obs-matrix-foot">
            Binary review agreement{" "}
            <Help
              label="About binary review agreement"
              text="Agreed binary decisions divided by reviewed binary pairs. This measures agreement with officers, not independent accuracy."
            />
            <b>{percentage(m.reviewAgreement.percentage)}</b>
            <span>
              {number(m.reviewAgreement.numerator)} / {number(m.reviewAgreement.denominator)}
            </span>
          </p>
          <p className="obs-detail-note">
            Breach (FAIL) is the positive class. Finalized officer decisions are the reference;
            unreviewed and non-binary checks are excluded from this matrix.
          </p>
        </div>
        <div>
          <div className="obs-section-label">
            <span>What happened to the {number(b.total)} review-identified breaches</span>
          </div>
          <Distribution
            total={b.total}
            label="Reviewed breach outcomes"
            segments={[
              { label: "Detected", count: b.detected, tone: "blue" },
              { label: "Left UNCLEAR", count: b.unclear, tone: "amber" },
              { label: "Prediction failed", count: b.predictionFailures, tone: "violet" },
              { label: "Marked N/A", count: b.notApplicable, tone: "gray" },
              { label: "AI passed", count: b.falseClearances, tone: "rose" },
            ]}
          />
          <div className="obs-two-grid obs-breach-cards">
            <MetricCard
              label="Reviewed breach detection"
              metric={m.reviewedBreachDetection}
              help="AI-detected breaches divided by ALL officer-identified breaches, including unclear, failed and N/A AI predictions."
            />
            <MetricCard
              label="Reviewed false-clearance rate"
              metric={m.reviewedFalseClearanceRate}
              help="AI PASS / officer FAIL cases divided by all officer-identified breaches. These are potential missed breaches pending adjudication."
            />
          </div>
        </div>
      </div>
      <div className="obs-reference-note">
        <ShieldCheck size={14} />
        <span>
          {number(c.reviewedChecks)} of {number(c.checks)} checks have a finalized review compatible
          with the saved AI output. Officer reviews are a reference, not independent ground truth.
        </span>
      </div>
      {c.staleReviewItems > 0 && (
        <p className="obs-warning-note">
          {number(c.staleReviewItems)} review items were excluded because their AI baseline could
          not be matched.
        </p>
      )}
    </section>
  );
}

export function ObservabilityView({
  data,
  days = 7,
  onDaysChange,
  onRefresh,
  refreshing = false,
}: {
  data: ObservabilityOverview;
  days?: number;
  onDaysChange?: (days: number) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  async function copy(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(id);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <main className="obs-page">
      <header className="obs-header">
        <div>
          <div className="obs-eyebrow">
            <i />
            Production intelligence
          </div>
          <h1>Observability</h1>
          <p>Compliance performance and officer review changes.</p>
        </div>
        <div className="obs-toolbar">
          <label>
            Analysis window
            <select
              aria-label="Activity window"
              value={days}
              onChange={(e) => onDaysChange?.(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
          <button
            type="button"
            className="obs-refresh"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh production metrics"
          >
            <RefreshCw size={16} className={refreshing ? "obs-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </header>
      <div className="obs-context">
        <span>Live production records · refreshes every minute</span>
        <span>
          Updated {time(data.generatedAt)} SGT{" "}
          <span className="obs-status">Read-only reporting</span>
        </span>
      </div>
      {(data.counts.predictionFailures > 0 || data.counts.failedResults > 0) && (
        <div className="obs-callout" role="status">
          <AlertTriangle size={17} />
          <span>
            {data.counts.predictionFailures > 0 &&
              `${number(data.counts.predictionFailures)} checks need attention after a prediction failure. `}
            {data.counts.failedResults > 0 &&
              `${number(data.counts.failedResults)} saved AI results report a failure. `}
            {Object.entries(data.providerErrors)
              .map(([code, count]) => `HTTP ${code}: ${number(count)} stage(s).`)
              .join(" ")}
          </span>
        </div>
      )}
      <div className="obs-operational-grid">
        <section className="obs-summary-card">
          <div>
            Active officer overrides{" "}
            <Help
              label="About officer overrides"
              text="Reviewed decisions that currently differ from their linked AI result. Comment-only edits and reverted overrides do not count as active changes."
            />
          </div>
          <strong>
            {number(data.overrides.activeItems)}
            <span className="obs-summary-rate">{percentage(data.overrides.rate.percentage)}</span>
          </strong>
          <small>Across {number(data.overrides.reviewedItems)} reviewed checks</small>
        </section>
        <section className="obs-summary-card">
          <div>Calls in activity window</div>
          <strong>{number(data.counts.calls)}</strong>
          <small>
            {number(data.counts.savedResults)} saved results · {number(data.counts.reviewedCalls)}{" "}
            calls reviewed
          </small>
        </section>
      </div>
      {data.counts.savedResults === 0 && (
        <div className="obs-empty-notice">
          No analyses in this window. Metrics will appear after calls are processed.
        </div>
      )}
      {data.counts.savedResults > 0 && data.counts.checks === 0 && (
        <div className="obs-empty-notice">
          No checklist outcomes were available for these saved AI results.
        </div>
      )}
      <DecisionPanel data={data} />
      <section className="obs-panel" aria-labelledby="obs-overrides-title">
        <div className="obs-panel-heading">
          <div>
            <h2 id="obs-overrides-title">Officer overrides</h2>
            <p>
              Live officer changes with their original review IDs. FP/FN totals use the latest
              finalized decisions; this table shows change history.
            </p>
          </div>
          <span
            className={data.overrides.highPriorityEvents > 0 ? "obs-priority" : "obs-reference"}
          >
            {number(data.overrides.highPriorityEvents)} PASS → FAIL changes
          </span>
        </div>
        {data.overrides.recent.length === 0 ? (
          <div className="obs-empty-table">
            <ShieldCheck size={24} />
            <p>No verdict changes in this window.</p>
            <small>Finalized approvals remain part of the reviewed comparison above.</small>
          </div>
        ) : (
          <div className="obs-table-scroll">
            <table className="obs-table">
              <thead>
                <tr>
                  <th>Override ID</th>
                  <th>Question</th>
                  <th>Decision change</th>
                  <th>Reviewed at · SGT</th>
                  <th>Review signal</th>
                </tr>
              </thead>
              <tbody>
                {data.overrides.recent.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <div className="obs-event-id">
                        <code title={event.id}>
                          {event.id.slice(0, 8)}…{event.id.slice(-4)}
                        </code>
                        <button
                          type="button"
                          onClick={() => void copy(event.id)}
                          aria-label={`Copy override ID ${event.id}`}
                          title={event.id}
                        >
                          {copied === event.id ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                      <small>Original officer decision</small>
                    </td>
                    <td>
                      <b>{event.checklistItemId}</b>
                    </td>
                    <td>
                      <span className={`obs-verdict obs-verdict-${event.from.toLowerCase()}`}>
                        {event.from.replaceAll("_", " ")}
                      </span>
                      <ArrowRight size={13} className="obs-arrow" />
                      <span className={`obs-verdict obs-verdict-${event.to.toLowerCase()}`}>
                        {event.to.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>{time(event.decidedAt)}</td>
                    <td>
                      <span
                        className={event.priority === "high" ? "obs-priority" : "obs-reference"}
                      >
                        {overrideImpact(event)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {copyError && (
          <p className="obs-warning-note" role="status">
            Could not copy. The complete ID is available in the ID button’s tooltip.
          </p>
        )}
      </section>
      <footer className="obs-footer">
        <span>Read-only production reporting · no AI verdicts are changed here.</span>
      </footer>
    </main>
  );
}

export default function ObservabilityDashboard() {
  const [days, setDays] = useState(7);
  const query = useObservability(days);
  if (query.isPending)
    return (
      <main className="obs-page obs-loading" role="status">
        <div className="obs-skeleton obs-skeleton-heading" />
        <div className="obs-operational-grid">
          {[1, 2].map((i) => (
            <div key={i} className="obs-skeleton" />
          ))}
        </div>
        <div className="obs-skeleton obs-skeleton-panel" />
        <p>Loading production metrics…</p>
      </main>
    );
  if (query.isError)
    return (
      <main className="obs-page">
        <section className="obs-panel obs-load-error">
          <AlertTriangle size={24} />
          <h1>Production metrics unavailable</h1>
          <p>
            {query.error instanceof ApiError && query.error.status === 403
              ? "Your account does not have production reporting access."
              : query.error instanceof ApiError && query.error.status === 401
                ? "Sign in with your existing account to load live production metrics."
                : query.error instanceof ApiError && query.error.status === 404
                  ? "The connected backend does not expose production observability yet. Deploy the matching read-only reporting endpoint."
                  : "Live production records could not be loaded. Check the backend API connection and version, then try again."}
          </p>
          <button type="button" className="obs-refresh" onClick={() => void query.refetch()}>
            Try again
          </button>
        </section>
      </main>
    );
  return (
    <ObservabilityView
      data={query.data}
      days={days}
      onDaysChange={setDays}
      onRefresh={() => void query.refetch()}
      refreshing={query.isFetching}
    />
  );
}
