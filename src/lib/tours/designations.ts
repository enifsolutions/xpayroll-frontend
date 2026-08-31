import type { TourStep } from "@/hooks/useTour";

export const DESIGNATIONS_STEPS: TourStep[] = [
  {
    target: '[data-tour="designations-export-button"]',
    title: "Export button",
    content: "Click to export designations to a CSV file.",
    placement: "bottom",
  },
  {
    target: '[data-tour="designations-add-button"]',
    title: "Add Designation button",
    content: "Click to add a new designation.",
    placement: "bottom",
  },
  {
    target: '[data-tour="designations-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific designations.",
    placement: "bottom",
  },
  {
    target: '[data-tour="designations-table-card"]',
    title: "Designation table",
    content: "View and manage all designations here.",
    placement: "bottom",
  },
];
