import type { TourStep } from "@/hooks/useTour";

export const DEVICES_STEPS: TourStep[] = [
  {
    target: '[data-tour="device-add-button"]',
    title: "Add Device button",
    content: "Click to add a new device.",
    placement: "bottom",
  },
  {
    target: '[data-tour="device-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific devices.",
    placement: "bottom",
  },
  {
    target: '[data-tour="device-table-card"]',
    title: "Device table",
    content: "View and manage all devices here.",
    placement: "bottom",
  },
];
