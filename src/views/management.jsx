import { Badge } from "@/components/ui/badge.tsx";
import Dashboard from "../components/compliance/dashboard.tsx";
import "./compliance-officer.css";

/**
 * Management view (ADMIN, SUPER_ADMIN, MANAGER): the org-wide compliance dashboard, read-only.
 * No review queue and no verdict changes — a manager reads outcomes, they do not sign off on them.
 */
export default function Management() {
  return (
    <div className="app app-full">
      <main>
        <header>
          <span>
            Management / <b>Management dashboard</b>
          </span>
          <div>
            <strong>System status:</strong>
            <Badge variant="pass">● Processing normally</Badge>
          </div>
        </header>
        <div className="page">
          <Dashboard title="Management overview" />
        </div>
      </main>
    </div>
  );
}
