import type { TourStep } from "@/hooks/useTour";

export const SHIFTS_STEPS: TourStep[] = [
  {
    target: '[data-tour="shifts-add-button"]',
    title: "Add Shift button",
    content: "Click to add a new shift.",
    placement: "bottom",
  },
  {
    target: '[data-tour="shifts-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific shifts.",
    placement: "bottom",
  },
  {
    target: '[data-tour="shifts-table-card"]',
    title: "Shifts table",
    content: "View and manage all shifts here.",
    placement: "bottom",
  },
];
