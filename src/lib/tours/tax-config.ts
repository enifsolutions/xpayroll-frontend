import type { TourStep } from "@/hooks/useTour";

export const TAX_CONFIG_STEPS: TourStep[] = [
  {
    target: '[data-tour="tax-config-add-button"]',
    title: "Add Configuration button",
    content: "Click to add a new tax configuration.",
    placement: "bottom",
  },
  {
    target: '[data-tour="tax-config-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific tax configurations.",
    placement: "bottom",
  },
  {
    target: '[data-tour="tax-config-table-card"]',
    title: "Configuration table",
    content: "View and manage all tax configurations here.",
    placement: "bottom",
  },
];
