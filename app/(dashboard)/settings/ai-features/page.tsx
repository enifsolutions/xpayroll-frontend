"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  FileText,
  Target,
  Award,
  Users,
  DollarSign,
  Info,
  UserSearch,
  MessageSquare,
  BarChart3,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Switcher from "@/components/ui/Switcher";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import DownloadComplianceDocLink from "@/components/recruitment/DownloadComplianceDocLink";

interface AiSettings {
  cvParsingEnabled: boolean;
  requirementSuggestionsEnabled: boolean;
  matchScoringEnabled: boolean;
  interviewSummaryEnabled: boolean;
  salaryNarrativeEnabled: boolean;
  matchScoringMaxRescoreCount: number;
  talentRediscoveryEnabled: boolean;
  chatEnabled: boolean;
  chatDailyLimitPerUser: number;
}

const EMPTY: AiSettings = {
  cvParsingEnabled: false,
  requirementSuggestionsEnabled: false,
  matchScoringEnabled: false,
  interviewSummaryEnabled: false,
  salaryNarrativeEnabled: false,
  matchScoringMaxRescoreCount: 3,
  talentRediscoveryEnabled: false,
  chatEnabled: false,
  chatDailyLimitPerUser: 50,
};

type ToggleKey = keyof AiSettings;

interface FeatureDef {
  key: ToggleKey;
  icon: React.ElementType;
  title: string;
  on: string;
  off: string;
  cost: string;
}

const FEATURES: FeatureDef[] = [
  {
    key: "cvParsingEnabled",
    icon: FileText,
    title: "CV Parsing",
    on: "Uploaded CVs are read by AI and used to pre-fill candidate fields for review.",
    off: "Recruiters type candidate details in by hand. The form works exactly the same.",
    cost: "~$0.015 per CV",
  },
  {
    key: "requirementSuggestionsEnabled",
    icon: Sparkles,
    title: "Requirement Suggestions",
    on: "A “Suggest with AI” button proposes skills for a requisition from its title and description.",
    off: "Recruiters pick skill tags from the master list themselves.",
    cost: "~$0.01 per suggestion",
  },
  {
    key: "matchScoringEnabled",
    icon: Target,
    title: "AI Match Scoring",
    on: "On top of the rule-based score, AI adds reasoning, gap analysis and suggested interview questions.",
    off: "The rule-based match score still runs — you keep the number, just not the written analysis.",
    cost: "~$0.01 per candidate scored",
  },
  {
    key: "talentRediscoveryEnabled",
    icon: UserSearch,
    title: "Talent Rediscovery",
    on: "AI scores past applicants who weren't hired against new requisitions, surfacing anyone who might fit a different role.",
    off: "Past applicants stay in the candidate pool but are never automatically re-evaluated against new openings.",
    cost: "~$0.01 per candidate scored",
  },
  {
    key: "interviewSummaryEnabled",
    icon: Award,
    title: "Interview Summaries",
    on: "AI synthesises panel scorecards into a single hiring recommendation, surfacing disagreement.",
    off: "Scorecards are shown as submitted, with a weighted average.",
    cost: "~$0.01 per interview",
  },
  {
    key: "salaryNarrativeEnabled",
    icon: DollarSign,
    title: "Salary Narrative",
    on: "AI writes a short interpretation of where an offer sits against your internal pay bands.",
    off: "The salary band and pay-equity numbers are still shown — they come from your payroll data, not AI. Only the written summary is hidden.",
    cost: "~$0.01 per offer",
  },
  {
    key: "chatEnabled",
    icon: MessageSquare,
    title: "Ask AI Chat",
    on: "A chat assistant on the dashboard answers questions about your company's data and how to use XpayRoll.",
    off: "The Ask AI chat button doesn’t appear anywhere in the app. Every screen and report works exactly the same without it.",
    cost: "~$0.02 per message",
  },
];

interface AiUsageRow {
  feature: string;
  callCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number;
}

