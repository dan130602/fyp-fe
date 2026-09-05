import { useChecklistLibrary } from "../../data/checklists.js";
import Button from "../shared/button.jsx";
import InfoCard from "./info-card.jsx";

/** The structured question sets applied to conversations. */
export default function ChecklistLibrary() {
  const checklists = useChecklistLibrary();
  return (
    <>
      <section className="heading">
        <div>
          <h1>Checklist library</h1>
          <p>Structured questions used to analyse conversations consistently.</p>
        </div>
        <Button variant="primary">Create checklist</Button>
      </section>
      <section className="info-grid">
        {checklists.map(({ id, ...card }) => (
          <InfoCard key={id} {...card} />
        ))}
      </section>
    </>
  );
}
