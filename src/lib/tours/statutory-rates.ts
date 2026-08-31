import type { TourStep } from "@/hooks/useTour";

export const STATUTORY_RATES_STEPS: TourStep[] = [
  {
    target: '[data-tour="statutory-rates-add-button"]',
    title: "Add Rate button",
    content: "Click to add a new statutory rate.",
    placement: "bottom",
  },
  {
    target: '[data-tour="statutory-rates-export-button"]',
    title: "Export button",
    content: "Click to export the statutory rates.",
    placement: "bottom",
  },
  {
    target: '[data-tour="statutory-rates-print-button"]',
    title: "Print button",
    content: "Click to print the statutory rates.",
    placement: "bottom",
  },
  {
    target: '[data-tour="statutory-rates-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific statutory rates.",
    placement: "bottom",
  },
  {
    target: '[data-tour="statutory-rates-table-card"]',
    title: "Rate table",
    content: "View and manage all statutory rates here.",
    placement: "bottom",
  },
];
