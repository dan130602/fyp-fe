import { useReportSummaries } from "../../data/reports.js";
import Button from "../shared/button.jsx";
import InfoCard from "./info-card.jsx";

/** Management-facing evidence: operations, model evaluation, compliance outcomes. */
export default function Reports() {
  const summaries = useReportSummaries();
  return (
    <>
      <section className="heading">
        <div>
          <h1>Reports & performance</h1>
          <p>Management evidence for operations, model evaluation, and compliance outcomes.</p>
        </div>
        <Button variant="primary">Generate review report</Button>
      </section>
      <section className="info-grid">
        {summaries.map(({ id, ...card }) => (
          <InfoCard key={id} {...card} />
        ))}
      </section>
    </>
  );
}
