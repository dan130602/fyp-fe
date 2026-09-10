import { Button } from "@/components/ui/button.tsx";
import { useChecklistLibrary } from "../../data/checklists.js";
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
        <Button>Create checklist</Button>
      </section>
      <section className="info-grid">
        {checklists.map(({ id, ...card }) => (
          <InfoCard key={id} {...card} />
        ))}
      </section>
    </>
  );
}
