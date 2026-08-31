import type { TourStep } from "@/hooks/useTour";

export const PIPELINE_STEPS: TourStep[] = [
  {
    target: '[data-tour="pipeline-refresh-button"]',
    title: "Refresh button",
    content: "Click to refresh the pipeline.",
    placement: "bottom",
  },
  {
    target: '[data-tour="pipeline-add-button"]',
    title: "Add Pipeline button",
    content: "Click to add a new pipeline.",
    placement: "bottom",
  },
  {
    target: '[data-tour="pipeline-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific pipeline bindings.",
    placement: "bottom",
  },
  {
    target: '[data-tour="pipeline-canban-board"]',
    title: "Pipeline canban board",
    content:
      "View and manage all pipeline here. You can drag and drop candidates between stages to update their status",
    placement: "bottom",
  },
  {
    target: '[data-tour="pipeline-closed-pipeline-card"]',
    title: "Closed Pipeline table",
    content: "View all closed pipelines here.",
    placement: "bottom",
  },
];
