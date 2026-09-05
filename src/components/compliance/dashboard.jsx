import { useDashboardSummary, useReviewQueue } from "../../data/calls.js";
import Badge from "../shared/badge.jsx";
import Button from "../shared/button.jsx";
import ProgressRow from "./progress-row.jsx";
import QueueItem from "./queue-item.jsx";

/** Landing page for the compliance officer: today's numbers and what to look at first. */
export default function Dashboard({ setPage }) {
  const { hero, metrics, progress } = useDashboardSummary();
  const queue = useReviewQueue();

  return (
    <>
      <section className="heading">
        <div>
          <h1>Compliance review command</h1>
          <p>
            A live view of automated call reviews, checklist outcomes, and work requiring expert
            attention.
          </p>
        </div>
        <div className="actions">
          <Button>Export management report</Button>
          <Button variant="primary" onClick={() => setPage("reviews")}>
            Open review queue
          </Button>
        </div>
      </section>
      <section className="hero card">
        <div>
          <span className="eyebrow">Priority signal · {hero.highRiskCalls} high-risk calls</span>
          <h2>{hero.outstandingItems} review items need compliance attention</h2>
          <p>
            Most conversations are progressing automatically. Focus human judgement on unclear
            evidence, failed checklist items, and calls nearing their review deadline.
          </p>
          <div className="actions">
            <Button variant="primary" onClick={() => setPage("reviews")}>
              Review priority calls
            </Button>
            <Button onClick={() => setPage("reports")}>See performance results</Button>
          </div>
        </div>
        <div className="hero-summary">
          <small>Today’s completion rate</small>
          <strong>{hero.completionRate}</strong>
          <Badge tone="watch">In progress</Badge>
          <hr />
          <span>
            Calls processed <b>{hero.callsProcessed}</b>
          </span>
          <span>
            Checklists complete <b>{hero.checklistsComplete}</b>
          </span>
          <span>
            Escalations open <b>{hero.escalationsOpen}</b>
          </span>
        </div>
      </section>
      <section className="metrics">
        {metrics.map(({ label, value, detail, tone }) => (
          <article className="metric card" key={label}>
            <div>
              {label}
              <i className={tone} />
            </div>
            <strong>{value}</strong>
            <small className={tone}>{detail}</small>
          </article>
        ))}
      </section>
      <section className="two-col">
        <article className="card padded">
          <div className="panel-title">
            <div>
              <h2>Review progress by business area</h2>
              <p>Call-level checklist completion for the current review window</p>
            </div>
            <Badge tone="info">Today</Badge>
          </div>
          {progress.map((row) => (
            <ProgressRow key={row.label} {...row} />
          ))}
        </article>
        <article className="card padded">
          <div className="panel-title">
            <div>
              <h2>Priority review queue</h2>
              <p>AI flagged calls with material compliance risk</p>
            </div>
            <Button onClick={() => setPage("reviews")}>View all</Button>
          </div>
          {queue.map((item) => (
            <QueueItem key={item.id} {...item} onClick={() => setPage("reviews")} />
          ))}
        </article>
      </section>
    </>
  );
}
