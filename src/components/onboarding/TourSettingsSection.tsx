"use client";

import { Compass } from "lucide-react";
import { useTourStore } from "@/store/tourStore";
import { resetOnboarding } from "@/lib/onboarding-api";
import { showSuccess } from "@/lib/toast";

interface RegisteredTour {
  tourKey: string;
  label: string;
  description: string;
}

// Add an entry here whenever a new page ships a tour.
const REGISTERED_TOURS: RegisteredTour[] = [
  // ___ Admin Dashboard __________
  {
    tourKey: "admin-global-welcome",
    label: "Welcome tour",
    description: "The guided walkthrough shown when you first sign in.",
  },
  // ___ Mastrer Data Pages _______
  {
    tourKey: "admin-page-branches",
    label: "Branches page",
    description: "A quick tour of adding, searching, and managing branches.",
  },
  {
    tourKey: "admin-page-departments",
    label: "Departments page",
    description: "A quick tour of adding, searching, and managing departments.",
  },
  {
    tourKey: "admin-page-designations",
    label: "Designations page",
    description:
      "A quick tour of adding, searching, and managing designations.",
  },
  {
    tourKey: "admin-page-shifts",
    label: "Shifts page",
    description: "A quick tour of adding, searching, and managing shifts.",
  },
  {
    tourKey: "admin-page-leave-types",
    label: "Leave types page",
    description: "A quick tour of adding, searching, and managing leave types.",
  },
  {
    tourKey: "admin-page-statutory-rates",
    label: "Statutory rates page",
    description:
      "A quick tour of adding, searching, and managing statutory rates.",
  },
  {
    tourKey: "admin-page-tax-config",
    label: "Tax configuration page",
    description:
      "A quick tour of adding, searching, and managing tax configurations.",
  },
  {
    tourKey: "admin-page-attendance-policies",
    label: "Attendance policies page",
    description:
      "A quick tour of adding, searching, and managing attendance policies.",
  },
  {
    tourKey: "admin-page-devices",
    label: "Devices page",
    description: "A quick tour of adding, searching, and managing devices.",
  },
  {
    tourKey: "admin-page-biometric-bindings",
    label: "Biometric bindings page",
    description:
      "A quick tour of adding, searching, and managing biometric bindings.",
  },
  {
    tourKey: "admin-page-public-holidays",
    label: "Public holidays page",
    description:
      "A quick tour of adding, searching, and managing public holidays.",
  },
  {
    tourKey: "admin-page-notification-templates",
    label: "Notification templates page",
    description:
      "A quick tour of adding, searching, and managing notification templates.",
  },
  {
    tourKey: "admin-page-crews",
    label: "Crews page",
    description: "A quick tour of adding, searching, and managing crews.",
  },
  {
    tourKey: "admin-page-groups",
    label: "Groups page",
    description: "A quick tour of adding, searching, and managing groups.",
  },
  {
    tourKey: "admin-page-bank-branches",
    label: "Bank branches page",
    description:
      "A quick tour of adding, searching, and managing bank branches.",
  },
  {
    tourKey: "admin-page-employees",
    label: "Employees page",
    description: "A quick tour of adding, searching, and managing employees.",
  },
  {
    tourKey: "admin-page-contract-approvals",
    label: "Contract approvals page",
    description:
      "A quick tour of adding, searching, and managing contract approvals.",
  },
  {
    tourKey: "admin-page-requisitions",
    label: "Requisitions page",
    description:
      "A quick tour of adding, searching, and managing requisitions.",
  },
  {
    tourKey: "admin-page-postings",
    label: "Postings page",
    description: "A quick tour of adding, searching, and managing postings.",
  },
  {
    tourKey: "admin-page-candidates",
    label: "Candidates page",
    description: "A quick tour of adding, searching, and managing candidates.",
  },
  {
    tourKey: "admin-page-pipeline",
    label: "Pipeline page",
    description: "A quick tour of the pipeline functionality.",
  },
];

export default function TourSettingsSection() {
  const { progress, clearLocal } = useTourStore();

  const handleToggle = async (
    tourKey: string,
    label: string,
    currentlyQueued: boolean,
  ) => {
    if (currentlyQueued) return; // already reset — nothing further to do until it actually plays
    await resetOnboarding(tourKey).catch(() => {});
    clearLocal(tourKey);
    showSuccess(`"${label}" will play the next time you visit that page.`);
  };

  return (
    <div className="card">
      <div className="card-body">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-1">
          <Compass size={16} className="text-primary" /> Tours & Walkthroughs
        </h4>
        <p className="text-sm text-gray-500 mb-5">
          Turn a tour on to queue it up again — it'll play the next time you
          visit that page.
        </p>

        <div className="space-y-3">
          {REGISTERED_TOURS.map((tour) => {
            // Queued/"Rerun" = no progress row (freshly reset, or never run).
            // "Already ran" = a row exists (InProgress/Completed/Dismissed).
            // This reflects real persisted state, not a timed animation —
            // it stays ON until the tour actually plays and creates a row
            // again via its own START action.
            const queued = !progress[tour.tourKey];
            return (
              <div
                key={tour.tourKey}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div>
                  <p className="font-medium text-gray-700 text-sm">
                    {tour.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tour.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs font-medium ${queued ? "text-primary" : "text-gray-400"}`}
                  >
                    {queued ? "Rerun" : "Already ran"}
                  </span>
                  <button
                    onClick={() =>
                      handleToggle(tour.tourKey, tour.label, queued)
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${queued ? "bg-primary" : "bg-gray-300"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${queued ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
