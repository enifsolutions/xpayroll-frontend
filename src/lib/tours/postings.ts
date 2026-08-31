import type { TourStep } from "@/hooks/useTour";

export const POSTINGS_STEPS: TourStep[] = [
  {
    target: '[data-tour="postings-add-button"]',
    title: "Add Posting button",
    content: "Click to add a new posting.",
    placement: "bottom",
  },
  {
    target: '[data-tour="postings-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific postings.",
    placement: "bottom",
  },
  {
    target: '[data-tour="postings-table-card"]',
    title: "Posting table",
    content: "View and manage all postings here.",
    placement: "bottom",
  },
];
