/* Delta and comparison helpers for the ablation table. Pure functions. */

const EPSILON = 0.0005;

/**
 * One run's movement on one metric against the live version.
 * Returns null when there is nothing to compare (no live run, the run IS live,
 * or the metric is missing). `good` is null for a dead heat.
 */
export function metricDelta(run, live, metric) {
  if (!live || run.id === live.id || run[metric.key] == null) return null;
  const d = run[metric.key] - live[metric.key];
  if (Math.abs(d) < EPSILON) return { d: 0, good: null };
  return { d, good: metric.invert ? d < 0 : d > 0 };
}

/**
 * How many headline metrics beat or lose to live — drives the shape hint that
 * tells you at a glance whether a run is a clean win or a trade-off.
 */
export function runShape(run, live, groups) {
  if (!live || run.id === live.id) return null;
  let up = 0;
  let down = 0;
  groups.forEach((group) =>
    group.metrics.forEach((metric) => {
      const d = metricDelta(run, live, metric);
      if (d && d.good === true) up++;
      if (d && d.good === false) down++;
    })
  );
  if (up > 0 && down === 0) return { t: "all better", c: "var(--gain)" };
  if (down > 0 && up === 0) return { t: "all worse", c: "var(--loss)" };
  if (up > 0 && down > 0) return { t: "trade-off", c: "var(--amber)" };
  return null;
}

/** Width in px of the little delta sparkbar, capped so big swings stay in the cell. */
export function deltaBarWidth(delta, format) {
  return Math.min(24, Math.abs(delta) * (format === "pct" ? 1.7 : 95) + 2);
}

/** Colour token for a delta, matching the legend under the table. */
export function deltaColor(good) {
  if (good === null) return "var(--muted)";
  return good ? "var(--gain)" : "var(--loss)";
}

/** Status pill class and label for a run in the ledger. */
export function statusBadge(run) {
  if (run.status === "Deployed") {
    return run.current
      ? { cls: "st-cur", text: `${run.version} · live` }
      : { cls: "st-old", text: `${run.version} · past` };
  }
  if (run.status === "Candidate") return { cls: "st-cand", text: "Candidate" };
  return { cls: "st-rej", text: "Rejected" };
}

/** Index of the weakest checklist question in a run's per-question scores. */
export function worstQuestionIndex(perQuestion) {
  return perQuestion.indexOf(Math.min(...perQuestion));
}

/** Colour token for one per-question bar. */
export function questionBarColor(value, isWorst) {
  if (isWorst) return "var(--loss)";
  return value < 85 ? "var(--amber)" : "var(--gain)";
}

/** True when a run escalates materially more than the live version does. */
export function escalatesMoreThanLive(run, live) {
  return Boolean(live) && run.esc - live.esc > 5;
}
