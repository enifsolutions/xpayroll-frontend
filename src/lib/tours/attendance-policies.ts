import type { TourStep } from "@/hooks/useTour";

export const ATTENDANCE_POLICIES_STEPS: TourStep[] = [
  {
    target: '[data-tour="attendance-policies-refresh-button"]',
    title: "Refresh button",
    content: "Refresh the list to see the latest policy information.",
    placement: "bottom",
  },
  {
    target: '[data-tour="attendance-policies-export-button"]',
    title: "Create policy button",
    content: "Export the policy data for further use or reporting.",
    placement: "bottom",
  },
  {
    target: '[data-tour="attendance-policies-add-button"]',
    title: "Edit policy button",
    content: "Add a new attendance policy or update an existing one.",
    placement: "bottom",
  },
  {
    target: '[data-tour="attendance-policies-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific attendance policies.",
    placement: "bottom",
  },
  {
    target: '[data-tour="attendance-policies-table-card"]',
    title: "Detail Table",
    content: "View and manage all attendance policy details here.",
    placement: "bottom",
  },
  {
    target: '[data-tour="attendance-policies-activity-card"]',
    title: "Activity card",
    content:
      "View recent activities and changes related to attendance policies.",
    placement: "bottom",
  },
  {
    target: '[data-tour="attendance-policies-performance-card"]',
    title: "Performance card",
    content: "View key performance information related to attendance policies.",
    placement: "bottom",
  },
];
