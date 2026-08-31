import type { TourStep } from "@/hooks/useTour";

export const GROUPS_STEPS: TourStep[] = [
  {
    target: '[data-tour="groups-add-button"]',
    title: "Add Group button",
    content: "Click to add a new group.",
    placement: "bottom",
  },
  {
    target: '[data-tour="groups-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific groups.",
    placement: "bottom",
  },
  {
    target: '[data-tour="groups-table-card"]',
    title: "Group table",
    content: "View and manage all groups here.",
    placement: "bottom",
  },
];
