import type { TourStep } from "@/hooks/useTour";

export const LEAVE_TYPES_STEPS: TourStep[] = [
  {
    target: '[data-tour="leave-types-add-button"]',
    title: "Add Leave Type button",
    content: "Click to add a new leave type.",
    placement: "bottom",
  },
  {
    target: '[data-tour="leave-types-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific leave types.",
    placement: "bottom",
  },
  {
    target: '[data-tour="leave-types-table-card"]',
    title: "Leave Types table",
    content: "View and manage all leave types here.",
    placement: "bottom",
  },
];
