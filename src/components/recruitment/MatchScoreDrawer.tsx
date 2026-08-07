"use client";

import { useState } from "react";
import {
  X,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";

// ---------- Types ----------
// Mirrors MatchScoreResultDto's serialized shape exactly (camelCase over the wire).

export interface MatchStrengthDto {
  point: string;
  evidence: string | null;
}

export interface MatchGapDto {
  point: string;
  severity: "Low" | "Medium" | "High";
}

export interface MatchReasoningDto {
  recommendation: string;
  strengths: MatchStrengthDto[];
  gaps: MatchGapDto[];
  salaryAlignment: string | null;
  flags: string[];
  suggestedQuestions: string[];
}

interface ApplicationLite {
  id: string;
  candidateName: string;
  requisitionCode: string;
  requisitionTitle: string;
  aiMatchScore: number | null;
  aiMatchReasoning: unknown;
  aiScoredAt: string | null;
  aiScoreCount: number;
}

interface MatchScoreDrawerProps {
  app: ApplicationLite;
  canScore: boolean;
  canOverrideLimit: boolean;
  maxRescoreCount: number;
  onClose: () => void;
  onScored: (
    applicationId: string,
    score: number,
    reasoning: MatchReasoningDto,
  ) => void;
}

// ---------- Helpers ----------

function scoreColor(score: number) {
  if (score >= 75)
    return "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10";
  if (score >= 50) return "text-amber-600 bg-amber-50 dark:bg-amber-500/10";
  return "text-rose-600 bg-rose-50 dark:bg-rose-500/10";
}

function recommendationBadge(rec: string) {
  switch (rec) {
    case "Strong Fit":
      return "xp-badge-success";
    case "Good Fit":
      return "xp-badge-info";
    case "Partial Fit":
      return "xp-badge-warning";
    case "Weak Fit":
      return "xp-badge-danger";
    default:
      return "xp-badge-neutral";
  }
}

function severityStyle(severity: string) {
  switch (severity) {
    case "High":
      return { badge: "xp-badge-danger", dot: "bg-rose-500" };
    case "Medium":
      return { badge: "xp-badge-warning", dot: "bg-amber-500" };
    default:
      return { badge: "xp-badge-neutral", dot: "bg-gray-400" };
  }
}

function parseReasoning(raw: unknown): MatchReasoningDto | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!("recommendation" in r)) return null;
  return {
    recommendation: String(r.recommendation ?? ""),
    strengths: Array.isArray(r.strengths)
      ? (r.strengths as MatchStrengthDto[])
      : [],
    gaps: Array.isArray(r.gaps) ? (r.gaps as MatchGapDto[]) : [],
    salaryAlignment: (r.salaryAlignment as string) || null,
    flags: Array.isArray(r.flags) ? (r.flags as string[]) : [],
    suggestedQuestions: Array.isArray(r.suggestedQuestions)
      ? (r.suggestedQuestions as string[])
      : [],
  };
}

// ---------- Component ----------

