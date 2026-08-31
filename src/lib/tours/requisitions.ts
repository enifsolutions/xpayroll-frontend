import type { TourStep } from "@/hooks/useTour";

export const REQUISITIONS_STEPS: TourStep[] = [
  {
    target: '[data-tour="requisitions-add-button"]',
    title: "Add Requisition button",
    content: "Click to add a new requisition.",
    placement: "bottom",
  },
  {
    target: '[data-tour="requisitions-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific requisitions.",
    placement: "bottom",
  },
  {
    target: '[data-tour="requisitions-table-card"]',
    title: "Requisition table",
    content: "View and manage all requisitions here.",
    placement: "bottom",
  },
];
