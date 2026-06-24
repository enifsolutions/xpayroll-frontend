"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  LayoutList,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore } from "@/store/authStore";
import { payrollService } from "@/components/payroll/payrollService";
import { PayrollRun } from "@/types/payroll.types";
import { showSuccess, showError } from "@/lib/toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Dialog from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PayslipExportMenu from "@/components/payroll/PayslipExportMenu";

/* ─── helpers ─────────────────────────────────────────────── */
function fmt(n: number) {
  return n.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Draft: "xp-badge xp-badge-neutral",
    Processing: "xp-badge xp-badge-warning",
    Completed: "xp-badge xp-badge-info",
    Approved: "xp-badge xp-badge-success",
    Cancelled: "xp-badge xp-badge-danger",
    Pending: "xp-badge xp-badge-warning",
  };
  return map[status] ?? "xp-badge xp-badge-neutral";
};

type ConfirmType = "PROCESS" | "APPROVE" | "CANCEL" | "VOID" | null;

const PAGE_SIZE = 10;

/* ─── Stat Card ───────────────────────────────────────────── */
function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  iconBg = "bg-gray-100 dark:bg-gray-700",
  iconColor = "text-gray-500 dark:text-gray-400",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: { value: string; up: boolean };
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="card">
      <div className="card-body p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg} ${iconColor}`}>
              {icon}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-0.5 leading-none">
                {value}
              </p>
              {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
            </div>
          </div>
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                trend.up
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {trend.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function PayrollRunsPage() {
  useRequirePermission("Payroll.PayrollRun.View");
  const canCreate = usePermission("Payroll.PayrollRun.Create");
  const canProcess = usePermission("Payroll.PayrollRun.Process");
  const canApprove = usePermission("Payroll.PayrollRun.Approve");
  const canVoid = usePermission("Payroll.PayrollRun.Void");

  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.userId ?? "");
  const initialized = useRef(false);

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);

  /* filters */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);

  /* create dialog */
  const [createOpen, setCreateOpen] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  /* confirm dialog */
  const [confirmType, setConfirmType] = useState<ConfirmType>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [confirming, setConfirming] = useState(false);

  /* ── load ─────────────────────────────────────────────── */
  const load = async () => {
    setLoading(true);
    try {
      setRuns(await payrollService.getAll());
    } catch {
      showError("Error", "Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  /* ── derived stats ────────────────────────────────────── */
  const stats = useMemo(() => {
    const approved = runs.filter((r) => r.status === "Approved");
    const completed = runs.filter((r) => r.status === "Completed");
    const totalGross = approved.reduce((s, r) => s + (r.totalGross ?? 0), 0);
    const totalNet = approved.reduce((s, r) => s + (r.totalNet ?? 0), 0);
    return {
      total: runs.length,
      approved: approved.length,
      pending: completed.length,
      totalGross,
      totalNet,
    };
  }, [runs]);

  /* ── filtered + paginated ─────────────────────────────── */
  const filtered = useMemo(() => {
    let list = runs;
    if (statusFilter !== "All")
      list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.periodLabel?.toLowerCase().includes(q));
    }
    return list;
  }, [runs, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (fn: () => void) => {
    fn();
    setPage(1);
  };

  /* ── create ───────────────────────────────────────────── */
  const handleCreate = async () => {
    if (!periodLabel || !periodStart || !periodEnd) return;
    setSaving(true);
    try {
      await payrollService.create({
        periodLabel,
        periodStart,
        periodEnd,
        notes: notes || undefined,
        actionBy: userId,
      });
      showSuccess("Created", "Payroll run created successfully");
      setCreateOpen(false);
      setPeriodLabel("");
      setPeriodStart("");
      setPeriodEnd("");
      setNotes("");
      load();
    } catch (e: any) {
      showError(
        "Error",
        e?.response?.data?.message ?? "Failed to create payroll run",
      );
    } finally {
      setSaving(false);
    }
  };

  const openConfirm = (run: PayrollRun, type: ConfirmType) => {
    setSelectedRun(run);
    setConfirmType(type);
  };

  const handleConfirm = async () => {
    if (!selectedRun || !confirmType) return;
    setConfirming(true);
    try {
      if (confirmType === "PROCESS") {
        await payrollService.process(selectedRun.id, userId);
        showSuccess("Processed", "Payroll processed successfully");
      } else {
        await payrollService.action(selectedRun.id, confirmType, userId);
        const labels: Record<string, string> = {
          APPROVE: "Approved",
          CANCEL: "Cancelled",
          VOID: "Voided",
        };
        showSuccess(
          labels[confirmType],
          `Payroll run ${labels[confirmType].toLowerCase()}`,
        );
      }
      setConfirmType(null);
      setSelectedRun(null);
      load();
    } catch (e: any) {
      showError("Error", e?.response?.data?.message ?? "Action failed");
    } finally {
      setConfirming(false);
    }
  };

  const confirmMeta: Record<
    string,
    {
      variant: "info" | "warning" | "danger";
      title: string;
      message: string;
      label: string;
    }
  > = {
    PROCESS: {
      variant: "info",
      title: "Process Payroll Run",
      message: `Process payroll for "${selectedRun?.periodLabel}"? This will calculate payslips for all active employees. Any existing payslips for this run will be regenerated.`,
      label: "Yes, Process",
    },
    APPROVE: {
      variant: "info",
      title: "Approve Payroll Run",
      message: `Approve "${selectedRun?.periodLabel}"? This will finalise the payroll. Net payable: LKR ${fmt(selectedRun?.totalNet ?? 0)}.`,
      label: "Yes, Approve",
    },
    CANCEL: {
      variant: "danger",
      title: "Cancel Payroll Run",
      message: `Cancel "${selectedRun?.periodLabel}"? This will discard the draft run.`,
      label: "Yes, Cancel",
    },
    VOID: {
      variant: "danger",
      title: "Void Payroll Run",
      message: `Void "${selectedRun?.periodLabel}"? This will reverse the approved payroll run.`,
      label: "Yes, Void",
    },
  };

  const meta = confirmType ? confirmMeta[confirmType] : null;

  /* ── pagination helper ────────────────────────────────── */
  const pageNumbers = () => {
    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("…");
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      )
        pages.push(i);
      if (page < totalPages - 2) pages.push("…");
      pages.push(totalPages);
    }
    return pages;
  };

  /* ── render ───────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold">Payroll Runs</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage and monitor monthly payroll processing with real-time
            analytics.
          </p>
        </div>
        {canCreate && (
          <Button
            variant="solid"
            color="primary"
            icon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            New Payroll Run
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Runs"
          value={stats.total.toString()}
          sub={`${stats.approved} approved`}
          icon={<LayoutList size={18} />}
          iconBg="bg-blue-500"
          iconColor="text-white"
        />
        <StatCard
          label="Total Gross"
          value={`${(stats.totalGross / 1000).toFixed(1)}K`}
          sub="Approved runs"
          icon={<DollarSign size={18} />}
          iconBg="bg-emerald-500"
          iconColor="text-white"
          trend={{ value: "+4.2%", up: true }}
        />
        <StatCard
          label="Net Pay"
          value={`${(stats.totalNet / 1000).toFixed(1)}K`}
          sub="Approved runs"
          icon={<TrendingUp size={18} />}
          iconBg="bg-amber-400"
          iconColor="text-white"
          trend={{ value: "+2.5%", up: true }}
        />
        <StatCard
          label="Payment Status"
          value={
            stats.approved > 0
              ? "Approved"
              : stats.pending > 0
                ? "Pending"
                : "Draft"
          }
          sub={`${stats.pending} pending review`}
          icon={<BadgeCheck size={18} />}
          iconBg="bg-rose-500"
          iconColor="text-white"
        />
      </div>

      {/* Filter Bar */}
      <div className="card mb-4">
        <div className="card-body py-3 px-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-xs">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                className="input w-full pl-8 text-sm"
                placeholder="Search period..."
                value={search}
                onChange={(e) =>
                  handleFilterChange(() => setSearch(e.target.value))
                }
              />
            </div>
            <select
              className="input text-sm w-full sm:w-auto"
              value={statusFilter}
              onChange={(e) =>
                handleFilterChange(() => setStatusFilter(e.target.value))
              }
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Approved">Approved</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <div className="text-xs text-gray-400 whitespace-nowrap sm:ml-auto">
              {filtered.length} {filtered.length === 1 ? "run" : "runs"}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Status</th>
                  <th className="text-right">Total Gross</th>
                  <th className="text-right">Deductions</th>
                  <th className="text-right">Net Pay</th>
                  <th>Processed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">
                      {runs.length === 0
                        ? "No payroll runs yet."
                        : "No runs match the current filters."}
                    </td>
                  </tr>
                ) : (
                  paginated.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <div className="font-medium">{run.periodLabel}</div>
                        <div className="text-xs text-gray-400">
                          {run.periodStart} → {run.periodEnd}
                        </div>
                      </td>
                      <td>
                        <span className={statusBadge(run.status)}>
                          {run.status}
                        </span>
                      </td>
                      <td className="text-right font-mono text-sm">
                        {fmt(run.totalGross)}
                      </td>
                      <td className="text-right font-mono text-sm text-red-500">
                        {fmt(run.totalDeductions)}
                      </td>
                      <td className="text-right font-mono text-sm font-semibold text-green-600">
                        {fmt(run.totalNet)}
                      </td>
                      <td className="text-sm text-gray-400">
                        {run.processedAt
                          ? new Date(run.processedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <div className="flex gap-1 items-center">
                          {/* View */}
                          {(run.status === "Completed" ||
                            run.status === "Approved") && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                              title="View Payslips"
                              onClick={() =>
                                router.push(
                                  `/transactions/payroll-runs/${run.id}`,
                                )
                              }
                            >
                              <Eye size={15} />
                            </button>
                          )}
                          {/* Process */}
                          {canProcess && run.status === "Draft" && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
                              title="Process"
                              onClick={() => openConfirm(run, "PROCESS")}
                            >
                              <Play size={15} />
                            </button>
                          )}
                          {/* Approve */}
                          {canApprove && run.status === "Completed" && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500"
                              title="Approve"
                              onClick={() => openConfirm(run, "APPROVE")}
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                          {/* Cancel draft */}
                          {run.status === "Draft" && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                              title="Cancel"
                              onClick={() => openConfirm(run, "CANCEL")}
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                          {/* Void approved */}
                          {canVoid && run.status === "Approved" && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                              title="Void"
                              onClick={() => openConfirm(run, "VOID")}
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                          {/* Export */}
                          {run.status === "Completed" ||
                          run.status === "Approved" ? (
                            <PayslipExportMenu
                              payrollRunId={run.id}
                              periodLabel={run.periodLabel}
                              mode="run"
                            />
                          ) : (
                            <button
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50"
                              disabled
                              title="Export available after processing"
                            >
                              Export
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {!loading && filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length} entries
              </p>
              <div className="flex items-center gap-1">
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft size={15} />
                </button>
                {pageNumbers().map((p, i) =>
                  p === "…" ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="px-1 text-xs text-gray-400"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                        page === p
                          ? "bg-primary text-white"
                          : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        width={560}
      >
        <h5 className="mb-1 font-semibold">New Payroll Run</h5>
        <p className="text-sm text-gray-400 mb-5">
          Create a new payroll run for a pay period
        </p>
        <div className="space-y-4">
          <div>
            <label className="form-label">
              Period Label <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. June 2026"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Period Start <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">
                Period End <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <Input
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            loading={saving}
            onClick={handleCreate}
          >
            Create Run
          </Button>
        </div>
      </Dialog>

      {/* Confirm Dialog */}
      {meta && (
        <ConfirmDialog
          open={!!confirmType}
          variant={meta.variant}
          title={meta.title}
          message={meta.message}
          confirmLabel={meta.label}
          cancelLabel="Cancel"
          loading={confirming}
          onConfirm={handleConfirm}
          onCancel={() => {
            setConfirmType(null);
            setSelectedRun(null);
          }}
        />
      )}
    </div>
  );
}