export default function MatchScoreDrawer({
  app,
  canScore,
  canOverrideLimit,
  maxRescoreCount,
  onClose,
  onScored,
}: MatchScoreDrawerProps) {
  const [scoring, setScoring] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    strengths: true,
    gaps: true,
    flags: false,
    questions: false,
  });

  const reasoning = parseReasoning(app.aiMatchReasoning);
  const hasScore = app.aiMatchScore != null;
  const limitReached = app.aiScoreCount >= maxRescoreCount;
  const canRunScore = canScore && (!limitReached || canOverrideLimit);
  const remaining = Math.max(0, maxRescoreCount - app.aiScoreCount);

  const toggle = (key: string) =>
    setOpenSections((cur) => ({ ...cur, [key]: !cur[key] }));

  const runScore = async () => {
    setScoring(true);
    try {
      const { data } = await api.post(`/applications/${app.id}/ai-score`);
      showSuccess(
        "Match scored",
        `${app.candidateName} scored ${Math.round(data.matchScore)}% — ${data.recommendation}.`,
      );
      onScored(app.id, data.matchScore, {
        recommendation: data.recommendation,
        strengths: data.strengths ?? [],
        gaps: data.gaps ?? [],
        salaryAlignment: data.salaryAlignment ?? null,
        flags: data.flags ?? [],
        suggestedQuestions: data.suggestedQuestions ?? [],
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        status === 403
          ? err?.response?.data?.message ||
            "AI match scoring is turned off for this company. The manual rule-based score is still available."
          : err?.response?.data?.message ||
            "Could not score this candidate. Try again shortly.";
      showError("Scoring failed", msg);
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h5>AI Match Score</h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {app.candidateName} · {app.requisitionCode}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* ---------- No score yet ---------- */}
        {!hasScore && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-gray-200 py-10 text-center dark:border-gray-800">
            <Sparkles size={28} className="text-indigo-400" />
            <p className="max-w-xs text-sm text-gray-500 dark:text-gray-400">
              This application hasn&apos;t been AI-scored yet. The rule-based
              match score is always available regardless — this adds reasoning,
              gap severity, and suggested interview questions on top of it.
            </p>
            {canScore && canRunScore && (
              <Button
                variant="solid"
                color="primary"
                icon={
                  scoring ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )
                }
                disabled={scoring}
                onClick={runScore}
              >
                {scoring ? "Scoring..." : "Run AI Match Score"}
              </Button>
            )}
            {canScore && !canRunScore && (
              <p className="text-xs text-rose-500">
                Scoring limit reached for this application ({maxRescoreCount}{" "}
                max).
              </p>
            )}
          </div>
        )}

        {/* ---------- Has a score ---------- */}
        {hasScore && (
          <>
            <div className="mb-4 flex items-center gap-4 rounded-lg border border-gray-100 p-4 dark:border-gray-800">
              <div
                className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-bold ${scoreColor(app.aiMatchScore!)}`}
              >
                {Math.round(app.aiMatchScore!)}%
              </div>
              <div className="min-w-0 flex-1">
                {reasoning && (
                  <span
                    className={`xp-badge ${recommendationBadge(reasoning.recommendation)}`}
                  >
                    {reasoning.recommendation}
                  </span>
                )}
                {app.aiScoredAt && (
                  <p className="mt-1 text-xs text-gray-400">
                    Scored {new Date(app.aiScoredAt).toLocaleString()}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {app.aiScoreCount} of {maxRescoreCount} AI scoring calls used
                  {limitReached && canOverrideLimit && " · override active"}
                </p>
              </div>
            </div>

            {!reasoning && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                <Info size={14} className="mt-0.5 flex-shrink-0" />
                <span>
                  This score was set without AI reasoning (manual entry, or AI
                  was off at the time). Re-run AI scoring below to add
                  explanation, gaps, and suggested questions.
                </span>
              </div>
            )}

            {reasoning && (
              <div className="flex flex-col gap-3">
                {reasoning.salaryAlignment && (
                  <div className="rounded-lg border border-gray-100 p-3 text-sm dark:border-gray-800">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                      Salary Alignment
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      {reasoning.salaryAlignment}
                    </p>
                  </div>
                )}

                {reasoning.strengths.length > 0 && (
                  <Section
                    title="Strengths"
                    count={reasoning.strengths.length}
                    open={openSections.strengths}
                    onToggle={() => toggle("strengths")}
                  >
                    <ul className="flex flex-col gap-2">
                      {reasoning.strengths.map((s, i) => (
                        <li
                          key={i}
                          className="rounded-lg bg-emerald-50 p-2.5 text-sm dark:bg-emerald-500/10"
                        >
                          <p className="font-medium text-emerald-800 dark:text-emerald-300">
                            {s.point}
                          </p>
                          {s.evidence && (
                            <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                              {s.evidence}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {reasoning.gaps.length > 0 && (
                  <Section
                    title="Gaps"
                    count={reasoning.gaps.length}
                    open={openSections.gaps}
                    onToggle={() => toggle("gaps")}
                  >
                    <ul className="flex flex-col gap-2">
                      {reasoning.gaps.map((g, i) => {
                        const style = severityStyle(g.severity);
                        return (
                          <li
                            key={i}
                            className="flex items-start gap-2 rounded-lg border border-gray-100 p-2.5 text-sm dark:border-gray-800"
                          >
                            <span
                              className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${style.dot}`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-gray-700 dark:text-gray-300">
                                {g.point}
                              </p>
                            </div>
                            <span
                              className={`xp-badge ${style.badge} flex-shrink-0`}
                            >
                              {g.severity}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </Section>
                )}

                {reasoning.flags.length > 0 && (
                  <Section
                    title="Flags to discuss"
                    count={reasoning.flags.length}
                    open={openSections.flags}
                    onToggle={() => toggle("flags")}
                  >
                    <ul className="flex flex-col gap-2">
                      {reasoning.flags.map((f, i) => (
                        <li
                          key={i}
                          className="rounded-lg bg-amber-50 p-2.5 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}

                {reasoning.suggestedQuestions.length > 0 && (
                  <Section
                    title="Suggested interview questions"
                    count={reasoning.suggestedQuestions.length}
                    open={openSections.questions}
                    onToggle={() => toggle("questions")}
                  >
                    <ul className="flex flex-col gap-2">
                      {reasoning.suggestedQuestions.map((q, i) => (
                        <li
                          key={i}
                          className="rounded-lg border border-gray-100 p-2.5 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300"
                        >
                          {q}
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </div>
            )}

            {canScore && canRunScore && (
              <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
                <Button
                  variant="plain"
                  icon={
                    scoring ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )
                  }
                  disabled={scoring}
                  onClick={runScore}
                  block
                >
                  {scoring ? "Re-scoring..." : "Re-score with AI"}
                </Button>
                {remaining <= 1 && !canOverrideLimit && (
                  <p className="mt-2 text-center text-xs text-amber-600">
                    {remaining === 1
                      ? "Last re-score before the limit is reached."
                      : "Scoring limit reached."}
                  </p>
                )}
              </div>
            )}
            {canScore && !canRunScore && (
              <div className="mt-5 border-t border-gray-100 pt-4 text-center dark:border-gray-800">
                <p className="text-xs text-rose-500">
                  Scoring limit reached for this application ({maxRescoreCount}{" "}
                  max). Ask someone with override permission to re-score it.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Collapsible section ----------

function Section({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-800">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left"
      >
        <span className="text-sm font-medium">
          {title} <span className="text-gray-400">({count})</span>
        </span>
        {open ? (
          <ChevronUp size={16} className="text-gray-400" />
        ) : (
          <ChevronDown size={16} className="text-gray-400" />
        )}
      </button>
      {open && (
        <div className="border-t border-gray-100 p-3 dark:border-gray-800">
          {children}
        </div>
      )}
    </div>
  );
}
