import { useOutstandingItemCount } from "@/data/calls.ts";

/* Navigation structure, not domain data — it describes the officer view's own
   pages, so it stays here rather than in src/data/. */
const NAV_ITEMS = [
  { id: "dashboard", icon: "▦", label: "Management dashboard" },
  { id: "reviews", icon: "☷", label: "Review queue" },
  { id: "checklists", icon: "☑", label: "Checklist library" },
  { id: "reports", icon: "▤", label: "Reports & results" },
] as const;

/** The officer view's own pages; the router owns roles, this owns these tabs. */
export type PageId = (typeof NAV_ITEMS)[number]["id"];

interface SidebarProps {
  page: PageId;
  setPage: (page: PageId) => void;
}

export function navLabel(id: PageId): string {
  return NAV_ITEMS.find((item) => item.id === id)?.label ?? "";
}

/** Left rail of the compliance officer view. */
export default function Sidebar({ page, setPage }: SidebarProps) {
  const outstanding = useOutstandingItemCount();
  return (
    <aside>
      {/* No brand mark here: the top nav already carries it directly above this rail. */}
      <div className="workspace">
        <small>Workspace</small>
        <b>Customer communications</b>
        <em>Compliance operations</em>
      </div>
      <nav>
        {NAV_ITEMS.map(({ id, icon, label }) => (
          <button
            type="button"
            className={page === id ? "active" : ""}
            onClick={() => setPage(id)}
            key={id}
          >
            <i>{icon}</i>
            {label}
            {id === "reviews" && <b>{outstanding}</b>}
          </button>
        ))}
      </nav>
      <div className="privacy">
        <b>▣ Evidence-led review</b>
        <p>
          AI answers are paired with transcript evidence and timestamps so officers can validate
          each decision.
        </p>
      </div>
    </aside>
  );
}
