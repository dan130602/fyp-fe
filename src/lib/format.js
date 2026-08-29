/* Number and date formatting. Pure functions, no React, no data. */

/**
 * Format a metric value against its declared format.
 * "pct" renders one decimal place, anything else renders three.
 */
export function formatMetric(value, format) {
  if (value == null) return "—";
  return format === "pct" ? value.toFixed(1) : value.toFixed(3);
}

/** As formatMetric, with the unit suffix the table shows. */
export function formatMetricValue(value, format) {
  return `${formatMetric(value, format)}${format === "pct" ? "%" : ""}`;
}

/** A delta, always carrying an explicit sign for gains. */
export function formatDelta(delta, format) {
  return `${delta > 0 ? "+" : ""}${formatMetric(delta, format)}`;
}

/** Per-call inference cost. */
export function formatCost(value) {
  return `$${value.toFixed(3)}`;
}

/** A bare percentage that is already on a 0–100 scale. */
export function formatPercent(value) {
  return `${value}%`;
}

/** Seconds, as shown in the p95 latency column. */
export function formatSeconds(value) {
  return `${value}s`;
}
