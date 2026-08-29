/* ---------------------------------------------------------------------------
   Dummy calls, transcripts, and checklist results for the compliance officer.

   Nothing here is exported directly. Views read this module through the hooks
   at the bottom, so swapping in a real API later is a change to this file only.
--------------------------------------------------------------------------- */

const HERO_SUMMARY = {
  completionRate: "78%",
  callsProcessed: "42",
  checklistsComplete: "33",
  escalationsOpen: "4",
  highRiskCalls: 4,
  outstandingItems: 17,
};

const DASHBOARD_METRICS = [
  { label: "Calls received", value: "42", detail: "+8 from yesterday", tone: "good" },
  { label: "Checklist completion", value: "78%", detail: "9 calls awaiting items", tone: "watch" },
  { label: "Compliance pass rate", value: "83%", detail: "+3 pp against last week", tone: "good" },
  { label: "Outstanding items", value: "17", detail: "4 high-risk calls", tone: "risk" },
];

const REVIEW_PROGRESS = [
  { label: "Retail banking", value: 91, note: "11/12", tone: "good" },
  { label: "Wealth advisory", value: 67, note: "8/12", tone: "watch" },
  { label: "Cards & lending", value: 80, note: "12/15", tone: "info" },
  { label: "Service desk", value: 100, note: "2/2", tone: "good" },
];

const PRIORITY_QUEUE = [
  { id: "CC-2481", text: "Risk disclosure acknowledgement not found", tone: "risk" },
  { id: "CC-2477", text: "Identity verification evidence is unclear", tone: "watch" },
  { id: "CC-2469", text: "Potentially unsuitable product explanation", tone: "risk" },
];

const CURRENT_REVIEW = {
  id: "CC-2481",
  title: "CC-2481 · Risk disclosure review",
  context: "Wealth advisory · 09:47 today · Investment suitability v3.2",
  riskLabel: "High risk",
  riskTone: "risk",
  due: "Due in 1h 42m",
  duration: "04:38",
  waveform: "▁▃▅▂▆▃▂▅▆▃▁▅▂▆▃▅▂▁▅▆▃▂▅▆▃▁▅▂▆",
  transcript: [
    {
      time: "02:18",
      speaker: "Advisor",
      text: "I have explained that the investment value can fluctuate and you may not recover the amount invested.",
      highlight: false,
    },
    {
      time: "02:31",
      speaker: "Customer",
      text: "Could you repeat what I might lose?",
      highlight: true,
    },
  ],
  citations: [
    { time: "02:18", quote: "“I have explained that the investment value can fluctuate…”" },
    { time: "02:31", quote: "“Could you repeat what I might lose?”" },
  ],
  jumpLabel: "Jump to 02:18",
  checklist: [
    {
      title: "Risk disclosure was understood",
      outcome: "Fail",
      detail: "Customer acknowledgement not found",
      tone: "risk",
    },
    {
      title: "Suitability assessment completed",
      outcome: "Pass",
      detail: "Two supporting evidence segments",
      tone: "good",
    },
    {
      title: "Product fees were explained",
      outcome: "Unclear",
      detail: "Evidence confidence is low",
      tone: "watch",
    },
    {
      title: "Customer consent recorded",
      outcome: "Pass",
      detail: "Explicit confirmation at 03:44",
      tone: "good",
    },
  ],
};

/** Headline numbers and progress bars for the officer dashboard. */
export function useDashboardSummary() {
  return { hero: HERO_SUMMARY, metrics: DASHBOARD_METRICS, progress: REVIEW_PROGRESS };
}

/** Calls the pipeline flagged as needing a human decision first. */
export function useReviewQueue() {
  return PRIORITY_QUEUE;
}

/** The call currently open in the review workspace, with its AI checklist. */
export function useCurrentReview() {
  return CURRENT_REVIEW;
}

/** Badge count on the sidebar's review-queue entry. */
export function useOutstandingItemCount() {
  return HERO_SUMMARY.outstandingItems;
}
