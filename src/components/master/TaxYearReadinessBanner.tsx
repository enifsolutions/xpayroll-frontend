"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, AlertOctagon } from "lucide-react";
import api from "@/lib/axios";

interface TaxYearReadiness {
  isReady: boolean;
  currentAssessmentYear: number;
  currentAssessmentLabel: string;
  currentReady: boolean;
  nextRolloverDate: string;
  nextAssessmentYear: number;
  nextAssessmentLabel: string;
  nextReady: boolean;
  daysUntilNextRollover: number;
  withinWarningWindow: boolean;
  urgent: boolean;
}

export default function TaxYearReadinessBanner() {
  const initialized = useRef(false);
  const [readiness, setReadiness] = useState<TaxYearReadiness | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    api
      .get("tax-configs/readiness")
      .then((res) => setReadiness(res.data))
      .catch(() => {
        // Non-fatal — banner just doesn't show if the check itself fails.
      });
  }, []);

  if (!readiness) return null;

  // Urgent: the assessment year we're IN right now is broken — show always,
  // no window check needed, this is an active outage.
  if (readiness.urgent) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 px-4 py-3 mb-4">
        <AlertOctagon size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-red-800 dark:text-red-200">
          <span className="font-semibold">
            PAYE tax config for the CURRENT assessment year{" "}
            {readiness.currentAssessmentLabel} is missing.
          </span>{" "}
          Every payroll run and offer statutory preview right now is showing
          APIT as LKR 0.00. Add the {readiness.currentAssessmentLabel} PAYE tax
          config and slabs as soon as possible.
        </div>
      </div>
    );
  }

  // Advance warning: upcoming rollover is close and not ready yet.
  if (readiness.withinWarningWindow) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 px-4 py-3 mb-4">
        <AlertTriangle
          size={18}
          className="text-amber-500 mt-0.5 flex-shrink-0"
        />
        <div className="text-sm text-amber-800 dark:text-amber-200">
          <span className="font-semibold">
            PAYE tax config not set up for {readiness.nextAssessmentLabel} yet.
          </span>{" "}
          Rollover is on{" "}
          {new Date(readiness.nextRolloverDate).toLocaleDateString()} (
          {readiness.daysUntilNextRollover} days away). Add it before then to
          avoid a gap.
        </div>
      </div>
    );
  }

  return null;
}
