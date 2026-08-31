// src/lib/tours/globalWelcome.ts
//
// Simplified scope: Menu, Ask AI, Notifications, Help Center, Theme
// Selector, Profile Dropdown, Logout (sidebar), Refresh, Widgets.
// No interactive/click-to-advance steps — every target here is always
// visible without needing a prior click to reveal it, which removes the
// whole class of open-dropdown-timing bugs from earlier iterations.
//
// `sidebar-logout` is placed second (right after the sidebar overview)
// deliberately — it only renders while the sidebar is hover-expanded
// (Sidebar.tsx), and the mouse is naturally still near the sidebar right
// after step 1.

import type { TourStep } from "@/hooks/useTour";

export const GLOBAL_WELCOME_STEPS: TourStep[] = [
  {
    target: '[data-tour="sidebar-nav"]',
    title: "Welcome to XpayRoll",
    content:
      "This is your main navigation — everything from Employees to Payroll to Reports lives here, grouped by module.",
    placement: "right",
  },
  {
    target: '[data-tour="sidebar-logout"]',
    title: "Sign out",
    content:
      "You can sign out any time right from here in the navigation panel.",
    placement: "right",
    forceSidebarOpen: true,
  },
  {
    target: '[data-tour="ask-ai"]',
    title: "Ask AI",
    content:
      "Stuck on something? Ask AI can answer questions about your data and walk you through features — click here any time.",
    placement: "left",
  },
  {
    target: '[data-tour="notifications-bell"]',
    title: "Notifications",
    content:
      "Approvals, alerts, and system messages show up here — you'll never miss something waiting on you.",
    placement: "bottom",
  },
  {
    target: '[data-tour="help-center"]',
    title: "Help Center",
    content:
      "Guides and documentation are one click away whenever you need them.",
    placement: "bottom",
  },
  {
    target: '[data-tour="theme-selector"]',
    title: "Theme",
    content: "Switch between light and dark mode to suit your eyes.",
    placement: "bottom",
  },
  {
    target: '[data-tour="user-menu"]',
    title: "Your profile",
    content:
      "Manage your account, permissions, and settings from your profile menu.",
    placement: "bottom",
  },
  {
    target: '[data-tour="refresh-button"]',
    title: "Refresh",
    content:
      "Pull the latest numbers into your dashboard any time without reloading the page.",
    placement: "bottom",
  },
  {
    target: '[data-tour="widgets-button"]',
    title: "Widgets",
    content:
      "Show, hide, resize, and reorder your dashboard cards to fit how you work.",
    placement: "bottom",
  },
];
