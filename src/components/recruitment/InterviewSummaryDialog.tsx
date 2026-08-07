"use client";

import { useEffect, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { showError } from "@/lib/toast";
import api from "@/lib/axios";
import { Permissions } from "@/lib/permissions";
import { usePermission } from "@/hooks/usePermission";
import { Sparkles, X, Users, AlertTriangle, CheckCircle2 } from "lucide-react";

// ============================================================================
// Types — mirrors InterviewSummaryResultDto (camelCase over the wire)
// ============================================================================

type SummaryRecommendation =
  | "StrongHire"
  | "Hire"
  | "NoHire"
  | "StrongNoHire"
  | "NoConsensus";

interface Disagreement {
  topic: string;
  description: string;
  severity: "Low" | "Medium" | "High";
}

interface PanellistStance {
  label: string;
  panellistEmployeeId: string;
  panellistName: string;
  recommendation: string | null;
  overallScore: number | null;
  keyStance: string | null;
}

interface InterviewSummaryResult {
  recommendation: SummaryRecommendation;
  synthesis: string;
  consensus: string[];
  disagreements: Disagreement[];
  panelBreakdown: PanellistStance[];
  summaryLogId: string | null;
}

const recommendationLabel: Record<SummaryRecommendation, string> = {
  StrongHire: "Strong Hire",
  Hire: "Hire",
  NoHire: "No Hire",
  StrongNoHire: "Strong No Hire",
  NoConsensus: "No Consensus",
};

const recommendationBadgeClass: Record<SummaryRecommendation, string> = {
  StrongHire: "xp-badge xp-badge-success",
  Hire: "xp-badge xp-badge-info",
  NoHire: "xp-badge xp-badge-warning",
  StrongNoHire: "xp-badge xp-badge-danger",
  NoConsensus: "xp-badge xp-badge-warning",
};

const severityClass: Record<Disagreement["severity"], string> = {
  Low: "text-gray-500 dark:text-gray-400",
  Medium: "text-amber-600 dark:text-amber-400",
  High: "text-rose-600 dark:text-rose-400",
};

// ============================================================================
// Component
// ============================================================================

export default function InterviewSummaryDialog({
  interviewId,
  roundNumber,
  candidateName,
  onClose,
}: {
  interviewId: string;
  roundNumber: number;
  candidateName: string;
  onClose: () => void;
}) {
  // Regenerating an already-stored summary costs a fresh AI call — only
  // shown to callers holding the override permission. Hidden, never
  // disabled, matching the module's "manual/limited path is never a
  // degraded button" convention.
  const canOverride = usePermission(
    Permissions.Recruitment.Ai.OverrideInterviewSummary,
  );

  const [loadingStored, setLoadingStored] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<InterviewSummaryResult | null>(null);
  const [loadedFromStore, setLoadedFromStore] = useState(false);

  useEffect(() => {
    loadStored();
  }, []);

  async function loadStored() {
    try {
      setLoadingStored(true);
      const res = await api.get(
        `/interview-scorecards/interview/${interviewId}/summary`,
      );
      if (res.data?.summary) {
        setResult(res.data.summary);
        setLoadedFromStore(true);
      }
    } catch (err: any) {
      showError(
        "Could not load existing summary",
        err?.response?.data?.message ??
          "Something went wrong checking for a stored summary.",
      );
    } finally {
      setLoadingStored(false);
    }
  }

  async function generate() {
    try {
      setGenerating(true);
      const res = await api.post(
        `/interview-scorecards/interview/${interviewId}/summarise`,
      );
      setResult(res.data);
      setLoadedFromStore(false);
    } catch (err: any) {
      // Surfaces the backend's own message verbatim — e.g. the 403 when the
      // AI toggle is off, the 403 when a summary already exists and this
      // caller lacks override, or the 409 when no scorecards exist yet.
      showError(
        "Could not generate summary",
        err?.response?.data?.message ??
          "Something went wrong generating the AI summary.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      onRequestClose={onClose}
      width={640}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={17} className="text-violet-500" />
          <h5>
            AI Interview Summary — Round {roundNumber}
            {candidateName ? ` · ${candidateName}` : ""}
          </h5>
        </div>
        <button onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {loadingStored ? (
        <div className="mt-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Checking for an existing summary...
        </div>
      ) : !result ? (
        <div className="mt-6 py-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            AI will read every submitted scorecard for this interview and
            synthesise a single hiring recommendation — explicitly surfacing
            where panellists disagree rather than averaging it away.
          </p>
          <Button
            variant="solid"
            icon={<Sparkles size={15} />}
            loading={generating}
            onClick={generate}
          >
            Generate Summary
          </Button>
        </div>
      ) : (
        <div className="mt-4 space-y-5">
          {loadedFromStore && (
            <div className="text-xs text-gray-400">
              Showing the summary generated earlier for this interview.
            </div>
          )}

          {/* Recommendation + synthesis */}
          <div className="flex items-start gap-3">
            <span className={recommendationBadgeClass[result.recommendation]}>
              {recommendationLabel[result.recommendation]}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {result.synthesis}
          </p>

          {/* Consensus */}
          {result.consensus.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                Where the panel agreed
              </div>
              <ul className="space-y-1">
                {result.consensus.map((point, i) => (
                  <li
                    key={i}
                    className="text-sm text-gray-600 dark:text-gray-300 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-gray-400"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disagreements — the headline feature: dissent surfaced, not averaged */}
          {result.disagreements.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium mb-2">
                <AlertTriangle size={14} className="text-amber-500" />
                Where the panel diverged
              </div>
              <div className="space-y-2">
                {result.disagreements.map((d, i) => (
                  <div
                    key={i}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{d.topic}</span>
                      <span
                        className={`text-xs font-medium ${severityClass[d.severity]}`}
                      >
                        {d.severity} impact
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {d.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Panel breakdown — real names re-attached after AI reasoned name-blind */}
          {result.panelBreakdown.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-1.5 text-sm font-medium mb-3">
                <Users size={14} />
                Panel Breakdown
              </div>
              <div className="space-y-2">
                {result.panelBreakdown.map((p) => (
                  <div
                    key={p.panellistEmployeeId}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{p.panellistName}</span>
                      {p.keyStance && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {p.keyStance}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {p.overallScore !== null && (
                        <span className="text-xs text-gray-400">
                          {p.overallScore.toFixed(1)}/10
                        </span>
                      )}
                      {p.recommendation && (
                        <span
                          className={
                            recommendationBadgeClass[
                              p.recommendation as SummaryRecommendation
                            ] ?? "xp-badge xp-badge-neutral"
                          }
                        >
                          {p.recommendation}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="plain" onClick={onClose}>
              Close
            </Button>
            {canOverride && (
              <Button
                variant="default"
                size="sm"
                icon={<Sparkles size={14} />}
                loading={generating}
                onClick={generate}
              >
                Regenerate
              </Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
