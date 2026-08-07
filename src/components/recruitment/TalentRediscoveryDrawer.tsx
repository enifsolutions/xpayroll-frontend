'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Sparkles, X, UserSearch, Briefcase, GraduationCap, AlertTriangle, RefreshCw,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import api from '@/lib/axios';
import { showError, showSuccess } from '@/lib/toast';
import { usePermission } from '@/hooks/usePermission';
import { Permissions } from '@/lib/permissions';

// ============================================================================
// Types — mirrors TalentRediscoveryCandidateResultDto / RediscoverCandidatesResultDto
// (camelCase over the wire)
// ============================================================================

type FitRecommendation = 'Strong Fit' | 'Good Fit' | 'Partial Fit' | 'Weak Fit';

interface Strength {
  point: string;
  evidence: string | null;
}

interface Gap {
  point: string;
  severity: 'Low' | 'Medium' | 'High';
}

interface ScoreResult {
  rediscoveryScore: number;
  recommendation: FitRecommendation;
  strengths: Strength[];
  gaps: Gap[];
  flags: string[];
  rediscoveryLogId: string | null;
}

interface CandidateResult {
  candidateId: string;
  candidateName: string;
  currentDesignation: string | null;
  currentEmployer: string | null;
  totalExperienceYears: number | null;
  score: ScoreResult;
}

interface RediscoverRunResult {
  scored: number;
  failed: number;
  failedCandidateIds: string[];
  results: CandidateResult[];
}

const recommendationBadgeClass: Record<FitRecommendation, string> = {
  'Strong Fit': 'xp-badge xp-badge-success',
  'Good Fit': 'xp-badge xp-badge-info',
  'Partial Fit': 'xp-badge xp-badge-warning',
  'Weak Fit': 'xp-badge xp-badge-danger',
};

const severityClass: Record<Gap['severity'], string> = {
  Low: 'text-gray-500 dark:text-gray-400',
  Medium: 'text-amber-600 dark:text-amber-400',
  High: 'text-rose-600 dark:text-rose-400',
};

