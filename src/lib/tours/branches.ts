import type { TourStep } from "@/hooks/useTour";

export const BRANCHES_STEPS: TourStep[] = [
  {
    target: '[data-tour="branches-export-button"]',
    title: "Export button",
    content: "Click to export branch data.",
    placement: "bottom",
  },
  {
    target: '[data-tour="branches-add-button"]',
    title: "Add Branch button",
    content: "Click to add a new branch.",
    placement: "bottom",
  },
  {
    target: '[data-tour="branches-search-panel"]',
    title: "Search panel",
    content: "Use the search panel to find specific branches.",
    placement: "bottom",
  },
  {
    target: '[data-tour="branches-table"]',
    title: "Branch table",
    content: "View and manage all branch information here.",
    placement: "bottom",
  },
  {
    target: '[data-tour="branches-tab-map"]',
    title: "Regional distribution tab",
    content: "Click here to see all your branches plotted on a map.",
    placement: "bottom",
    interactive: true,
  },
  {
    target: '[data-tour="branches-map-view"]',
    title: "Map view",
    content: "You can find your branches on the map.",
    placement: "bottom",
  },
  {
    target: '[data-tour="branches-tab-trends"]',
    title: "Growth trends tab",
    content:
      "Click here for leave, loan, and headcount trends across your branches.",
    placement: "bottom",
    interactive: true,
  },

  {
    target: '[data-tour="branches-trends-chart"]',
    title: "Trends chart",
    content: "You can view growth trends for each branch here.",
    placement: "bottom",
  },
];
