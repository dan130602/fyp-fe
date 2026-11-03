import { useState } from "react";
import { Badge, type Tone } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toCallFindings } from "@/dashboard/call-findings.ts";
import type {
  CallOutcome,
  DashboardCall,
  DashboardFilters,
  ReviewStage,
} from "@/dashboard/dashboard-api.ts";
import { useDashboardCalls } from "@/dashboard/use-dashboard.ts";
import type { PipelineStatus } from "@/data/pipeline-output.ts";
import { useMediaAssetAnalysis } from "@/playback/use-playback-url.ts";

const OUTCOME_BADGES: Record<CallOutcome, { label: string; tone: Tone }> = {
  COMPLIANT: { label: "Compliant", tone: "good" },
  INCONCLUSIVE: { label: "Inconclusive", tone: "watch" },
  VIOLATION: { label: "Violation", tone: "risk" },
};

const STAGE_LABELS: Record<ReviewStage, string> = {
  PROCESSING: "Processing",
  AWAITING_REVIEW: "Awaiting review",
  REVIEWED: "Reviewed",
  FAILED: "Failed",
};

const VERDICT_TONES: Record<PipelineStatus, Tone> = {
  PASS: "good",
  FAIL: "risk",
  PARTIAL: "risk",
  CANNOT_DETERMINE: "watch",
  NOT_APPLICABLE: "info",
};

function CallBadge({ call }: { call: DashboardCall }) {
  if (call.outcome) {
    const { label, tone } = OUTCOME_BADGES[call.outcome];
    return <Badge variant={tone}>{label}</Badge>;
  }
  return <Badge variant="outline">{STAGE_LABELS[call.reviewStage]}</Badge>;
}

/** Read-only: playback and review submission stay limited to the uploader in the review queue. */
function CallDetail({ call, onBack }: { call: DashboardCall; onBack: () => void }) {
  const { data, isPending, isError, refetch } = useMediaAssetAnalysis(call.mediaAssetId);
  const findings = data ? toCallFindings(data) : [];
  const redFlags = data?.result?.final_red_flags ?? [];

  return (
    <article className="card padded dashboard-segment">
      <div className="panel-title">
        <div>
          <h2>{call.fileName ?? "Call"}</h2>
          <p>
            {call.advisor?.fullName ?? "No advisor recorded"} ·{" "}
            {new Date(call.createdAt).toLocaleString()}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={onBack}>
          Back to calls
        </Button>
      </div>
      {isPending && <Skeleton className="h-28 w-full" />}
      {isError && (
        <div role="alert" className="segment-error">
          <p>Could not load this call.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}
      {data?.analysisStatus === "PENDING" && (
        <p className="subtle">Analysis is still in progress.</p>
      )}
      {data?.analysisStatus === "FAILED" && (
        <p className="subtle">
          Analysis failed{data.failureReason ? `: ${data.failureReason}` : "."}
        </p>
      )}
      {data?.analysisStatus === "READY" && !data.review && (
        <p className="segment-note">Not reviewed yet, so these are the AI's verdicts.</p>
      )}
      {redFlags.length > 0 && (
        <section className="call-red-flags">
          <h3>Red flags</h3>
          <ul>
            {redFlags.map((flag) => (
              <li key={`${flag.category}-${flag.description}`}>
                <Badge variant="risk">{flag.severity}</Badge>
                <span>
                  <b>{flag.category.replaceAll("_", " ")}</b> {flag.description}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data?.analysisStatus === "READY" && findings.length === 0 && (
        <p className="subtle">This call has no checklist results.</p>
      )}
      <ul className="call-findings">
        {findings.map((finding) => (
          <li key={finding.itemId}>
            <div className="call-finding-head">
              <b>{finding.question}</b>
              <Badge variant={VERDICT_TONES[finding.status] ?? "info"}>{finding.verdict}</Badge>
            </div>
            {finding.overriddenAiVerdict && (
              <p className="call-override">
                Reviewer changed this from {finding.overriddenAiVerdict}
                {finding.reviewerComment ? `: ${finding.reviewerComment}` : "."}
              </p>
            )}
            {finding.reasoning && <p>{finding.reasoning}</p>}
            {finding.evidence.map((evidence) => (
              <blockquote key={evidence.text}>
                {evidence.timestamp && <small>{evidence.timestamp}</small>} {evidence.text}
              </blockquote>
            ))}
          </li>
        ))}
      </ul>
    </article>
  );
}

export interface CallsScope {
  advisorId: string | null;
  label: string;
}

export default function DashboardCalls({
  filters,
  scope,
  onClose,
}: {
  filters: DashboardFilters;
  scope: CallsScope;
  onClose: () => void;
}) {
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<DashboardCall | null>(null);
  const { data, isPending, isError, refetch } = useDashboardCalls(filters, {
    advisorId: scope.advisorId,
    outcome,
    page,
  });

  if (selected) return <CallDetail call={selected} onBack={() => setSelected(null)} />;

  const lastPage = data ? Math.max(Math.ceil(data.totalCalls / data.size) - 1, 0) : 0;

  return (
    <article className="card padded dashboard-segment">
      <div className="panel-title">
        <div>
          <h2>{scope.label}</h2>
          <p>{data ? `${data.totalCalls} calls, newest first` : "Calls, newest first"}</p>
        </div>
        <div className="actions">
          <label className="dashboard-filter">
            <span className="sr-only">Filter by outcome</span>
            <select
              value={outcome ?? ""}
              onChange={(event) => {
                setOutcome((event.target.value || null) as CallOutcome | null);
                setPage(0);
              }}
            >
              <option value="">All calls</option>
              <option value="VIOLATION">Violation</option>
              <option value="INCONCLUSIVE">Inconclusive</option>
              <option value="COMPLIANT">Compliant</option>
            </select>
          </label>
          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      {isPending && <Skeleton className="h-28 w-full" />}
      {isError && (
        <div role="alert" className="segment-error">
          <p>Could not load these calls.</p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      )}
      {data?.calls.length === 0 && <p className="subtle">No calls match.</p>}
      {data && data.calls.length > 0 && (
        <>
          <ul className="dashboard-calls">
            {data.calls.map((call) => (
              <li key={call.mediaAssetId}>
                <div>
                  <b>{call.fileName ?? "Call"}</b>
                  <small>
                    {call.advisor?.fullName ?? "No advisor recorded"} ·{" "}
                    {new Date(call.createdAt).toLocaleDateString()}
                    {call.redFlags > 0 &&
                      ` · ${call.redFlags} red ${call.redFlags === 1 ? "flag" : "flags"}`}
                  </small>
                  {call.violatedItems.map((item) => (
                    <small className="violated-item" key={item.itemId}>
                      {item.question}
                    </small>
                  ))}
                </div>
                <CallBadge call={call} />
                <Button size="sm" variant="outline" onClick={() => setSelected(call)}>
                  View more
                </Button>
              </li>
            ))}
          </ul>
          {lastPage > 0 && (
            <div className="dashboard-pager">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span>
                Page {page + 1} of {lastPage + 1}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= lastPage}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
