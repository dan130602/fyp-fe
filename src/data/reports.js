/* Dummy report summaries. Read through useReportSummaries(), never directly. */

const REPORT_SUMMARIES = [
  {
    id: "operational",
    title: "Operational performance",
    text: "Review turnaround, backlog, and checklist completion by business area.",
    items: ["42 calls processed today", "78% checklist completion", "17 outstanding items"],
  },
  {
    id: "model-evaluation",
    title: "Model evaluation",
    text: "Document answer correctness, evidence relevance, and reviewer agreement.",
    items: [
      "91.6% reviewer agreement",
      "Evidence citations required",
      "Unclear when evidence is insufficient",
    ],
  },
  {
    id: "compliance-outcomes",
    title: "Compliance outcomes",
    text: "Track pass, fail, and unresolved outcomes for management reporting.",
    items: ["83% pass rate today", "5% fail / escalated", "12% pending human review"],
  },
];

/** Management-facing report cards shown on the officer's reports page. */
export function useReportSummaries() {
  return REPORT_SUMMARIES;
}
