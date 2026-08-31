"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTourStore, TourStatus } from "@/store/tourStore";
import {
  getOnboardingStatus,
  saveOnboardingProgress,
  resetOnboarding,
} from "@/lib/onboarding-api";

export interface TourStep {
  target: string; // CSS selector for the element to spotlight
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
  // When true, the step advances by the user clicking the real target
  // element itself (e.g. "click Widgets to open the customise drawer")
  // instead of the tooltip's Next button. The click's own normal behavior
  // still fires — this only additionally calls next() alongside it.
  interactive?: boolean;
  // When true, dispatches a window event telling Sidebar.tsx to stay
  // hover-expanded for the duration of this step, regardless of actual
  // mouse position — needed for targets that only render when the
  // sidebar is expanded (e.g. sidebar-logout). Clicking "Next" on the
  // previous step moves the mouse off the sidebar, which would otherwise
  // collapse it before this step's target ever exists.
  forceSidebarOpen?: boolean;
}

interface UseTourOptions {
  autoStart?: boolean; // default true: shows the tour automatically the first time
  base?: string; // '/onboarding' (admin, default) or '/portal/onboarding'
}

export function useTour(
  tourKey: string,
  steps: TourStep[],
  options: UseTourOptions = {},
) {
  const { autoStart = true, base = "/onboarding" } = options;
  const { progress, hydrate, setLocal, clearLocal } = useTourStore();

  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const hydratedRef = useRef(false);
  const decidedRef = useRef(false);

  const local = progress[tourKey];
  const prevLocalRef = useRef(local);

  // Hydrate local cache from backend once per session per base surface.
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    getOnboardingStatus(base)
      .then((rows) => hydrate(rows))
      .catch(() => {
        // Offline or first paint before auth settles — fall back to
        // whatever's already cached in localStorage, fail silently.
      });
  }, [base, hydrate]);

  // Decide once whether to auto-show, after we know the real/cached status.
  useEffect(() => {
    const prevLocal = prevLocalRef.current;
    prevLocalRef.current = local;

    // A defined -> undefined transition means the row was actually reset
    // (the profile page's Replay control called resetOnboarding + cleared
    // the local cache) — not just a normal STEP update, which always keeps
    // `local` defined. Without this, decidedRef stays true for the entire
    // browser session (DashboardLayout never remounts on navigation), so a
    // genuine Replay would reset the data but the hook would never notice
    // and re-show the tour.
    if (prevLocal && !local) {
      decidedRef.current = false;
    }

    if (!autoStart || decidedRef.current) return;

    if (local?.status === "Completed" || local?.status === "Dismissed") {
      decidedRef.current = true;
      return;
    }

    if (local?.status === "InProgress") {
      decidedRef.current = true;
      setStepIndex(Math.min(local.currentStep - 1, steps.length - 1));
      setVisible(true);
      return;
    }

    if (!hydratedRef.current) return; // wait for the hydrate call to resolve first

    // No row at all — first time this user has seen this tour (or it was
    // just reset via Replay).
    decidedRef.current = true;
    setLocal(tourKey, "InProgress", 1);
    saveOnboardingProgress(tourKey, "START", 1, base).catch(() => {});
    setStepIndex(0);
    setVisible(true);
  }, [local, autoStart, tourKey, base, steps.length, setLocal]);

  const next = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= steps.length) {
      setVisible(false);
      setLocal(tourKey, "Completed", steps.length);
      saveOnboardingProgress(tourKey, "COMPLETE", steps.length, base).catch(
        () => {},
      );
      return;
    }
    setStepIndex(nextIndex);
    setLocal(tourKey, "InProgress", nextIndex + 1);
    saveOnboardingProgress(tourKey, "STEP", nextIndex + 1, base).catch(
      () => {},
    );
  }, [stepIndex, steps.length, tourKey, base, setLocal]);

  const prev = useCallback(() => {
    if (stepIndex === 0) return;
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setLocal(tourKey, "Dismissed", stepIndex + 1);
    saveOnboardingProgress(tourKey, "DISMISS", stepIndex + 1, base).catch(
      () => {},
    );
  }, [stepIndex, tourKey, base, setLocal]);

  // Used by the profile page's "Replay" button.
  const replay = useCallback(async () => {
    await resetOnboarding(tourKey, base).catch(() => {});
    clearLocal(tourKey);
    setStepIndex(0);
    decidedRef.current = true;
    setLocal(tourKey, "InProgress", 1);
    saveOnboardingProgress(tourKey, "START", 1, base).catch(() => {});
    setVisible(true);
  }, [tourKey, base, clearLocal, setLocal]);

  return {
    visible,
    step: steps[stepIndex],
    stepIndex,
    totalSteps: steps.length,
    status: local?.status as TourStatus | undefined,
    next,
    prev,
    dismiss,
    replay,
    nextStep: steps[stepIndex + 1],
  };
}
