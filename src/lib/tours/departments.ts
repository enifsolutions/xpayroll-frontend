import type { TourStep } from "@/hooks/useTour";

export const DEPARTMENTS_STEPS: TourStep[] = [
  {
    target: '[data-tour="departments-export-button"]',
    title: "Export button",
    content: "Click to export department data.",
    placement: "bottom",
  },
  {
    target: '[data-tour="departments-view-hierarchy-button"]',
    title: "View Hierarchy button",
    content: "Click to view the department hierarchy.",
    placement: "bottom",
  },
  {
    target: '[data-tour="departments-add-button"]',
    title: "Add Department button",
    content: "Click to add a new department.",
    placement: "bottom",
  },
  {
    target: '[data-tour="departments-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific departments.",
    placement: "bottom",
  },
  {
    target: '[data-tour="departments-table-card"]',
    title: "Departments table",
    content: "View and manage all departments here.",
    placement: "bottom",
  },
];