const FEATURE_LABELS: Record<string, string> = {
  cv_parse: "CV Parsing",
  match_score: "AI Match Scoring",
  interview_summary: "Interview Summaries",
  offer_narrative: "Salary Narrative",
  talent_rediscovery: "Talent Rediscovery",
  ask_ai: "Ask AI Chat",
};

export default function AiFeaturesPage() {
  useRequirePermission("Settings.Company.View");
  const canManage = usePermission(Permissions.Settings.Company.Manage);
  const canViewUsage = usePermission(Permissions.Ai.Chat.ViewUsage);

  const initialized = useRef(false);
  const [settings, setSettings] = useState<AiSettings>(EMPTY);
  const [original, setOriginal] = useState<AiSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<AiSettings>("/company/ai-settings");
      const merged = { ...EMPTY, ...data };
      setSettings(merged);
      setOriginal(merged);
    } catch (e: any) {
      showError(
        "Load failed",
        e?.response?.data?.error ?? "Could not load AI settings.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  const [usage, setUsage] = useState<AiUsageRow[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  useEffect(() => {
    if (!canViewUsage) return;
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    setUsageLoading(true);
    api
      .get<AiUsageRow[]>("/ai/chat/usage", {
        params: { from: fmt(from), to: fmt(to) },
      })
      .then(({ data }) => setUsage(data))
      .catch(() => setUsage([]))
      .finally(() => setUsageLoading(false));
  }, [canViewUsage]);

  const dirty = JSON.stringify(settings) !== JSON.stringify(original);
  const anyOn = Object.values(settings).some(Boolean);

  const toggle = (key: ToggleKey, value: boolean) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const setMaxRescoreCount = (value: number) =>
    setSettings((s) => ({
      ...s,
      matchScoringMaxRescoreCount: Math.max(1, Math.min(20, value)),
    }));

  const setChatDailyLimit = (value: number) =>
    setSettings((s) => ({
      ...s,
      chatDailyLimitPerUser: Math.max(1, Math.min(500, value)),
    }));

  const save = async () => {
    try {
      setSaving(true);
      await api.post("/company/ai-settings/save", settings);
      setOriginal(settings);
      showSuccess("AI settings saved");
    } catch (e: any) {
      showError(
        "Save failed",
        e?.response?.data?.error ?? "Could not save AI settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            AI Features
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Turn AI assistance on or off per operation. Everything works without
            AI — these only add convenience on top.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            size="sm"
            loading={saving}
            disabled={!dirty}
            onClick={save}
          >
            {dirty ? "Save Changes" : "Saved"}
          </Button>
        )}
      </div>

      {/* Principle banner */}
      <div className="rounded-lg px-4 py-3 flex items-start gap-3 bg-violet-50 dark:bg-violet-900/20">
        <Info size={18} className="text-violet-500 shrink-0 mt-0.5" />
        <div className="text-sm text-violet-700 dark:text-violet-300">
          <span className="font-medium">AI is never required.</span> Every task
          below can be done fully by hand. When a toggle is off, the AI button
          simply doesn’t appear and the manual workflow is the only one — never
          a degraded fallback.
          <div className="mt-1.5">
            <DownloadComplianceDocLink
              label="View our AI Transparency & Bias Statement"
              className="!text-violet-700 dark:!text-violet-300"
            />
          </div>
        </div>
      </div>

      {!anyOn && (
        <div className="rounded-lg px-4 py-3 text-sm bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
          All AI features are currently off. Recruitment runs entirely on manual
          workflows.
        </div>
      )}

      <div className="space-y-3">
        {FEATURES.map((f) => {
          const on = settings[f.key];
          const Icon = f.icon;
          return (
            <div key={f.key} className="card">
              <div className="card-body">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      on
                        ? "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
                        : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                    }`}
                  >
                    <Icon size={19} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="font-semibold text-gray-900 dark:text-white">
                        {f.title}
                      </h5>
                      <span className="text-xs text-gray-400">{f.cost}</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {on ? f.on : f.off}
                    </p>

                    {f.key === "matchScoringEnabled" && on && (
                      <div className="mt-3 flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <label
                          htmlFor="max-rescore-count"
                          className="text-sm text-gray-600 dark:text-gray-300"
                        >
                          Max AI scoring calls per application
                        </label>
                        <input
                          id="max-rescore-count"
                          type="number"
                          min={1}
                          max={20}
                          value={settings.matchScoringMaxRescoreCount}
                          disabled={!canManage}
                          onChange={(e) =>
                            setMaxRescoreCount(Number(e.target.value) || 1)
                          }
                          style={{
                            width: "4.5rem",
                            padding: "0.375rem 0.5rem",
                            borderRadius: "0.5rem",
                            border: "1px solid var(--border-color, #d1d5db)",
                            background: "var(--input-bg, transparent)",
                          }}
                        />
                        <span className="text-xs text-gray-400">
                          Recruiters past this limit need override permission to
                          re-score.
                        </span>
                      </div>
                    )}

                    {f.key === "chatEnabled" && on && (
                      <div className="mt-3 flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <label
                          htmlFor="chat-daily-limit"
                          className="text-sm text-gray-600 dark:text-gray-300"
                        >
                          Max chat messages per user per day
                        </label>
                        <input
                          id="chat-daily-limit"
                          type="number"
                          min={1}
                          max={500}
                          value={settings.chatDailyLimitPerUser}
                          disabled={!canManage}
                          onChange={(e) =>
                            setChatDailyLimit(Number(e.target.value) || 1)
                          }
                          style={{
                            width: "4.5rem",
                            padding: "0.375rem 0.5rem",
                            borderRadius: "0.5rem",
                            border: "1px solid var(--border-color, #d1d5db)",
                            background: "var(--input-bg, transparent)",
                          }}
                        />
                        <span className="text-xs text-gray-400">
                          Resets daily. Protects against runaway usage from a
                          single account.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 pt-1">
                    <Switcher
                      checked={on}
                      disabled={!canManage}
                      onChange={(v: boolean) => toggle(f.key, v)}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canViewUsage && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={17} className="text-violet-500" />
              <h5 className="font-semibold text-gray-900 dark:text-white text-sm">
                Usage &amp; Cost
              </h5>
              <span className="text-xs text-gray-400">Last 30 days</span>
            </div>

            {usageLoading ? (
              <div className="py-6 text-center text-sm text-gray-400">
                Loading…
              </div>
            ) : usage.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                No AI usage recorded in this period yet.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="py-2 font-medium">Feature</th>
                      <th className="py-2 font-medium text-right">Calls</th>
                      <th className="py-2 font-medium text-right">Tokens</th>
                      <th className="py-2 font-medium text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map((row) => (
                      <tr
                        key={row.feature}
                        className="border-b border-gray-50 dark:border-gray-800/50"
                      >
                        <td className="py-2 text-gray-700 dark:text-gray-300">
                          {FEATURE_LABELS[row.feature] ?? row.feature}
                        </td>
                        <td className="py-2 text-right text-gray-700 dark:text-gray-300">
                          {row.callCount.toLocaleString()}
                        </td>
                        <td className="py-2 text-right text-gray-500 dark:text-gray-400">
                          {(
                            row.totalInputTokens + row.totalOutputTokens
                          ).toLocaleString()}
                        </td>
                        <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                          ${row.estimatedCostUsd.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={3}
                        className="pt-2 text-right text-xs text-gray-400"
                      >
                        Total estimated cost
                      </td>
                      <td className="pt-2 text-right font-semibold text-gray-900 dark:text-white">
                        $
                        {usage
                          .reduce((sum, r) => sum + r.estimatedCostUsd, 0)
                          .toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Costs are approximate and billed to your organisation’s Claude API
        usage. Actual amounts depend on document size and volume.
      </p>
    </div>
  );
}
