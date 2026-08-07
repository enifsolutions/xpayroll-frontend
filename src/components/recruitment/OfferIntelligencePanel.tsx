"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  TrendingUp,
  Users,
  Calculator,
  RefreshCw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";

interface PayBandComparison {
  bandFound: boolean;
  bandName: string | null;
  minSalary: number | null;
  midSalary: number | null;
  maxSalary: number | null;
  position: "BelowMin" | "InBand" | "AboveMax" | "Unknown";
}

interface PayEquitySnapshot {
  sufficientData: boolean;
  headcount: number;
  minSalary: number | null;
  medianSalary: number | null;
  maxSalary: number | null;
}

interface StatutoryPreview {
  gross: number;
  epfEmployee: number;
  epfEmployer: number;
  etfEmployer: number;
  estimatedAnnualApit: number;
  estimatedMonthlyApit: number;
  netMonthly: number;
  companyCtc: number;
  taxConfigFound: boolean;
}

interface OfferIntelligence {
  offerId: string;
  designationName: string;
  offeredSalary: number;
  bandComparison: PayBandComparison;
  equitySnapshot: PayEquitySnapshot;
  statutoryPreview: StatutoryPreview;
}

interface OfferNarrative {
  id: number;
  offerId: string;
  narrativeText: string;
  recommendation: string | null;
  createdAt: string;
}

