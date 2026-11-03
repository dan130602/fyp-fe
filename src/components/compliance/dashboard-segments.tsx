import type { UseQueryResult } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { AdvisorCompliance, ComplianceOverview } from "@/dashboard/dashboard-api.ts";
import {
  useAdvisorCompliance,
  useChecklistCompletion,
  useComplianceOverview,
  useOutstandingItems,
  useReviewStatus,
} from "@/dashboard/use-dashboard.ts";
import type { DashboardFilters } from "../../dashboard/dashboard-api.ts";
import ProgressRow from "./progress-row.jsx";

interface SegmentProps {
  filters: DashboardFilters;
}

/** Each segment loads and fails on its own, so one bad request leaves the others on screen. */
function Segment<T>({
  title,
  detail,
  action,
  result,
  children,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
  result: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  return (
    <article className="card padded dashboard-segment">
      <div className="panel-title">
        <div>
          <h2>{title}</h2>
          <p>{detail}</p>
        </div>
        {action}
      </div>
      {result.isPending && <Skeleton className="h-28 w-full" />}
      {result.isError && (
        <div role="alert" className="segment-error">
          <p>Could not load this section.</p>
          <Button size="sm" variant="outline" onClick={() => result.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {result.data !== undefined && children(result.data)}
    </article>
  );
}

function StatRow({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="stat-row">
      <span>
        {tone && <i className={tone} />}
        {label}
      </span>
      <b>{value}</b>
    </div>
  );
}

const OUTCOMES = [
  { key: "compliant", label: "Compliant", tone: "good" },
  { key: "inconclusive", label: "Inconclusive", tone: "watch" },
  { key: "violation", label: "Violation", tone: "risk" },
] as const;

function outcomeParts(overview: ComplianceOverview) {
  const values = {
    compliant: [overview.compliantCalls, overview.compliancePct],
    inconclusive: [overview.inconclusiveCalls, overview.inconclusivePct],
    violation: [overview.violationCalls, overview.violationPct],
  } as const;
  return OUTCOMES.map((outcome) => ({
    ...outcome,
    count: values[outcome.key][0],
    pct: values[outcome.key][1],
  }));
}

function ComplianceDonut({ overview }: { overview: ComplianceOverview }) {
  const [active, setActive] = useState<string | null>(null);
  const parts = outcomeParts(overview);
  const visible = parts.filter((part) => part.count > 0);
  const gap = visible.length > 1 ? 1 : 0;
  const highlighted = parts.find((part) => part.key === active);
  let offset = 0;

  return (
    <div className="donut-layout">
      <svg
        viewBox="0 0 120 120"
        className="donut"
        role="img"
        aria-label={parts.map((part) => `${part.label} ${part.count}`).join(", ")}
      >
        {visible.map((part) => {
          const length = (part.count / overview.reviewedCalls) * 100;
          const start = offset;
          offset += length;
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: hover only repeats the legend, which is always visible.
            <circle
              key={part.key}
              className={`donut-part ${part.tone}`}
              cx="60"
              cy="60"
              r="48"
              pathLength="100"
              strokeDasharray={`${length - gap} ${100 - length + gap}`}
              strokeDashoffset={-start}
              transform="rotate(-90 60 60)"
              opacity={active && active !== part.key ? 0.35 : 1}
              onMouseEnter={() => setActive(part.key)}
              onMouseLeave={() => setActive(null)}
            />
          );
        })}
        <text x="60" y="58" textAnchor="middle" className="donut-value">
          {highlighted ? `${highlighted.pct}%` : overview.reviewedCalls}
        </text>
        <text x="60" y="72" textAnchor="middle" className="donut-label">
          {highlighted ? highlighted.label : "reviewed calls"}
        </text>
      </svg>
      <ul className="donut-legend">
        {parts.map((part) => (
          <li key={part.key}>
            <i className={part.tone} />
            <span>{part.label}</span>
            <b>{part.count}</b>
            <small>{part.pct}%</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ComplianceOverviewSegment({
  filters,
  onViewCalls,
}: SegmentProps & { onViewCalls: () => void }) {
  const result = useComplianceOverview(filters);
  return (
    <Segment
      title="Overall compliance"
      detail="Reviewed calls only, using each call's own checklist"
      action={
        <Button size="sm" variant="secondary" onClick={onViewCalls}>
          View calls
        </Button>
      }
      result={result}
    >
      {(overview) =>
        overview.reviewedCalls === 0 ? (
          <p className="subtle">No reviewed calls in this period.</p>
        ) : (
          <ComplianceDonut overview={overview} />
        )
      }
    </Segment>
  );
}

export function ReviewStatusSegment({ filters }: SegmentProps) {
  const result = useReviewStatus(filters);
  return (
    <Segment
      title="Call review status"
      detail="Where every uploaded call currently sits"
      result={result}
    >
      {(status) => (
        <>
          <div className="segment-figure">
            <strong>
              {status.reviewed} of {status.totalCalls}
            </strong>
            <small>calls reviewed · {status.reviewCoveragePct}% coverage</small>
          </div>
          <StatRow label="Reviewed" value={status.reviewed} tone="good" />
          <StatRow label="Awaiting review" value={status.awaitingReview} tone="watch" />
          <StatRow label="Processing" value={status.processing} tone="info" />
          <StatRow label="Failed" value={status.failed} tone="risk" />
        </>
      )}
    </Segment>
  );
}

function waitingFor(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "under a day";
  return days === 1 ? "1 day" : `${days} days`;
}

export function OutstandingItemsSegment({ filters }: SegmentProps) {
  const result = useOutstandingItems(filters);
  return (
    <Segment
      title="Outstanding items"
      detail="Reviews and escalations still needing a person"
      result={result}
    >
      {(items) => {
        const owners = Object.entries(items.proposedActionsByOwner);
        return (
          <>
            <StatRow label="Unreviewed escalations" value={items.unreviewedEscalations} />
            <StatRow label="Unreviewed transaction holds" value={items.unreviewedHolds} />
            <StatRow
              label={`Overdue reviews (over ${items.overdueAfterDays} days)`}
              value={items.overdueReviews}
            />
            <StatRow label="Awaiting review" value={items.awaitingReview} />
            <StatRow
              label="Oldest waiting"
              value={
                items.oldestAwaitingReviewAt ? waitingFor(items.oldestAwaitingReviewAt) : "None"
              }
            />
            <StatRow
              label="Reviewed, still undetermined"
              value={items.reviewedWithUndeterminedItems}
            />
            {owners.length > 0 && (
              <p className="segment-note">
                Actions proposed: {owners.map(([owner, count]) => `${owner} ${count}`).join(" · ")}.
                Completion isn't tracked.
              </p>
            )}
          </>
        );
      }}
    </Segment>
  );
}

export function ChecklistCompletionSegment({ filters }: SegmentProps) {
  const result = useChecklistCompletion(filters);
  return (
    <Segment
      title="Checklist completion"
      detail="Applicable items on reviewed calls that reached a clear result"
      result={result}
    >
      {(completion) =>
        completion.applicableItems === 0 ? (
          <p className="subtle">No applicable items on reviewed calls in this period.</p>
        ) : (
          <>
            <div className="segment-figure">
              <strong>{completion.completionPct}%</strong>
              <small>
                {completion.determinedItems} of {completion.applicableItems} items determined
              </small>
            </div>
            <ProgressRow
              label="Determined"
              value={Math.round(completion.completionPct)}
              note={`${completion.determinedItems}/${completion.applicableItems}`}
              tone="info"
            />
          </>
        )
      }
    </Segment>
  );
}

function rate(advisor: AdvisorCompliance, pct: number) {
  return advisor.reviewedCalls === 0 ? "–" : `${pct}%`;
}

export function AdvisorComplianceSegment({
  filters,
  onViewCalls,
}: SegmentProps & { onViewCalls: (advisor: AdvisorCompliance) => void }) {
  const result = useAdvisorCompliance(filters);
  return (
    <Segment
      title="Advisor compliance"
      detail="Rates cover reviewed calls. Checklists can differ between calls, so compare with care."
      result={result}
    >
      {({ advisors }) =>
        advisors.length === 0 ? (
          <p className="subtle">No calls linked to an advisor in this period.</p>
        ) : (
          <div className="dashboard-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Advisor</th>
                  <th scope="col">Department</th>
                  <th scope="col">Reviewed</th>
                  <th scope="col">Coverage</th>
                  <th scope="col">Compliant</th>
                  <th scope="col">Violation</th>
                  <th scope="col">Inconclusive</th>
                  <th scope="col">Red flag calls</th>
                  <th scope="col">
                    <span className="sr-only">Calls</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {advisors.map((advisor) => (
                  <tr key={advisor.advisorId}>
                    <td>
                      <b>{advisor.fullName}</b>
                      <small>{advisor.employeeId}</small>
                      {advisor.status === "INACTIVE" && <Badge variant="outline">Inactive</Badge>}
                    </td>
                    <td>{advisor.department}</td>
                    <td>
                      {advisor.reviewedCalls} of {advisor.totalCalls}
                    </td>
                    <td>{advisor.reviewCoveragePct}%</td>
                    <td>{rate(advisor, advisor.compliancePct)}</td>
                    <td>{rate(advisor, advisor.violationPct)}</td>
                    <td>{rate(advisor, advisor.inconclusivePct)}</td>
                    <td>{advisor.redFlagCalls}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="secondary"
                        aria-label={`View calls for ${advisor.fullName}`}
                        onClick={() => onViewCalls(advisor)}
                      >
                        View calls
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </Segment>
  );
}
