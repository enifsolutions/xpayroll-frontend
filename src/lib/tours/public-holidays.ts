import type { TourStep } from "@/hooks/useTour";

export const PUBLIC_HOLIDAYS_STEPS: TourStep[] = [
  {
    target: '[data-tour="public-holidays-refresh-button"]',
    title: "Refresh button",
    content: "Click to refresh the list of public holidays.",
    placement: "bottom",
  },
  {
    target: '[data-tour="public-holidays-add-button"]',
    title: "Add Holiday button",
    content: "Click to add a new public holiday.",
    placement: "bottom",
  },
  {
    target: '[data-tour="public-holidays-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific public holidays.",
    placement: "bottom",
  },
  {
    target: '[data-tour="public-holidays-import-button"]',
    title: "Import button",
    content: "Click to import public holidays from an ICS file.",
    placement: "bottom",
  },
  {
    target: '[data-tour="public-holidays-table-card"]',
    title: "Holiday table",
    content: "View and manage all public holidays here.",
    placement: "bottom",
  },
];