function money(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `LKR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function positionBadgeClass(position: PayBandComparison["position"]) {
  switch (position) {
    case "BelowMin":
      return "xp-badge xp-badge-warning";
    case "InBand":
      return "xp-badge xp-badge-success";
    case "AboveMax":
      return "xp-badge xp-badge-danger";
    default:
      return "xp-badge xp-badge-neutral";
  }
}

function recommendationBadgeClass(rec: string | null) {
  switch (rec) {
    case "Competitive":
      return "xp-badge xp-badge-success";
    case "BelowBand":
      return "xp-badge xp-badge-warning";
    case "AboveBand":
      return "xp-badge xp-badge-warning";
    case "ReviewRecommended":
      return "xp-badge xp-badge-danger";
    default:
      return "xp-badge xp-badge-neutral";
  }
}

export default function OfferIntelligencePanel({
  offerId,
}: {
  offerId: string;
}) {
  const initialized = useRef(false);

  const [intelligence, setIntelligence] = useState<OfferIntelligence | null>(
    null,
  );
  const [narrative, setNarrative] = useState<OfferNarrative | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const canViewNarrative = usePermission(
    Permissions.Recruitment.Ai.SalaryIntelligence,
  );
  const canOverride = usePermission(
    Permissions.Recruitment.Ai.OverrideSalaryNarrative,
  );

  const load = async () => {
    try {
      setLoading(true);
      const [intelRes, aiSettingsRes] = await Promise.all([
        api.get(`offers/${offerId}/intelligence`),
        api.get("company/ai-settings"),
      ]);
      setIntelligence(intelRes.data);
      setAiEnabled(!!aiSettingsRes.data?.aiSalaryNarrativeEnabled);

      if (canViewNarrative) {
        const narrativeRes = await api.get(`offers/${offerId}/narrative`);
        setNarrative(narrativeRes.data?.narrative ?? null);
      }
    } catch (err) {
      showError("Failed to load offer intelligence");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (offerId) load();
  }, [offerId]);

  const generateNarrative = async () => {
    try {
      setGenerating(true);
      const res = await api.post(`offers/${offerId}/narrative`);
      setNarrative(res.data?.narrative ?? null);
      showSuccess("Salary narrative generated");
    } catch (err: any) {
      showError(
        err?.response?.data?.message || "Failed to generate salary narrative",
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">Loading offer intelligence…</div>
      </div>
    );
  }

  if (!intelligence) return null;

  const { bandComparison, equitySnapshot, statutoryPreview } = intelligence;

  return (
    <div className="space-y-4">
      {/* Pay Band Comparison */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-3">
            <h5 className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" /> Internal Pay
              Band
            </h5>
            {bandComparison.bandFound && (
              <span className={positionBadgeClass(bandComparison.position)}>
                {bandComparison.position}
              </span>
            )}
          </div>
          {bandComparison.bandFound ? (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">Min</div>
                <div className="font-semibold">
                  {money(bandComparison.minSalary)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Mid</div>
                <div className="font-semibold">
                  {money(bandComparison.midSalary)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Max</div>
                <div className="font-semibold">
                  {money(bandComparison.maxSalary)}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No pay band defined for this designation yet.
            </p>
          )}
        </div>
      </div>

      {/* Pay Equity Snapshot */}
      <div className="card">
        <div className="card-body">
          <h5 className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-emerald-500" /> Pay Equity Snapshot
          </h5>
          {equitySnapshot.sufficientData ? (
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-500 dark:text-gray-400">
                  Headcount
                </div>
                <div className="font-semibold">{equitySnapshot.headcount}</div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Min</div>
                <div className="font-semibold">
                  {money(equitySnapshot.minSalary)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Median</div>
                <div className="font-semibold">
                  {money(equitySnapshot.medianSalary)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 dark:text-gray-400">Max</div>
                <div className="font-semibold">
                  {money(equitySnapshot.maxSalary)}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Not enough current employees ({equitySnapshot.headcount}) in this
              designation for a meaningful equity snapshot.
            </p>
          )}
        </div>
      </div>

      {/* Statutory Preview */}
      <div className="card">
        <div className="card-body">
          <h5 className="flex items-center gap-2 mb-3">
            <Calculator size={16} className="text-amber-500" /> Statutory
            Preview (Estimate)
          </h5>
          {!statutoryPreview.taxConfigFound && (
            <p className="text-sm text-rose-500 mb-3">
              No active PAYE tax configuration found for this offer&apos;s start
              date — APIT shown below may be inaccurate. Check Tax Config
              settings.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">
                Gross (monthly)
              </div>
              <div className="font-semibold">
                {money(statutoryPreview.gross)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">
                EPF (Employee 8%)
              </div>
              <div className="font-semibold">
                {money(statutoryPreview.epfEmployee)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">
                EPF (Employer 12%)
              </div>
              <div className="font-semibold">
                {money(statutoryPreview.epfEmployer)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">ETF (3%)</div>
              <div className="font-semibold">
                {money(statutoryPreview.etfEmployer)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">
                Est. Monthly APIT
              </div>
              <div className="font-semibold">
                {money(statutoryPreview.estimatedMonthlyApit)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Net (est.)</div>
              <div className="font-semibold">
                {money(statutoryPreview.netMonthly)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">
                Company CTC
              </div>
              <div className="font-semibold">
                {money(statutoryPreview.companyCtc)}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
            Estimate only, assumes zero prior income this assessment year.
            Actual first-month APIT may differ once real year-to-date income is
            known.
          </p>
        </div>
      </div>

      {/* AI Narrative — hidden entirely if toggle is off or no permission, per AI-optional rule */}
      {aiEnabled && canViewNarrative && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-3">
              <h5 className="flex items-center gap-2">
                <Sparkles size={16} className="text-violet-500" /> AI Salary
                Narrative
              </h5>
              {narrative && narrative.recommendation && (
                <span
                  className={recommendationBadgeClass(narrative.recommendation)}
                >
                  {narrative.recommendation}
                </span>
              )}
            </div>

            {narrative ? (
              <>
                <p className="text-sm whitespace-pre-line">
                  {narrative.narrativeText}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Generated {new Date(narrative.createdAt).toLocaleString()}
                </p>
                {canOverride && (
                  <Button
                    className="mt-3"
                    icon={<RefreshCw size={15} />}
                    loading={generating}
                    onClick={generateNarrative}
                  >
                    Regenerate
                  </Button>
                )}
              </>
            ) : (
              <Button
                icon={<Sparkles size={15} />}
                loading={generating}
                onClick={generateNarrative}
              >
                Generate Narrative
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
