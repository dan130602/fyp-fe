/* Dummy checklist templates. Read through useChecklistLibrary(), never directly. */

const CHECKLIST_LIBRARY = [
  {
    id: "investment-suitability",
    title: "Investment suitability",
    text: "9 questions for wealth-advisory conversations.",
    items: [
      "Suitability assessment completed",
      "Risk disclosure understood",
      "Fees and charges explained",
    ],
  },
  {
    id: "retail-service-quality",
    title: "Retail service quality",
    text: "7 questions for everyday-banking calls.",
    items: [
      "Identity verification completed",
      "Consent recorded",
      "Service request confirmed",
    ],
  },
  {
    id: "cards-and-lending",
    title: "Cards & lending",
    text: "8 questions for credit and payment-product conversations.",
    items: [
      "Product terms explained",
      "Affordability information captured",
      "Customer acknowledgement recorded",
    ],
  },
];

/** Structured question sets used to analyse conversations consistently. */
export function useChecklistLibrary() {
  return CHECKLIST_LIBRARY;
}
