import type { TourStep } from "@/hooks/useTour";

export const BANK_BRANCHERS_STEPS: TourStep[] = [
  {
    target: '[data-tour="bank-branches-add-button"]',
    title: "Add Branch button",
    content: "Click to add a new bank branch.",
    placement: "bottom",
  },
  {
    target: '[data-tour="bank-branches-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific bank branches.",
    placement: "bottom",
  },
  {
    target: '[data-tour="bank-branches-table-card"]',
    title: "Branch table",
    content: "View and manage all bank branch details here.",
    placement: "bottom",
  },
];
