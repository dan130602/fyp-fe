import "../components/shared/shell.css";

/**
 * Compliance manager view — placeholder.
 *
 * Read-only aggregate reporting. When it is built it becomes this file plus the
 * data hooks it needs; the route and the role guard in app.jsx already exist.
 */
export default function Management() {
  return (
    <div className="placeholder">
      <h1>Management overview</h1>
      <p className="lead">Read-only aggregate reporting for compliance managers. Coming soon.</p>
      <div className="placeholder-card">
        <h2>Planned for this view</h2>
        <p>
          No call-level decisions and no verdict changes — a manager reads outcomes, they do not
          sign off on them.
        </p>
        <ul>
          <li>Call review status across the current review window</li>
          <li>Checklist completion rates by business area</li>
          <li>Pass, fail, and unresolved rates over time</li>
          <li>Outstanding items and ageing escalations</li>
        </ul>
      </div>
    </div>
  );
}
