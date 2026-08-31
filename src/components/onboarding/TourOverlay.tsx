"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  FloatingPortal,
} from "@floating-ui/react";
import {
  X,
  ChevronRight,
  ChevronLeft,
  MousePointerClick,
  Sparkles,
} from "lucide-react";
import type { TourStep } from "@/hooks/useTour";

interface TourOverlayProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onDismiss: () => void;
  // The upcoming step's target selector, if any — used by interactive
  // steps to confirm the click's real effect (opening a dropdown, etc.)
  // actually happened before advancing, instead of guessing a delay.
  nextStepTarget?: string;
}

export default function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrev,
  onDismiss,
  nextStepTarget,
}: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetEl, setTargetEl] = useState<Element | null>(null);
  const [targetRadius, setTargetRadius] = useState("12px");
  const [missing, setMissing] = useState(false);

  const { refs, floatingStyles } = useFloating({
    placement: step.placement ?? "bottom",
    whileElementsMounted: autoUpdate,
    middleware: [offset(16), flip(), shift({ padding: 12 })],
  });

  useEffect(() => {
    setMissing(false);
    setTargetEl(null);
    setTargetRect(null);

    let attempts = 0;
    let interval: ReturnType<typeof setInterval> | null = null;

    const tryFind = () => {
      const el = document.querySelector(step.target);
      if (el) {
        setTargetEl(el);
        refs.setReference(el);
        setTargetRect(el.getBoundingClientRect());
        // Match the actual element's rounding (0 for a flush sidebar strip,
        // 9999px for a circular FAB, etc.) instead of a hardcoded guess —
        // a mismatched corner is what made the ring look broken/invisible
        // against a square-edged target.
        const radius = window.getComputedStyle(el).borderRadius;
        setTargetRadius(radius && radius !== "0px" ? radius : "4px");
        return true;
      }
      return false;
    };

    if (!tryFind()) {
      // Target might not be mounted yet — e.g. it lives inside a collapsed
      // sidebar group that only renders on hover/pin, or inside a drawer
      // that's still animating open from a previous interactive step.
      // Retry briefly instead of vanishing instantly; if it truly never
      // appears, skip the step rather than leaving the tour stuck.
      interval = setInterval(() => {
        attempts += 1;
        if (tryFind()) {
          if (interval) clearInterval(interval);
        } else if (attempts > 10) {
          if (interval) clearInterval(interval);
          setMissing(true);
        }
      }, 150);
    }

    // Continuous sync instead of resize/scroll-only: a dropdown finishing
    // its own open animation, or any layout shift that isn't a window
    // resize/scroll, used to leave the spotlight showing a stale rect from
    // whenever it was first measured — the exact bug where the tooltip's
    // copy and the highlighted box went out of sync. rAF self-corrects
    // every frame for as long as this step is on screen.
    let rafId: number;
    const syncRect = () => {
      const fresh = document.querySelector(step.target);
      if (fresh) setTargetRect(fresh.getBoundingClientRect());
      rafId = requestAnimationFrame(syncRect);
    };
    rafId = requestAnimationFrame(syncRect);

    return () => {
      if (interval) clearInterval(interval);
      cancelAnimationFrame(rafId);
    };
  }, [step.target, refs]);

  // Interactive steps advance when the user clicks the real target —
  // the click's own normal behavior (opening a drawer, etc.) still fires
  // untouched; this just additionally calls next() alongside it. Guarded
  // with a local `fired` flag rather than relying solely on `{ once: true }`,
  // since React 18 dev-mode double-invokes effects and a bare once-listener
  // isn't safe against that on its own.
  useEffect(() => {
    if (!step.forceSidebarOpen) return;
    window.dispatchEvent(
      new CustomEvent("xp:tour-sidebar-open", { detail: { open: true } }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("xp:tour-sidebar-open", { detail: { open: false } }),
      );
    };
  }, [step.forceSidebarOpen]);

  useEffect(() => {
    if (!step.interactive || !targetEl) return;
    let fired = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const handleClick = () => {
      if (fired) return;
      fired = true;

      if (!nextStepTarget) {
        onNext();
        return;
      }

      // Wait for the NEXT step's real target to actually exist in the DOM
      // before advancing — a fixed delay was guessing at React's render
      // timing and proved unreliable. This directly confirms the click's
      // effect (opening a dropdown, etc.) actually happened, regardless
      // of how long it takes.
      let attempts = 0;
      pollId = setInterval(() => {
        attempts += 1;
        if (document.querySelector(nextStepTarget) || attempts > 24) {
          if (pollId) clearInterval(pollId);
          onNext();
        }
      }, 50);
    };

    targetEl.addEventListener("click", handleClick);
    return () => {
      targetEl.removeEventListener("click", handleClick);
      if (pollId) clearInterval(pollId);
    };
  }, [step.interactive, targetEl, onNext, nextStepTarget]);

  useEffect(() => {
    if (missing) onNext();
  }, [missing, onNext]);

  if (!targetEl || !targetRect) return null;

  const isLast = stepIndex + 1 === totalSteps;

  return (
    <FloatingPortal>
      {/* Spotlight: dark backdrop + a bold, pulsing purple ring around the
          target — radius matches the real element's own corners so it
          reads as a precise highlight, not a mismatched overlay. */}
      <motion.div
        className="fixed z-[9998] pointer-events-none"
        initial={false}
        animate={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          borderRadius: targetRadius,
          boxShadow:
            "0 0 0 9999px rgba(8, 10, 18, 0.72), 0 0 0 3px rgba(124, 58, 237, 0.95), 0 0 0 7px rgba(124, 58, 237, 0.3)",
        }}
      />
      <motion.div
        className="fixed z-[9997] pointer-events-none"
        initial={false}
        animate={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          opacity: [0.5, 0.9, 0.5],
        }}
        transition={{
          top: { duration: 0.3, ease: "easeOut" },
          left: { duration: 0.3, ease: "easeOut" },
          width: { duration: 0.3, ease: "easeOut" },
          height: { duration: 0.3, ease: "easeOut" },
          opacity: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{
          borderRadius: targetRadius,
          boxShadow: "0 0 28px 6px rgba(124, 58, 237, 0.55)",
        }}
      />
      {step.interactive && (
        <motion.div
          className="fixed z-[9999] pointer-events-none flex items-center justify-center w-6 h-6 rounded-full text-white"
          initial={false}
          animate={{
            top: targetRect.top - 14,
            left: targetRect.right - 4,
            scale: [1, 1.15, 1],
          }}
          transition={{
            top: { duration: 0.3, ease: "easeOut" },
            left: { duration: 0.3, ease: "easeOut" },
            scale: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{ background: "linear-gradient(135deg,#1d4ed8,#6d28d9)" }}
        >
          <MousePointerClick size={13} />
        </motion.div>
      )}

      {/* Positioning wrapper — plain div, no framer-motion transform on it.
          floating-ui writes position via CSS transform; animating scale/y
          on the SAME element with framer-motion overwrites that transform
          every render, which is why the tooltip was stuck at its first
          computed position. The animated card lives one level in instead,
          where transform is free to use for the entrance animation. */}
      <div ref={refs.setFloating} style={floatingStyles} className="z-[9999]">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            className="w-[320px] rounded-xl overflow-hidden
                       bg-[var(--xp-surface)] border border-[var(--xp-border)]
                       shadow-2xl shadow-black/30"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -6 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
          >
            {/* Header — same gradient-tint treatment as UserDropdown's profile card */}
            <div
              className="px-4 pt-4 pb-3"
              style={{
                background:
                  "linear-gradient(135deg, rgba(29,78,216,0.10) 0%, rgba(109,40,217,0.10) 100%)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <motion.div
                    className="flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 text-white"
                    style={{
                      background: "linear-gradient(135deg,#1d4ed8,#6d28d9)",
                    }}
                    animate={{
                      rotate: [0, -12, 12, -8, 8, 0],
                      scale: [1, 1.08, 1],
                    }}
                    transition={{
                      duration: 1.6,
                      repeat: Infinity,
                      repeatDelay: 1.2,
                      ease: "easeInOut",
                    }}
                  >
                    <Sparkles size={12} />
                  </motion.div>
                  <h5 className="text-sm font-semibold text-[var(--xp-text-1)] leading-snug">
                    {step.title}
                  </h5>
                </div>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="text-[var(--xp-text-3)] hover:text-[var(--xp-text-1)] p-0.5 rounded-md transition-colors flex-shrink-0"
                  aria-label="Skip tour"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08, duration: 0.2 }}
            >
              <div className="px-4 py-3">
                <p className="text-xs text-[var(--xp-text-2)] leading-relaxed">
                  {step.content}
                </p>
              </div>

              <div className="flex items-center justify-between px-4 pb-4">
                {/* Progress dots instead of a bare "1/5" label */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <span
                      key={i}
                      className="rounded-full transition-all duration-200"
                      style={{
                        width: i === stepIndex ? 14 : 5,
                        height: 5,
                        background:
                          i === stepIndex
                            ? "linear-gradient(135deg,#1d4ed8,#6d28d9)"
                            : i < stepIndex
                              ? "rgba(124,58,237,0.4)"
                              : "var(--xp-border)",
                      }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {stepIndex > 0 && (
                    <button
                      type="button"
                      onClick={onPrev}
                      className="flex items-center gap-0.5 text-xs font-medium text-[var(--xp-text-2)] hover:text-[var(--xp-text-1)] px-2 py-1.5 rounded-md hover:bg-[var(--xp-surface-hi)] transition-colors"
                    >
                      <ChevronLeft size={13} />
                      Back
                    </button>
                  )}
                  {step.interactive ? (
                    <button
                      type="button"
                      onClick={onNext}
                      className="text-xs font-medium text-[var(--xp-text-3)] hover:text-[var(--xp-text-1)] px-2 py-1.5 rounded-md hover:bg-[var(--xp-surface-hi)] transition-colors"
                    >
                      Skip this step
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onNext}
                      className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-md transition-transform hover:scale-[1.03]"
                      style={{
                        background: "linear-gradient(135deg,#1d4ed8,#6d28d9)",
                      }}
                    >
                      {isLast ? "Done" : "Next"}
                      {!isLast && <ChevronRight size={13} />}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </FloatingPortal>
  );
}
