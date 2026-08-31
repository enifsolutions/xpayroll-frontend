import type { TourStep } from "@/hooks/useTour";

export const BIO_METRIC_BINDINGS_STEPS: TourStep[] = [
  {
    target: '[data-tour="biometric-bindings-add-button"]',
    title: "Add Binding button",
    content: "Click to add a new biometric binding.",
    placement: "bottom",
  },
  {
    target: '[data-tour="biometric-bindings-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific biometric bindings.",
    placement: "bottom",
  },
  {
    target: '[data-tour="biometric-bindings-table-card"]',
    title: "Binding table",
    content: "View and manage all biometric bindings here.",
    placement: "bottom",
  },
];
