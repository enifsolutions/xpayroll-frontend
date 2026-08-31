import type { TourStep } from "@/hooks/useTour";

export const CANDIDATES_STEPS: TourStep[] = [
  {
    target: '[data-tour="candidate-add-button"]',
    title: "Add Candidate button",
    content: "Click to add a new candidate.",
    placement: "bottom",
  },
  {
    target: '[data-tour="candidate-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific candidates.",
    placement: "bottom",
  },
  {
    target: '[data-tour="candidate-table-card"]',
    title: "Candidate table",
    content: "View and manage all candidates here.",
    placement: "bottom",
  },
];
