"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import api from "@/lib/axios";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
import { showSuccess, showError } from "@/lib/toast";
import {
  PlusIcon,
  Pencil,
  Trash2,
  Star,
  Download,
  ShieldCheck,
  Users,
  Clock,
  Timer,
  Fingerprint,
  QrCode,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Activity,
  CheckCircle2,
  PlusCircle,
  ArrowRightLeft,
  RefreshCw,
  Smartphone,
  Search,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import { useTour } from "@/hooks/useTour";
import TourOverlay from "@/components/onboarding/TourOverlay";
import { ATTENDANCE_POLICIES_STEPS } from "@/lib/tours/attendance-policies";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AttendancePolicy {
  id: string;
  name: string;
  trackingMode: string;
  trackBreaks: boolean;
  trackOvertime: boolean;
  allowSelfCheckin: boolean;
  allowBiometric: boolean;
  allowQrNfc: boolean;
  lateGraceMinutes: number;
  overtimeThresholdMinutes: number;
  isDefault: boolean;
  autoCalculateOvertime: boolean;
  preOtGraceMinutes: number;
  earlyLeaveGraceMinutes: number;
}

interface AttendancePolicyStats {
  totalPolicies: number;
  activeGroups: number;
  avgGraceMinutes: number;
  otTrackedCount: number;
}

interface AttendancePolicyActivity {
  id: string;
  action: string;
  entityId: string | null;
  policyName: string;
  changedBy: string;
  createdAt: string;
}

interface AttendancePolicyForm {
  name: string;
  trackingMode: string;
  trackBreaks: boolean;
  trackOvertime: boolean;
  allowSelfCheckin: boolean;
  allowBiometric: boolean;
  allowQrNfc: boolean;
  lateGraceMinutes: string;
  overtimeThresholdMinutes: string;
  isDefault: boolean;
  autoCalculateOvertime: boolean;
  preOtGraceMinutes: string;
  earlyLeaveGraceMinutes: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY: AttendancePolicyForm = {
  name: "",
  trackingMode: "CheckInOut",
  trackBreaks: false,
  trackOvertime: false,
  allowSelfCheckin: true,
  allowBiometric: true,
  allowQrNfc: true,
  lateGraceMinutes: "10",
  overtimeThresholdMinutes: "0",
  isDefault: false,
  autoCalculateOvertime: false,
  preOtGraceMinutes: "0",
  earlyLeaveGraceMinutes: "0",
};

const TRACKING_MODE_OPTIONS = [
  { value: "CheckInOnly", label: "Check-in Only" },
  { value: "CheckInOut", label: "Check-in / Out" },
  { value: "CheckInOutBreaks", label: "Check-in / Out + Breaks" },
];

const TRACKING_MODE_BADGE: Record<string, string> = {
  CheckInOnly:       "xp-badge-warning",
  CheckInOut:        "xp-badge-info",
  CheckInOutBreaks:  "xp-badge-success",
};

const PAGE_SIZE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function trackingLabel(mode: string) {
  return TRACKING_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode;
}

function relativeTime(iso: string): string {
  const d    = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  === 1) return "Yesterday";
  if (days  < 7)  return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function activityIcon(action: string) {
  switch (action.toUpperCase()) {
    case "INSERT": return <PlusCircle  size={13} className="text-emerald-500" />;
    case "UPDATE": return <CheckCircle2 size={13} className="text-primary" />;
    case "DELETE": return <Trash2       size={13} className="text-red-400" />;
    default:       return <ArrowRightLeft size={13} className="text-amber-500" />;
  }
}

function activityTitle(action: string): string {
  switch (action.toUpperCase()) {
    case "INSERT": return "Policy Created";
    case "UPDATE": return "Policy Updated";
    case "DELETE": return "Policy Deleted";
    default:       return "Policy Changed";
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AttendancePoliciesPage() {
  const tour = useTour(
    "admin-page-attendance-policies",
    ATTENDANCE_POLICIES_STEPS,
  );
  useRequirePermission(Permissions.MasterData.AttendancePolicies.View);
  const canManage = usePermission(
    Permissions.MasterData.AttendancePolicies.Manage,
  );

  // list + filter
  const [items, setItems] = useState<AttendancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("");
  const [page, setPage] = useState(1);

  // stats
  const [stats, setStats] = useState<AttendancePolicyStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // activity
  const [activity, setActivity] = useState<AttendancePolicyActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AttendancePolicy | null>(null);
  const [form, setForm] = useState<AttendancePolicyForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const initialized = useRef(false);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadPolicies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<AttendancePolicy[]>("/attendance-policies");
      setItems(res.data);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load attendance policies.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get<AttendancePolicyStats>(
        "/attendance-policies/stats",
      );
      setStats(res.data);
    } catch {
      /* supplementary */
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadActivity = useCallback(async () => {
    try {
      setActivityLoading(true);
      const res = await api.get<AttendancePolicyActivity[]>(
        "/attendance-policies/activity?limit=5",
      );
      setActivity(res.data);
    } catch {
      /* supplementary */
    } finally {
      setActivityLoading(false);
    }
  }, []);

  const loadAll = useCallback(() => {
    loadPolicies();
    loadStats();
    loadActivity();
  }, [loadPolicies, loadStats, loadActivity]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadAll();
  }, [loadAll]);

  // ── Filter + Pagination ────────────────────────────────────────────────────

  const filtered = items.filter((i) => {
    const matchSearch =
      !search || i.name.toLowerCase().includes(search.toLowerCase());
    const matchMode = !modeFilter || i.trackingMode === modeFilter;
    return matchSearch && matchMode;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, modeFilter]);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (item: AttendancePolicy) => {
    setEditing(item);
    setForm({
      name: item.name,
      trackingMode: item.trackingMode,
      trackBreaks: item.trackBreaks,
      trackOvertime: item.trackOvertime,
      allowSelfCheckin: item.allowSelfCheckin,
      allowBiometric: item.allowBiometric,
      allowQrNfc: item.allowQrNfc,
      lateGraceMinutes: String(item.lateGraceMinutes),
      overtimeThresholdMinutes: String(item.overtimeThresholdMinutes),
      isDefault: item.isDefault,
      autoCalculateOvertime: item.autoCalculateOvertime,
      preOtGraceMinutes: String(item.preOtGraceMinutes),
      earlyLeaveGraceMinutes: String(item.earlyLeaveGraceMinutes),
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/attendance-policies/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        name: form.name.trim(),
        trackingMode: form.trackingMode,
        trackBreaks: form.trackBreaks,
        trackOvertime: form.trackOvertime,
        allowSelfCheckin: form.allowSelfCheckin,
        allowBiometric: form.allowBiometric,
        allowQrNfc: form.allowQrNfc,
        lateGraceMinutes: parseInt(form.lateGraceMinutes) || 0,
        overtimeThresholdMinutes: parseInt(form.overtimeThresholdMinutes) || 0,
        isDefault: form.isDefault,
        autoCalculateOvertime: form.autoCalculateOvertime,
        preOtGraceMinutes: parseInt(form.preOtGraceMinutes) || 0,
        earlyLeaveGraceMinutes: parseInt(form.earlyLeaveGraceMinutes) || 0,
      });
      setDialogOpen(false);
      showSuccess(editing ? "Policy updated" : "Policy created", form.name);
      loadAll();
    } catch (err: any) {
      showError(
        "Failed to save",
        err?.response?.data?.error ?? "Could not save policy.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: AttendancePolicy) => {
    if (item.isDefault) {
      showError("Cannot delete", "The default policy cannot be deleted.");
      return;
    }
    if (!confirm(`Delete policy "${item.name}"?`)) return;
    try {
      await api.post("/attendance-policies/save", {
        action: "DELETE",
        id: item.id,
      });
      showSuccess("Policy deleted", item.name);
      loadAll();
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.error ?? "Could not delete policy.",
      );
    }
  };

  const handleExportCsv = () => {
    if (items.length === 0) return;
    const headers = [
      "Name",
      "Tracking Mode",
      "Self Check-in",
      "Biometric",
      "QR/NFC",
      "Grace (min)",
      "OT Threshold (min)",
      "Default",
    ];
    const rows = items.map((i) =>
      [
        i.name,
        trackingLabel(i.trackingMode),
        i.allowSelfCheckin ? "Yes" : "No",
        i.allowBiometric ? "Yes" : "No",
        i.allowQrNfc ? "Yes" : "No",
        i.lateGraceMinutes,
        i.overtimeThresholdMinutes,
        i.isDefault ? "Yes" : "No",
      ].join(","),
    );
    const blob = new Blob([[headers.join(","), ...rows].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_policies.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Stat cards ─────────────────────────────────────────────────────────────

  const statCards = [
    {
      label: "TOTAL POLICIES",
      value: stats?.totalPolicies ?? 0,
      sub: "All configured policies",
      icon: <ShieldCheck size={18} className="text-primary" />,
      iconBg: "bg-primary/10",
      valCls: "heading-text",
    },
    {
      label: "ACTIVE GROUPS",
      value: stats?.activeGroups ?? 0,
      sub: "With check-in methods enabled",
      icon: <Users size={18} className="text-violet-500" />,
      iconBg: "bg-violet-500/10",
      valCls: "heading-text",
    },
    {
      label: "AVG. GRACE PERIOD",
      value: `${stats?.avgGraceMinutes ?? 0}m`,
      sub: "Across all active policies",
      icon: <Clock size={18} className="text-amber-500" />,
      iconBg: "bg-amber-500/10",
      valCls: "heading-text",
    },
    {
      label: "OT TRACKED",
      value: stats?.otTrackedCount ?? 0,
      sub: `of ${stats?.totalPolicies ?? 0} total policies`,
      icon: <Timer size={18} className="text-red-500" />,
      iconBg: "bg-red-500/10",
      valCls:
        (stats?.otTrackedCount ?? 0) > 0 ? "text-red-500" : "heading-text",
    },
  ];

  // ── Performance metrics (from live list) ───────────────────────────────────

  const perfStats = (() => {
    if (items.length === 0) return null;
    const withBio = items.filter((i) => i.allowBiometric).length;
    const withOt = items.filter((i) => i.trackOvertime).length;
    const avgGrace =
      items.reduce((s, i) => s + i.lateGraceMinutes, 0) / items.length;
    return {
      biometricPct: Math.round((withBio / items.length) * 100),
      otPct: Math.round((withOt / items.length) * 100),
      avgGrace: Math.round(avgGrace),
    };
  })();

  const perfTip = perfStats
    ? perfStats.biometricPct < 50
      ? "Less than half of policies require biometric. Consider enabling it for stricter compliance."
      : perfStats.otPct === 0
        ? "No policies are tracking overtime. Enable it on relevant shifts to capture accurate OT data."
        : "All key tracking methods are well configured across your active policies."
    : "No policies configured yet.";

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="h3">Attendance Policies</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Configure how attendance is tracked per employee group.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadAll}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            data-tour="attendance-policies-refresh-button"
            title="Refresh all"
          >
            <RefreshCw size={15} />
          </button>
          <Button
            variant="default"
            data-tour="attendance-policies-export-button"
            icon={<Download size={15} />}
            size="sm"
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
          {canManage && (
            <Button
              variant="solid"
              icon={<PlusIcon size={16} />}
              onClick={openAdd}
              data-tour="attendance-policies-add-button"
            >
              Add Policy
            </Button>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="card">
            <div className="card-body py-4 px-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                    {c.label}
                  </p>
                  <p className={`text-2xl font-bold ${c.valCls}`}>
                    {statsLoading ? (
                      <span className="inline-block h-7 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    ) : (
                      c.value
                    )}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {c.sub}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl ${c.iconBg}`}>{c.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table card (full width) ── */}
      <div className="card">
        <div className="card-body p-0">
          {/* Filter row */}
          <div
            className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700"
            data-tour="attendance-policies-filter-row"
          >
            <div className="relative flex-1 max-w-xs">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="input pl-8 w-full text-sm"
                placeholder="Search policies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-44 text-sm"
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
            >
              <option value="">All Modes</option>
              {TRACKING_MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-400 ml-auto">
              {loading
                ? "Loading…"
                : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-14">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div
                className="overflow-x-auto"
                data-tour="attendance-policies-table-card"
              >
                <table className="table-default table-hover w-full">
                  <thead>
                    <tr>
                      <th className="pl-5">Policy Name</th>
                      <th>Tracking Mode</th>
                      <th className="text-center">Self Check-in</th>
                      <th className="text-center">Biometric</th>
                      <th className="text-center">QR / NFC</th>
                      <th>Grace</th>
                      <th>OT Threshold</th>
                      <th>Options</th>
                      {canManage && (
                        <th className="w-20 text-center">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="text-center py-10 text-gray-400"
                        >
                          {search || modeFilter
                            ? "No policies match your filters."
                            : "No attendance policies found."}
                        </td>
                      </tr>
                    ) : (
                      paged.map((item) => (
                        <tr key={item.id}>
                          <td className="pl-5">
                            <div className="flex items-center gap-1.5">
                              {item.isDefault && (
                                <Star
                                  size={12}
                                  className="text-amber-400 fill-amber-400 shrink-0"
                                />
                              )}
                              <span className="font-medium heading-text text-sm">
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`xp-badge ${TRACKING_MODE_BADGE[item.trackingMode] ?? "xp-badge-neutral"}`}
                            >
                              {trackingLabel(item.trackingMode)}
                            </span>
                          </td>
                          {/* Self check-in — read-only toggle visual */}
                          <td className="text-center">
                            <div className="flex justify-center">
                              <div
                                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${item.allowSelfCheckin ? "bg-primary" : "bg-gray-200 dark:bg-gray-600"}`}
                              >
                                <span
                                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${item.allowSelfCheckin ? "translate-x-4" : ""}`}
                                />
                              </div>
                            </div>
                          </td>
                          {/* Biometric */}
                          <td className="text-center">
                            <div className="flex justify-center">
                              {item.allowBiometric ? (
                                <span className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-full text-xs font-medium">
                                  <Fingerprint size={11} /> Required
                                </span>
                              ) : (
                                <span className="xp-badge xp-badge-neutral text-xs">
                                  Not Required
                                </span>
                              )}
                            </div>
                          </td>
                          {/* QR/NFC */}
                          <td className="text-center">
                            <div className="flex justify-center">
                              {item.allowQrNfc ? (
                                <span className="flex items-center gap-1 text-violet-600 bg-violet-500/10 px-2 py-0.5 rounded-full text-xs font-medium">
                                  <QrCode size={11} /> Required
                                </span>
                              ) : (
                                <span className="xp-badge xp-badge-neutral text-xs">
                                  Not Required
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-sm text-gray-600 dark:text-gray-300">
                            {item.lateGraceMinutes} min
                          </td>
                          <td className="text-sm text-gray-600 dark:text-gray-300">
                            {item.overtimeThresholdMinutes} min
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              {item.trackBreaks && (
                                <span className="xp-badge xp-badge-info text-xs">
                                  Breaks
                                </span>
                              )}
                              {item.trackOvertime && (
                                <span className="xp-badge xp-badge-warning text-xs">
                                  OT
                                </span>
                              )}
                              {!item.trackBreaks && !item.trackOvertime && (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </div>
                          </td>
                          {canManage && (
                            <td className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => openEdit(item)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:bg-violet-50 hover:text-primary dark:hover:bg-violet-900/20 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  disabled={item.isDefault}
                                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={
                                    item.isDefault
                                      ? "Cannot delete default policy"
                                      : "Delete"
                                  }
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-400">
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (n) => (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                            n === page
                              ? "bg-primary text-white"
                              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          {n}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Bottom row: Recent Activity + Performance Overview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Activity */}
        <div className="card" data-tour="attendance-policies-activity-card">
          <div className="card-body p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-primary" />
                <h6 className="font-semibold heading-text">Recent Activity</h6>
              </div>
              <button
                onClick={loadActivity}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary transition-colors"
                title="Refresh activity"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {activityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                      <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="text-center py-8">
                <Activity
                  size={28}
                  className="text-gray-300 dark:text-gray-600 mx-auto mb-2"
                />
                <p className="text-sm text-gray-400">
                  No activity recorded yet.
                </p>
              </div>
            ) : (
              <div>
                {activity.map((a, i) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0 mt-0.5">
                        {activityIcon(a.action)}
                      </div>
                      {i < activity.length - 1 && (
                        <div className="w-px flex-1 bg-gray-100 dark:bg-gray-700 my-1" />
                      )}
                    </div>
                    <div
                      className={`pb-4 ${i === activity.length - 1 ? "pb-0" : ""}`}
                    >
                      <p className="text-xs font-semibold heading-text">
                        {activityTitle(a.action)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="font-medium">{a.policyName}</span>
                        {a.changedBy ? ` — by ${a.changedBy}` : ""}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {relativeTime(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Policy Performance Overview */}
        <div className="card" data-tour="attendance-policies-performance-card">
          <div className="card-body p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-primary" />
              <h6 className="font-semibold heading-text">
                Policy Performance Overview
              </h6>
            </div>

            {loading || !perfStats ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex justify-between mb-1.5">
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-10" />
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  {
                    label: "Biometric Coverage",
                    value: `${perfStats.biometricPct}%`,
                    pct: perfStats.biometricPct,
                    barCls: "bg-primary",
                  },
                  {
                    label: "Overtime Tracking",
                    value: `${perfStats.otPct}%`,
                    pct: perfStats.otPct,
                    barCls: "bg-amber-500",
                  },
                  {
                    label: "Average Grace Period",
                    value: `${perfStats.avgGrace}m`,
                    pct: Math.min(perfStats.avgGrace * 4, 100),
                    barCls: "bg-violet-500",
                  },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {m.label}
                      </span>
                      <span className="text-xs font-semibold heading-text">
                        {m.value}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${m.barCls} rounded-full transition-all duration-500`}
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 dark:bg-primary/10">
                    <TrendingUp
                      size={14}
                      className="text-primary shrink-0 mt-0.5"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      <span className="font-semibold text-primary">
                        Insight:{" "}
                      </span>
                      {perfTip}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Mini stats row */}
            {!loading && perfStats && (
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                {[
                  { label: "Total", value: items.length },
                  {
                    label: "W/ Biometric",
                    value: items.filter((i) => i.allowBiometric).length,
                  },
                  {
                    label: "W/ OT",
                    value: items.filter((i) => i.trackOvertime).length,
                  },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-lg font-bold heading-text">{s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <h5 className="h5 mb-4">
          {editing ? "Edit Attendance Policy" : "Add Attendance Policy"}
        </h5>

        <div className="space-y-4">
          <div>
            <label className="form-label">
              Policy Name <span className="text-error">*</span>
            </label>
            <Input
              placeholder="e.g. Standard Office Policy"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label">Tracking Mode</label>
            <select
              className="input w-full"
              value={form.trackingMode}
              onChange={(e) =>
                setForm((f) => ({ ...f, trackingMode: e.target.value }))
              }
            >
              {TRACKING_MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Late Grace (minutes)</label>
              <Input
                type="number"
                min="0"
                value={form.lateGraceMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lateGraceMinutes: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">OT Threshold (minutes)</label>
              <Input
                type="number"
                min="0"
                value={form.overtimeThresholdMinutes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    overtimeThresholdMinutes: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Pre-OT Grace (minutes)</label>
              <Input
                type="number"
                min="0"
                value={form.preOtGraceMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, preOtGraceMinutes: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Early Leave Grace (minutes)</label>
              <Input
                type="number"
                min="0"
                value={form.earlyLeaveGraceMinutes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    earlyLeaveGraceMinutes: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Check-in Methods
            </p>
            {(
              [
                [
                  "allowSelfCheckin",
                  "Allow Self Check-in (Mobile / Web)",
                  <Smartphone size={14} />,
                ],
                [
                  "allowBiometric",
                  "Allow Biometric Devices",
                  <Fingerprint size={14} />,
                ],
                ["allowQrNfc", "Allow QR / NFC Devices", <QrCode size={14} />],
              ] as const
            ).map(([key, label, icon]) => (
              <div
                key={key}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <span className="text-gray-400">{icon}</span>
                <span className="text-sm font-medium flex-1">{label}</span>
                <Switcher
                  checked={form[key as keyof AttendancePolicyForm] as boolean}
                  onChange={(val) => setForm((f) => ({ ...f, [key]: val }))}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Options
            </p>
            {(
              [
                ["trackBreaks", "Track Break Times"],
                [
                  "autoCalculateOvertime",
                  "Auto-Calculate Overtime (off = requires approval)",
                ],
                ["isDefault", "Set as Default Policy"],
              ] as const
            ).map(([key, label]) => (
              <div
                key={key}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50"
              >
                <span className="text-sm font-medium flex-1">{label}</span>
                <Switcher
                  checked={form[key as keyof AttendancePolicyForm] as boolean}
                  onChange={(val) => setForm((f) => ({ ...f, [key]: val }))}
                />
              </div>
            ))}
          </div>

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? "Update" : "Create"}
          </Button>
        </div>
      </Dialog>

      {tour.visible && (
        <TourOverlay
          step={tour.step}
          stepIndex={tour.stepIndex}
          totalSteps={tour.totalSteps}
          onNext={tour.next}
          onPrev={tour.prev}
          onDismiss={tour.dismiss}
          nextStepTarget={tour.nextStep?.target}
        />
      )}
    </div>
  );
}