import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge.tsx";
import { useAuth } from "../auth/auth-context.tsx";
import ChecklistLibrary from "../components/compliance/checklist-library.tsx";
import Dashboard from "../components/compliance/dashboard.tsx";
import Reports from "../components/compliance/reports.tsx";
import ReviewQueue from "../components/compliance/review-queue.tsx";
import type { PageId } from "../components/compliance/sidebar.tsx";
import Sidebar, { navLabel } from "../components/compliance/sidebar.tsx";
import "./compliance-officer.css";

/**
 * Compliance officer view. Reads AI verdicts, listens to the cited moment, and
 * confirms or overrides each checklist answer — the override is the answer that
 * goes into the compliance record.
 *
 * Pages inside this view are switched locally rather than by the router: the
 * router owns roles, this owns the officer's own tabs.
 */
export default function ComplianceOfficer() {
  const [page, setPage] = useState<PageId>("dashboard");
  const pages: Record<PageId, ReactNode> = {
    dashboard: <Dashboard setPage={setPage} />,
    reviews: <ReviewQueue />,
    checklists: <ChecklistLibrary />,
    reports: <Reports />,
  };

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} />
      <main>
        <header>
          <span>
            Compliance review / <b>{navLabel(page)}</b>
          </span>
          <div>
            <strong>System status:</strong>
            <Badge variant="pass">● Processing normally</Badge>
          </div>
        </header>
        <div className="page">{pages[page]}</div>
      </main>
    </div>
  );
}
