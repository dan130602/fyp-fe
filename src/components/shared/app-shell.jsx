import TopNav from "./top-nav.tsx";
import "./shell.css";

/**
 * Frame for every authenticated route. The session bar is fixed at the top and
 * the routed view scrolls beneath it, so each view keeps its own full-height
 * layout without fighting the page for scroll.
 */
export default function AppShell({ children }) {
  return (
    <div className="shell">
      <TopNav />
      <div className="shell-body">{children}</div>
    </div>
  );
}
