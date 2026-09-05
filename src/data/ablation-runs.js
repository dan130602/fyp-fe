import { useCallback, useState } from "react";

/* ---------------------------------------------------------------------------
   Dummy ablation ledger for the internal developer view.

   The arrays below are deliberately NOT exported. Components read this module
   through the hooks at the bottom of the file, so when a real backend arrives
   only the hook bodies change and no component is touched.
--------------------------------------------------------------------------- */

/* Metric groups drive the grouped table header and the delta columns.
   `invert: true` means lower is better. */
const GROUPS = [
  {
    id: "retrieval",
    label: "Retrieval",
    note: "P@5 ceiling ≈ 28% (avg 1.4 gold chunks, k=5)",
    metrics: [
      { key: "recall5", label: "R@5", fmt: "pct" },
      { key: "prec5", label: "P@5", fmt: "pct" },
      { key: "mrr", label: "MRR", fmt: "dec" },
    ],
  },
  {
    id: "answering",
    label: "Answering",
    note: "False-pass is the compliance-critical number",
    metrics: [
      { key: "evidence", label: "Evidence cov.", fmt: "pct" },
      { key: "f1", label: "Answer F1", fmt: "dec" },
      { key: "falsePass", label: "False pass", fmt: "pct", invert: true },
    ],
  },
  {
    id: "overall",
    label: "Overall",
    note: "Verdict correct AND grounded AND retrieval hit",
    metrics: [{ key: "e2e", label: "End-to-end", fmt: "pct" }],
  },
];

const KNOBS = ["rewrite", "chunk", "retrieval", "rerank", "model"];
const QIDS = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10"];
const QNAMES = {
  Q1: "Order details captured",
  Q2: "Client identity verified",
  Q3: "Product risk explained",
  Q4: "Consent recorded",
  Q5: "Suitability assessed",
  Q6: "Conflict of interest disclosed",
  Q7: "Fees and spread disclosed",
  Q8: "Off-list product approval",
  Q9: "RM conduct",
  Q10: "Vulnerable client safeguards",
};

