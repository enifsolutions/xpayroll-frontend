"use client";

import { useEffect, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { showSuccess, showError } from "@/lib/toast";
import api from "@/lib/axios";
import { Star, Lock, Eye, X } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type Recommendation = "StrongHire" | "Hire" | "NoHire" | "StrongNoHire";

interface TemplateCriterion {
  id: string;
  name: string;
  description?: string;
  weight: number;
}

interface CriterionScoreInput extends TemplateCriterion {
  score: number;
  maxScore: number;
  comment: string;
}

interface ScorecardSubmission {
  id: string;
  interviewId: string;
  panelistEmployeeId: string;
  panelistName: string;
  isOwn: boolean;
  criteriaScores:
    | {
        id: string;
        name: string;
        weight: number;
        score: number;
        maxScore: number;
        comment?: string;
      }[]
    | null;
  overallScore: number | null;
  strengths: string | null;
  concerns: string | null;
  recommendation: Recommendation;
  submittedAt: string;
  updatedAt: string | null;
}

const recommendationLabel: Record<Recommendation, string> = {
  StrongHire: "Strong Hire",
  Hire: "Hire",
  NoHire: "No Hire",
  StrongNoHire: "Strong No Hire",
};

const recommendationBadgeClass: Record<Recommendation, string> = {
  StrongHire: "xp-badge xp-badge-success",
  Hire: "xp-badge xp-badge-info",
  NoHire: "xp-badge xp-badge-warning",
  StrongNoHire: "xp-badge xp-badge-danger",
};

const MAX_SCORE = 10; // fixed 0-10 scale per criterion, matches SP's weighted-average normalization

// ============================================================================
// Component
// ============================================================================

export default function InterviewScorecardDialog({
  interviewId,
  scorecardTemplateId,
  onClose,
  onSubmitted,
}: {
  interviewId: string;
  scorecardTemplateId: string | null;
  onClose: () => void;
  onSubmitted?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [criteria, setCriteria] = useState<CriterionScoreInput[]>([]);
  const [strengths, setStrengths] = useState("");
  const [concerns, setConcerns] = useState("");
  const [recommendation, setRecommendation] = useState<Recommendation | "">("");

  const [ownSubmission, setOwnSubmission] =
    useState<ScorecardSubmission | null>(null);
  const [otherSubmissions, setOtherSubmissions] = useState<
    ScorecardSubmission[]
  >([]);
  const [templateMissing, setTemplateMissing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);

      const scorecardsRes = await api.get(
        `/interview-scorecards/interview/${interviewId}`,
      );
      const all: ScorecardSubmission[] = scorecardsRes.data;
      const mine = all.find((s) => s.isOwn) ?? null;
      setOwnSubmission(mine);
      setOtherSubmissions(all.filter((s) => !s.isOwn));

      if (!scorecardTemplateId) {
        setTemplateMissing(true);
        setLoading(false);
        return;
      }

      // Real route: GET /scorecard-templates?id=... returns an array
      // (filtered list, not a single-object /{id} route)
      const templateRes = await api.get(`/scorecard-templates`, {
        params: { id: scorecardTemplateId },
      });
      const template = templateRes.data?.[0];
      if (!template) {
        setTemplateMissing(true);
        setLoading(false);
        return;
      }
      const templateCriteria: TemplateCriterion[] = template.criteria;

      if (mine?.criteriaScores) {
        // pre-fill from own existing submission (edit mode)
        setCriteria(
          templateCriteria.map((c) => {
            const existing = mine.criteriaScores!.find((s) => s.id === c.id);
            return {
              ...c,
              score: existing?.score ?? 0,
              maxScore: MAX_SCORE,
              comment: existing?.comment ?? "",
            };
          }),
        );
        setStrengths(mine.strengths ?? "");
        setConcerns(mine.concerns ?? "");
        setRecommendation(mine.recommendation);
      } else {
        setCriteria(
          templateCriteria.map((c) => ({
            ...c,
            score: 0,
            maxScore: MAX_SCORE,
            comment: "",
          })),
        );
      }
    } catch (err) {
      showError("Failed to load", "Could not load the scorecard.");
    } finally {
      setLoading(false);
    }
  }

  function updateCriterion(
    id: string,
    field: "score" | "comment",
    value: string | number,
  ) {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  }

  async function handleSubmit() {
    if (!recommendation) {
      showError(
        "Missing recommendation",
        "Select a recommendation before submitting.",
      );
      return;
    }
    if (criteria.length === 0) {
      showError(
        "Missing scores",
        "No criteria to score — check the scorecard template.",
      );
      return;
    }

    try {
      setSaving(true);
      await api.post("/interview-scorecards/save", {
        id: ownSubmission?.id ?? null,
        action: ownSubmission ? "UPDATE" : "ADD",
        interviewId: ownSubmission ? null : interviewId,
        criteriaScores: criteria.map((c) => ({
          id: c.id,
          name: c.name,
          weight: c.weight,
          score: c.score,
          maxScore: c.maxScore,
          comment: c.comment || null,
        })),
        strengths: strengths || null,
        concerns: concerns || null,
        recommendation,
      });
      showSuccess(
        "Submitted",
        ownSubmission ? "Scorecard updated." : "Scorecard submitted.",
      );
      onSubmitted?.();
      onClose();
    } catch (err: any) {
      showError(
        "Submit failed",
        err?.response?.data?.message ?? "Could not submit the scorecard.",
      );
    } finally {
      setSaving(false);
    }
  }

  const weightSum = criteria.reduce((sum, c) => sum + c.weight, 0);

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      onRequestClose={onClose}
      width={640}
    >
      <div className="flex items-center justify-between">
        <h5>
          {ownSubmission ? "Edit Your Scorecard" : "Score This Interview"}
        </h5>
        <button onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
          Loading...
        </div>
      ) : templateMissing ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
          No scorecard template is assigned to this interview — nothing to
          score.
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-4">
            {criteria.map((c) => (
              <div
                key={c.id}
                className="border-b border-gray-100 dark:border-gray-700 pb-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    {c.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {c.description}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    Weight {c.weight}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={MAX_SCORE}
                    value={c.score}
                    onChange={(e) =>
                      updateCriterion(c.id, "score", Number(e.target.value))
                    }
                    className="flex-1"
                  />
                  <span className="w-12 text-right font-semibold">
                    {c.score}/{MAX_SCORE}
                  </span>
                </div>
                <Input
                  className="mt-2"
                  placeholder="Comment (optional)"
                  value={c.comment}
                  onChange={(e) =>
                    updateCriterion(c.id, "comment", e.target.value)
                  }
                />
              </div>
            ))}
            {weightSum !== 100 && (
              <div className="text-xs text-amber-600">
                Note: this template's weights sum to {weightSum}%, not 100% —
                overall score may not read as expected.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="col-span-2">
              <label className="form-label">Strengths</label>
              <textarea
                className="input w-full"
                rows={2}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Concerns</label>
              <textarea
                className="input w-full"
                rows={2}
                value={concerns}
                onChange={(e) => setConcerns(e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className="form-label">Recommendation</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(recommendationLabel) as Recommendation[]).map(
                  (r) => (
                    <button
                      key={r}
                      onClick={() => setRecommendation(r)}
                      className={`px-3 py-1.5 rounded-lg text-sm border ${
                        recommendation === r
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {recommendationLabel[r]}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="plain" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="solid" loading={saving} onClick={handleSubmit}>
              {ownSubmission ? "Update Scorecard" : "Submit Scorecard"}
            </Button>
          </div>

          {/* Other panellists' scorecards — backend already enforces anti-anchoring;
              this list is simply empty until the caller either submits their own
              or holds Recruitment.Interview.ViewAllScorecards. No client-side
              gating logic needed or trusted here. */}
          {otherSubmissions.length > 0 && (
            <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-1.5 text-sm font-medium mb-3">
                <Eye size={14} />
                Other Panellists
              </div>
              <div className="space-y-3">
                {otherSubmissions.map((s) => (
                  <div
                    key={s.id}
                    className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {s.panelistName}
                      </span>
                      <span
                        className={recommendationBadgeClass[s.recommendation]}
                      >
                        {recommendationLabel[s.recommendation]}
                      </span>
                    </div>
                    {s.overallScore !== null && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Overall: {s.overallScore.toFixed(1)}/10
                      </div>
                    )}
                    {s.strengths && (
                      <div className="text-xs mt-1">
                        <span className="text-gray-400">Strengths:</span>{" "}
                        {s.strengths}
                      </div>
                    )}
                    {s.concerns && (
                      <div className="text-xs mt-1">
                        <span className="text-gray-400">Concerns:</span>{" "}
                        {s.concerns}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!ownSubmission && otherSubmissions.length === 0 && (
            <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-400">
              <Lock size={12} />
              Other panellists' scores are hidden until you submit your own.
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
