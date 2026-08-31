import type { TourStep } from "@/hooks/useTour";

export const CREWS_STEPS: TourStep[] = [
  {
    target: '[data-tour="crews-add-button"]',
    title: "Add Crew button",
    content: "Click to add a new crew.",
    placement: "bottom",
  },
  {
    target: '[data-tour="crews-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific crews.",
    placement: "bottom",
  },
  {
    target: '[data-tour="crews-table-card"]',
    title: "Crews table",
    content: "View and manage all crews here.",
    placement: "bottom",
  },
];