const SEED = [
  {
    id: "R001",
    date: "21 Jul",
    name: "Baseline",
    config: {
      rewrite: "off",
      chunk: "60s",
      retrieval: "semantic",
      rerank: "none",
      model: "4o-mini",
    },
    dataset: "golden_v1",
    items: 180,
    status: "Deployed",
    version: "V1",
    current: false,
    sha: "a83f21c",
    msg: "eval: freeze baseline pipeline",
    recall5: 81.7,
    prec5: 14.1,
    mrr: 0.664,
    evidence: 84.9,
    f1: 0.791,
    falsePass: 14.2,
    e2e: 73.3,
    cost: 0.038,
    latency: 3.6,
    esc: 9.4,
    runtime: "6m 12s",
    ranBy: "edric",
    layers: { l0: 100, l1: 84.9, l5: 91.2 },
    perQ: [79, 81, 66, 84, 77, 71, 58, 80, 74, 63],
    cm: [
      [68, 9, 4, 1],
      [14, 41, 7, 0],
      [5, 6, 12, 1],
      [2, 0, 1, 9],
    ],
    rationale: "First end-to-end run. Q7 (fees) and Q10 (vulnerable client) already the weak pair.",
    decided: "Team · 22 Jul",
  },
  {
    id: "R002",
    date: "29 Jul",
    name: "Sentence-aware chunking",
    config: {
      rewrite: "off",
      chunk: "sent×4",
      retrieval: "semantic",
      rerank: "none",
      model: "4o-mini",
    },
    dataset: "golden_v2",
    items: 247,
    status: "Deployed",
    version: "V2",
    current: false,
    sha: "4c1e88b",
    msg: "ingest: sentence-boundary chunking, 4-sentence windows",
    recall5: 86.6,
    prec5: 15.4,
    mrr: 0.719,
    evidence: 88.1,
    f1: 0.834,
    falsePass: 11.1,
    e2e: 79.8,
    cost: 0.041,
    latency: 3.8,
    esc: 11.7,
    runtime: "8m 41s",
    ranBy: "edric",
    layers: { l0: 100, l1: 88.1, l5: 93.0 },
    perQ: [86, 87, 74, 89, 83, 78, 62, 86, 81, 69],
    cm: [
      [94, 8, 5, 1],
      [11, 63, 8, 0],
      [6, 5, 20, 1],
      [1, 0, 2, 22],
    ],
    rationale:
      "Fixed-window chunks were cutting disclosures mid-sentence. Biggest single grounding win in the project.",
    decided: "Team · 30 Jul",
  },
  {
    id: "R003",
    date: "05 Aug",
    name: "Query expansion (synonyms)",
    config: {
      rewrite: "off",
      chunk: "sent×4",
      retrieval: "semantic+qe",
      rerank: "none",
      model: "4o-mini",
    },
    dataset: "golden_v2",
    items: 247,
    status: "Rejected",
    version: null,
    current: false,
    sha: "5f0b7d4",
    msg: "retrieval: MAS-glossary synonym expansion",
    recall5: 88.9,
    prec5: 15.9,
    mrr: 0.741,
    evidence: 87.6,
    f1: 0.84,
    falsePass: 10.6,
    e2e: 80.9,
    cost: 0.059,
    latency: 5.2,
    esc: 12.1,
    runtime: "11m 03s",
    ranBy: "priya",
    layers: { l0: 100, l1: 87.6, l5: 92.4 },
    perQ: [87, 88, 76, 89, 84, 79, 64, 86, 82, 71],
    cm: [
      [95, 8, 4, 1],
      [10, 65, 7, 0],
      [6, 5, 20, 1],
      [1, 0, 2, 22],
    ],
    rationale:
      "+1.1 E2E for +44% cost and +1.4s latency. Hybrid BM25 gets the same lexical coverage cheaper.",
    decided: "Team · 06 Aug",
  },
  {
    id: "R004",
    date: "12 Aug",
    name: "Hybrid BM25 + vector (RRF)",
    config: {
      rewrite: "off",
      chunk: "sent×4",
      retrieval: "hybrid",
      rerank: "none",
      model: "4o-mini",
    },
    dataset: "golden_v3",
    items: 247,
    status: "Rejected",
    version: null,
    current: false,
    sha: "b19c44e",
    msg: "retrieval: reciprocal rank fusion over BM25 + vector",
    recall5: 92.3,
    prec5: 18.7,
    mrr: 0.778,
    evidence: 88.4,
    f1: 0.861,
    falsePass: 8.4,
    e2e: 84.6,
    cost: 0.044,
    latency: 4.3,
    esc: 12.9,
    runtime: "9m 58s",
    ranBy: "priya",
    layers: { l0: 100, l1: 88.4, l5: 92.8 },
    perQ: [91, 92, 82, 92, 88, 85, 71, 90, 86, 77],
    cm: [
      [99, 6, 3, 0],
      [8, 69, 5, 0],
      [5, 4, 22, 1],
      [1, 0, 1, 23],
    ],
    rationale:
      "Superseded rather than bad. Strong alone, but R006 shows the reranker captures most of this gain without a second index.",
    decided: "Team · 20 Aug",
  },
  {
    id: "R005",
    date: "19 Aug",
    name: "Proxy transcript rewrite",
    config: {
      rewrite: "ON",
      chunk: "sent×4",
      retrieval: "hybrid",
      rerank: "none",
      model: "4o-mini",
    },
    dataset: "golden_v3",
    items: 247,
    status: "Rejected",
    version: null,
    current: false,
    sha: "d91af2c",
    msg: "ingest: LLM proxy rewrite before chunking",
    recall5: 95.1,
    prec5: 21.8,
    mrr: 0.842,
    evidence: 68.9,
    f1: 0.877,
    falsePass: 7.2,
    e2e: 79.4,
    cost: 0.079,
    latency: 7.4,
    esc: 13.4,
    runtime: "16m 20s",
    ranBy: "edric",
    layers: { l0: 100, l1: 68.9, l5: 88.1 },
    perQ: [83, 85, 78, 86, 81, 79, 68, 84, 80, 73],
    cm: [
      [97, 7, 4, 0],
      [7, 71, 4, 0],
      [6, 4, 21, 1],
      [1, 0, 1, 23],
    ],
    rationale:
      "Best retrieval in the ledger, worst evidence coverage. Rewriting breaks verbatim quote matching, so cited evidence no longer resolves against the raw transcript the reviewer hears. Unusable for audit regardless of accuracy.",
    decided: "Team · 20 Aug",
  },
  {
    id: "R006",
    date: "23 Aug",
    name: "bge cross-encoder reranker",
    config: {
      rewrite: "off",
      chunk: "sent×4",
      retrieval: "hybrid",
      rerank: "bge-v2",
      model: "4o-mini",
    },
    dataset: "golden_v3",
    items: 247,
    status: "Deployed",
    version: "V3",
    current: true,
    sha: "c72d10a",
    msg: "retrieval: bge-reranker-v2-m3 over fused candidates",
    recall5: 92.3,
    prec5: 24.6,
    mrr: 0.871,
    evidence: 91.8,
    f1: 0.904,
    falsePass: 4.9,
    e2e: 88.7,
    cost: 0.061,
    latency: 5.5,
    esc: 12.6,
    runtime: "12m 44s",
    ranBy: "edric",
    layers: { l0: 100, l1: 91.8, l5: 94.6 },
    perQ: [95, 96, 88, 95, 92, 90, 79, 94, 91, 83],
    cm: [
      [103, 4, 1, 0],
      [4, 74, 4, 0],
      [3, 3, 25, 1],
      [0, 0, 1, 24],
    ],
    rationale:
      "Recall flat vs R004 but precision and MRR jump — the reranker reorders rather than finds. False pass more than halved vs V2.",
    decided: "Team · 24 Aug",
  },
  {
    id: "R007",
    date: "27 Aug",
    name: "Drop BM25, keep reranker",
    config: {
      rewrite: "off",
      chunk: "sent×4",
      retrieval: "semantic",
      rerank: "bge-v2",
      model: "4o-mini",
    },
    dataset: "golden_v3",
    items: 247,
    status: "Candidate",
    version: null,
    current: false,
    sha: "e04a9b8",
    msg: "ablation: isolate BM25 contribution under reranking",
    recall5: 91.4,
    prec5: 23.9,
    mrr: 0.858,
    evidence: 91.2,
    f1: 0.898,
    falsePass: 5.6,
    e2e: 87.9,
    cost: 0.055,
    latency: 4.9,
    esc: 12.8,
    runtime: "11m 12s",
    ranBy: "wei",
    layers: { l0: 100, l1: 91.2, l5: 94.1 },
    perQ: [94, 95, 86, 94, 91, 89, 76, 93, 90, 81],
    cm: [
      [102, 5, 1, 0],
      [5, 73, 4, 0],
      [3, 4, 24, 1],
      [0, 0, 1, 24],
    ],
    rationale:
      "Uniformly slightly worse than live, but drops the Elasticsearch index and ~10% of cost. Open question: is the second index worth 0.8 E2E?",
    decided: "Pending",
  },
  {
    id: "R008",
    date: "29 Aug",
    name: "Two-step sufficiency gate",
    config: {
      rewrite: "off",
      chunk: "sent×4",
      retrieval: "hybrid",
      rerank: "bge-v2",
      model: "4o-mini",
    },
    dataset: "golden_v3",
    items: 247,
    status: "Candidate",
    version: null,
    current: false,
    sha: "7bd3e6f",
    msg: "orchestration: sufficiency check before verdict generation",
    recall5: 92.3,
    prec5: 24.6,
    mrr: 0.871,
    evidence: 92.1,
    f1: 0.889,
    falsePass: 2.4,
    e2e: 86.5,
    cost: 0.088,
    latency: 8.1,
    esc: 26.8,
    runtime: "18m 05s",
    ranBy: "wei",
    layers: { l0: 100, l1: 92.1, l5: 95.8 },
    perQ: [90, 91, 84, 91, 87, 85, 80, 89, 86, 82],
    cm: [
      [96, 3, 9, 0],
      [2, 70, 10, 0],
      [2, 2, 27, 1],
      [0, 0, 2, 23],
    ],
    rationale: "",
    decided: "Pending",
  },
  {
    id: "R009",
    date: "31 Aug",
    name: "gpt-4.1 + revised verdict prompt",
    config: {
      rewrite: "off",
      chunk: "sent×4",
      retrieval: "hybrid",
      rerank: "bge-v2",
      model: "gpt-4.1",
    },
    dataset: "golden_v3",
    items: 247,
    status: "Candidate",
    version: null,
    current: false,
    sha: "f2a90c5",
    msg: "generation: gpt-4.1 + explicit absence-handling instructions",
    recall5: 92.3,
    prec5: 24.6,
    mrr: 0.871,
    evidence: 93.6,
    f1: 0.921,
    falsePass: 3.7,
    e2e: 90.8,
    cost: 0.094,
    latency: 6.2,
    esc: 13.1,
    runtime: "14m 31s",
    ranBy: "edric",
    layers: { l0: 100, l1: 93.6, l5: 96.2 },
    perQ: [95, 96, 89, 95, 92, 91, 81, 94, 91, 84],
    cm: [
      [105, 3, 0, 0],
      [3, 76, 3, 0],
      [2, 2, 27, 1],
      [0, 0, 1, 24],
    ],
    rationale: "",
    decided: "Pending",
  },
];

