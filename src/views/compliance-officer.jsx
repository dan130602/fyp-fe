import { useState } from "react";
import { useAuth } from "../auth/auth-context.jsx";
import ChecklistLibrary from "../components/compliance/checklist-library.jsx";
import Dashboard from "../components/compliance/dashboard.jsx";
import Reports from "../components/compliance/reports.jsx";
import ReviewWorkspace from "../components/compliance/review-workspace.jsx";
import Sidebar, { navLabel } from "../components/compliance/sidebar.jsx";
import Badge from "../components/shared/badge.jsx";
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
  const { user } = useAuth();
  const [page, setPage] = useState("dashboard");
  const pages = {
    dashboard: <Dashboard setPage={setPage}/>,
    reviews: <ReviewWorkspace/>,
    checklists: <ChecklistLibrary/>,
    reports: <Reports/>,
  };

  return <div className="app"><Sidebar page={page} setPage={setPage}/><main><header><span>Compliance review / <b>{navLabel(page)}</b></span><div><Badge tone="pass">● Processing normally</Badge><i className="avatar">{user?.initials ?? "CO"}</i></div></header><div className="page">{pages[page]}</div></main></div>;
}
