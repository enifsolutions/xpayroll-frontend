// src/lib/tours/employeesPage.ts

import type { TourStep } from "@/hooks/useTour";

export const EMPLOYEES_PAGE_STEPS: TourStep[] = [
  {
    target: '[data-tour="add-employee-button"]',
    title: "Add an employee",
    content:
      "Start here to add a new employee — personal details first, then their contract.",
    placement: "left",
  },
  {
    target: '[data-tour="employee-filters-panel"]',
    title: "Search panel",
    content:
      "Search by name, code, or department, and filter by status, type, or branch — all from here.",
    placement: "bottom",
  },
  {
    target: '[data-tour="employee-table"]',
    title: "Your team",
    content:
      "Every employee lives here — click a row to view their full profile, or use the edit icon to make changes.",
    placement: "top",
  },
];