const nextVersion = (runs) => `V${runs.filter((r) => r.status === "Deployed").length + 1}`;

/** Ablation runs plus the two mutations the developer view performs on them. */
export function useAblationRuns() {
  const [runs, setRuns] = useState(SEED);

  const patchRun = useCallback(
    (id, patch) => setRuns((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    [],
  );

  const promoteRun = useCallback(
    (id) =>
      setRuns((rs) => {
        const version = nextVersion(rs);
        return rs.map((r) =>
          r.id === id
            ? { ...r, status: "Deployed", version, current: true, decided: "Team · today" }
            : { ...r, current: false },
        );
      }),
    [],
  );

  return {
    runs,
    live: runs.find((r) => r.current) ?? null,
    nextVersion: nextVersion(runs),
    patchRun,
    promoteRun,
  };
}

/** Column definition for the ablation table. */
export function useMetricGroups() {
  return GROUPS;
}

/** Pipeline knobs shown as config chips on each run. */
export function useConfigKnobs() {
  return KNOBS;
}

/** Checklist question ids and their human labels, for the per-question bars. */
export function useChecklistQuestions() {
  return { ids: QIDS, names: QNAMES };
}

/** Fixed evaluation dataset the ledger is scored against. */
export function useEvalDataset() {
  return { name: "golden_v3", items: 247, shape: "26 calls × 10 questions" };
}

/** Live production telemetry shown on the Production tab. */
export function useProductionHealth() {
  return {
    deployedSince: "24 Aug",
    cards: [
      {
        id: "agreement",
        value: "91.4%",
        label: "AI–human agreement (30d)",
        note: "Verdicts the compliance officer confirmed without changing. Falling agreement is the drift alarm.",
      },
      {
        id: "escalation",
        value: "17.2%",
        label: "Escalation rate",
        note: "Unclear verdicts routed to a human.",
      },
      {
        id: "grounding",
        value: "0.8%",
        label: "Grounding guard failures",
        note: "Quoted evidence not found verbatim in the transcript. Runs live, needs no labels.",
      },
    ],
  };
}
