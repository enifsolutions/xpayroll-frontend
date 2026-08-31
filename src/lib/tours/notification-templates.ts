import type { TourStep } from "@/hooks/useTour";

export const NOTIFICATION_TEMPLATES_STEPS: TourStep[] = [
  {
    target: '[data-tour="notification-templates-add-button"]',
    title: "Add Template button",
    content: "Click to add a new notification template.",
    placement: "bottom",
  },
  {
    target: '[data-tour="notification-templates-filter-row"]',
    title: "Filter row",
    content: "Use the filters to quickly find specific notification templates.",
    placement: "bottom",
  },
  {
    target: '[data-tour="notification-templates-table-card"]',
    title: "Template table",
    content: "View and manage all notification templates here.",
    placement: "bottom",
  },
];
