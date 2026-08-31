import type { TourStep } from "@/hooks/useTour";

export const CONTRACT_APPROVALS_STEPS: TourStep[] = [
  {
    target: '[data-tour="contract-approvals-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific contract approvals.",
    placement: "bottom",
  },
  {
    target: '[data-tour="contract-approvals-table-card"]',
    title: "Approvals table",
    content: "View and manage all contract approvals here.",
    placement: "bottom",
  },
];
