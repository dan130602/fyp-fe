import { useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { useAdvisors } from "../../advisors/use-advisors.ts";
import type { DashboardFilters } from "../../dashboard/dashboard-api.ts";
import DashboardCalls, { type CallsScope } from "./dashboard-calls.tsx";
import {
  AdvisorComplianceSegment,
  ChecklistCompletionSegment,
  ComplianceOverviewSegment,
  OutstandingItemsSegment,
  ReviewStatusSegment,
} from "./dashboard-segments.tsx";
import type { PageId } from "./sidebar.tsx";

interface DashboardProps {
  /** Officer view only. Omitted for the read-only management view, which has no review queue. */
  setPage?: (page: PageId) => void;
  title?: string;
}

const ALL_CALLS: CallsScope = { advisorId: null, label: "All calls" };

/** Org-wide numbers: the officer's landing page, and the read-only management view. */
export default function Dashboard({
  setPage,
  title = "Compliance review command",
}: DashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>({ from: "", to: "", department: "" });
  const [callsScope, setCallsScope] = useState<CallsScope | null>(null);
  const { data: advisors } = useAdvisors();
  const departments = [...new Set((advisors ?? []).map((advisor) => advisor.department))].sort();

  return (
    <>
      <section className="heading">
        <div>
          <h1>{title}</h1>
          <p>
            A live view of automated call reviews, checklist outcomes, and work requiring expert
            attention.
          </p>
        </div>
        {setPage && (
          <div className="actions">
            <Button onClick={() => setPage("reviews")}>Open review queue</Button>
          </div>
        )}
      </section>
      <section className="dashboard-filters" aria-label="Dashboard filters">
        <label className="dashboard-filter">
          From
          <input
            type="date"
            value={filters.from}
            onChange={(event) => setFilters({ ...filters, from: event.target.value })}
          />
        </label>
        <label className="dashboard-filter">
          To
          <input
            type="date"
            value={filters.to}
            onChange={(event) => setFilters({ ...filters, to: event.target.value })}
          />
        </label>
        <label className="dashboard-filter">
          Department
          <select
            value={filters.department}
            onChange={(event) => setFilters({ ...filters, department: event.target.value })}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </label>
      </section>
      <section className="dashboard-grid">
        <ComplianceOverviewSegment filters={filters} onViewCalls={() => setCallsScope(ALL_CALLS)} />
        <ReviewStatusSegment filters={filters} />
        <OutstandingItemsSegment filters={filters} />
      </section>
      <ChecklistCompletionSegment filters={filters} />
      <AdvisorComplianceSegment
        filters={filters}
        onViewCalls={(advisor) =>
          setCallsScope({ advisorId: advisor.advisorId, label: `Calls for ${advisor.fullName}` })
        }
      />
      {callsScope && (
        <DashboardCalls
          key={callsScope.advisorId ?? "all"}
          filters={filters}
          scope={callsScope}
          onClose={() => setCallsScope(null)}
        />
      )}
    </>
  );
}
