import { useProductionHealth } from "../../data/ablation-runs.js";

/** Live pipeline health. Read-only: nothing here changes a verdict or a config. */
export default function ProductionPanel({ live }) {
  const { deployedSince, cards } = useProductionHealth();

  return (
    <div className="prod">
      <div className="pgrid">
        <div className="card">
          <div className="cv">
            {live?.version} · {live?.sha}
          </div>
          <div className="cl">Deployed since {deployedSince}</div>
          <div className="cn">
            hybrid + bge-v2 reranker, k=5. Offline E2E was {live?.e2e}% on golden_v3.
          </div>
        </div>
        {cards.map((card) => (
          <div className="card" key={card.id}>
            <div className="cv">{card.value}</div>
            <div className="cl">{card.label}</div>
            <div className="cn">
              {card.note}
              {card.id === "escalation" && <> Offline baseline was {live?.esc}%.</>}
            </div>
          </div>
        ))}
      </div>
      <div className="slot">
        <b>Langfuse dashboard</b>
        Traces, model costs, token usage, latency and score distributions. Embedded from the
        self-hosted instance, or opened in a new tab if frame-ancestors is not configured.
      </div>
    </div>
  );
}
