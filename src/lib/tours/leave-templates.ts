import type { TourStep } from "@/hooks/useTour";

export const LEAVE_TEMPLATES_STEPS: TourStep[] = [
  {
    target: '[data-tour="leave-templates-add-button"]',
    title: "Add Template button",
    content: "Click to add a new leave template.",
    placement: "bottom",
  },
  {
    target: '[data-tour="leave-templates-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific leave templates.",
    placement: "bottom",
  },
  {
    target: '[data-tour="leave-templates-table-card"]',
    title: "Template table",
    content: "View and manage all leave templates here.",
    placement: "bottom",
  },
];