function scoreColor(score: number) {
  if (score >= 75) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10';
  if (score >= 50) return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10';
  return 'text-rose-600 bg-rose-50 dark:bg-rose-500/10';
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-indigo-500', 'bg-purple-500', 'bg-teal-500', 'bg-orange-500',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

// ============================================================================
// Component
// ============================================================================

export default function TalentRediscoveryDrawer({
  requisitionId,
  requisitionTitle,
  onClose,
}: {
  requisitionId: string;
  requisitionTitle: string;
  onClose: () => void;
}) {
  // Re-running an already-scored requisition costs a fresh AI call per
  // eligible candidate — only shown to callers holding the override
  // permission. Hidden, never disabled, matching the module's convention.
  const canOverride = usePermission(Permissions.Recruitment.Ai.OverrideTalentRediscovery);
  const initialized = useRef(false);

  const [loadingStored, setLoadingStored] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [loadedFromStore, setLoadedFromStore] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState<{ scored: number; failed: number } | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadStored();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStored() {
    try {
      setLoadingStored(true);
      const res = await api.get(`/requisitions/${requisitionId}/rediscover`);
      const candidates: CandidateResult[] = res.data?.candidates ?? [];
      if (candidates.length > 0) {
        setResults(candidates);
        setLoadedFromStore(true);
      }
    } catch (err: any) {
      showError(
        'Could not load existing results',
        err?.response?.data?.message ?? 'Something went wrong checking for stored rediscovery results.',
      );
    } finally {
      setLoadingStored(false);
    }
  }

  async function run() {
    try {
      setRunning(true);
      const res = await api.post(`/requisitions/${requisitionId}/rediscover`);
      const data: RediscoverRunResult = res.data;
      setResults(data.results);
      setLoadedFromStore(false);
      setLastRunSummary({ scored: data.scored, failed: data.failed });
      if (data.results.length === 0) {
        showSuccess(
          'No candidates found',
          'No past applicants from other requisitions were eligible for rediscovery.',
        );
      } else {
        showSuccess(
          'Rediscovery complete',
          `${data.scored} candidate${data.scored === 1 ? '' : 's'} scored${data.failed > 0 ? `, ${data.failed} failed` : ''}.`,
        );
      }
    } catch (err: any) {
      // Surfaces the backend's own message verbatim — e.g. the 403 when the
      // AI toggle is off, or the 403 when already run and this caller lacks
      // override permission.
      showError(
        'Could not run rediscovery',
        err?.response?.data?.message ?? 'Something went wrong running Talent Rediscovery.',
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-white p-5 shadow-2xl dark:bg-gray-900">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserSearch size={17} className="text-violet-500" />
            <h5>Talent Rediscovery</h5>
          </div>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{requisitionTitle}</p>

        {loadingStored ? (
          <div className="mt-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Checking for existing results...
          </div>
        ) : results.length === 0 ? (
          <div className="mt-6 py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              AI will look through candidates who applied to other requisitions in the
              past and were not hired, and score how well they might fit this role instead.
            </p>
            <Button
              variant="solid"
              icon={<Sparkles size={15} />}
              loading={running}
              onClick={run}
            >
              Rediscover Candidates
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {loadedFromStore && (
              <div className="text-xs text-gray-400">
                Showing the results generated earlier for this requisition.
              </div>
            )}
            {lastRunSummary && (
              <div className="text-xs text-gray-400">
                {lastRunSummary.scored} scored{lastRunSummary.failed > 0 ? `, ${lastRunSummary.failed} failed` : ''}.
              </div>
            )}

            <div className="space-y-3">
              {results.map((r) => (
                <CandidateResultCard key={r.candidateId} result={r} />
              ))}
            </div>

            {canOverride && (
              <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                <Button
                  variant="default"
                  size="sm"
                  icon={<RefreshCw size={14} />}
                  loading={running}
                  onClick={run}
                >
                  Run Again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// One candidate's card — score, recommendation badge, strengths/gaps/flags.
// ----------------------------------------------------------------------------
function CandidateResultCard({ result }: { result: CandidateResult }) {
  const [expanded, setExpanded] = useState(false);
  const { score } = result;

  return (
    <div className="rounded-lg border border-gray-100 dark:border-gray-800 p-3">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-start gap-3 text-left"
      >
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(result.candidateName)}`}>
          {initials(result.candidateName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {result.candidateName}
            </p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor(score.rediscoveryScore)}`}>
              {Math.round(score.rediscoveryScore)}%
            </span>
          </div>
          {(result.currentDesignation || result.currentEmployer) && (
            <p className="truncate text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <Briefcase size={11} />
              {result.currentDesignation}
              {result.currentDesignation && result.currentEmployer ? ' · ' : ''}
              {result.currentEmployer}
            </p>
          )}
          <span className={`inline-block mt-1.5 ${recommendationBadgeClass[score.recommendation]}`}>
            {score.recommendation}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {score.strengths.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Strengths</p>
              <ul className="space-y-1">
                {score.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-gray-500 dark:text-gray-400 pl-3 relative before:content-['•'] before:absolute before:left-0">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{s.point}</span>
                    {s.evidence ? ` — ${s.evidence}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {score.gaps.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                <GraduationCap size={12} /> Gaps
              </p>
              <ul className="space-y-1">
                {score.gaps.map((g, i) => (
                  <li key={i} className="text-xs pl-3 relative before:content-['•'] before:absolute before:left-0 text-gray-500 dark:text-gray-400">
                    {g.point}{' '}
                    <span className={`font-medium ${severityClass[g.severity]}`}>({g.severity})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {score.flags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                <AlertTriangle size={12} className="text-amber-500" /> Worth asking about
              </p>
              <ul className="space-y-1">
                {score.flags.map((f, i) => (
                  <li key={i} className="text-xs text-gray-500 dark:text-gray-400 pl-3 relative before:content-['•'] before:absolute before:left-0">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
