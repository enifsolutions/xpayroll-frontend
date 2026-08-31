"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Landmark,
  Wallet,
  Clock,
  TrendingDown,
  Plus,
  RefreshCw,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Banknote,
  PauseCircle,
  PlayCircle,
  FlagOff,
  Repeat,
  SkipForward,
  Trash2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import RequestLoanDialog from "./RequestLoanDialog";
import { showSuccess, showError } from "@/lib/toast";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";

/* ── Types ─────────────────────────────────────────────────────────── */

type LoanStatus =
  | "PendingApproval"
  | "Approved"
  | "Active"
  | "OnHold"
  | "Completed"
  | "Settled"
  | "Cancelled"
  | "Rejected";

interface LoanListItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  branchId: string | null;
  branchName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  loanTypeId: string;
  loanTypeName: string;
  isAdvance: boolean;
  principalAmount: number;
  interestRate: number | null;
  interestMethod: string;
  monthlyInstallment: number;
  totalInstallments: number;
  paidInstallments: number;
  outstandingBalance: number;
  totalPayable: number | null;
  progressPct: number;
  status: LoanStatus;
  startDate: string;
  endDate: string | null;
  requestedAt: string | null;
  approvedAt: string | null;
  disbursedAt: string | null;
  settledAt: string | null;
  notes: string | null;
}

interface LoanKpis {
  activeLoans: number;
  totalOutstanding: number;
  pendingApprovalCount: number;
  thisMonthRecovery: number;
}

interface LoanTypeOption {
  id: string;
  name: string;
}

interface LoanDetail {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  loanTypeId: string | null;
  loanTypeName: string | null;
  interestMethod: string;
  guarantorModel: string | null;
  shortfallBehavior: string | null;
  allowInstallmentSkip: boolean | null;
  principalAmount: number;
  interestRate: number | null;
  monthlyInstallment: number;
  totalInstallments: number;
  paidInstallments: number;
  outstandingBalance: number;
  totalPayable: number | null;
  status: LoanStatus;
  startDate: string;
  endDate: string | null;
  requestedAt: string | null;
  requestedByName: string | null;
  approvedAt: string | null;
  approvedByName: string | null;
  disbursedAt: string | null;
  disbursementReference: string | null;
  rejectionReason: string | null;
  settlementAmount: number | null;
  settledAt: string | null;
  guarantorEmployeeId: string | null;
  guarantorName: string | null;
  notes: string | null;
}

interface LoanInstallment {
  id: string;
  installmentNo: number;
  duePeriod: string;
  principalComponent: number;
  interestComponent: number;
  amountDue: number;
  amountPaid: number;
  rolledForwardAmount: number;
  status: string;
  skipReason: string | null;
  paidInPayrollRunId: string | null;
}

interface LoanGuarantor {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  notes: string | null;
}

type LifecycleAction =
  | "APPROVE"
  | "REJECT"
  | "DISBURSE"
  | "DELETE"
  | "HOLD"
  | "RESUME"
  | "SETTLE"
  | "RESTRUCTURE"
  | "SKIP";

const STATUSES: LoanStatus[] = [
  "PendingApproval",
  "Approved",
  "Active",
  "OnHold",
  "Completed",
  "Settled",
  "Rejected",
  "Cancelled",
];

const STATUS_LABELS: Record<LoanStatus, string> = {
  PendingApproval: "Pending Approval",
  Approved: "Approved",
  Active: "Active",
  OnHold: "On Hold",
  Completed: "Completed",
  Settled: "Settled",
  Cancelled: "Cancelled",
  Rejected: "Rejected",
};

function statusBadgeClass(status: LoanStatus) {
  const map: Record<LoanStatus, string> = {
    PendingApproval: "xp-badge xp-badge-warning",
    Approved: "xp-badge xp-badge-info",
    Active: "xp-badge xp-badge-success",
    OnHold: "xp-badge xp-badge-warning",
    Completed: "xp-badge xp-badge-neutral",
    Settled: "xp-badge xp-badge-success",
    Cancelled: "xp-badge xp-badge-neutral",
    Rejected: "xp-badge xp-badge-danger",
  };
  return map[status] ?? "xp-badge xp-badge-neutral";
}

function installmentStatusBadgeClass(status: string) {
  const map: Record<string, string> = {
    Due: "xp-badge xp-badge-neutral",
    Paid: "xp-badge xp-badge-success",
    PartiallyPaid: "xp-badge xp-badge-warning",
    Skipped: "xp-badge xp-badge-warning",
    Waived: "xp-badge xp-badge-info",
    SettledEarly: "xp-badge xp-badge-success",
  };
  return map[status] ?? "xp-badge xp-badge-neutral";
}

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `Rs. ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMonth(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

/* ── KPI Card ─────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  colorClass,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold">{value}</p>
            {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
          </div>
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${colorClass}`}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function LoansPage() {
  useRequirePermission(Permissions.Payroll.Loan.View);
  const canApprove = usePermission(Permissions.Payroll.Loan.Approve);
  const canReject = usePermission(Permissions.Payroll.Loan.Reject);
  const canDisburse = usePermission(Permissions.Payroll.Loan.Disburse);
  const canSkip = usePermission(Permissions.Payroll.Loan.Skip);
  const canHold = usePermission(Permissions.Payroll.Loan.Hold);
  const canResume = usePermission(Permissions.Payroll.Loan.Resume);
  const canSettle = usePermission(Permissions.Payroll.Loan.Settle);
  const canRestructure = usePermission(Permissions.Payroll.Loan.Restructure);
  const canDelete = usePermission(Permissions.Payroll.Loan.Delete);
  const canCreate = usePermission(Permissions.Payroll.Loan.Create);

  const userId = useAuthStore((s) => s.user?.userId);
  const initialized = useRef(false);

  const [loans, setLoans] = useState<LoanListItem[]>([]);
  const [kpis, setKpis] = useState<LoanKpis | null>(null);
  const [loanTypes, setLoanTypes] = useState<LoanTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpisLoading, setKpisLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loanTypeFilter, setLoanTypeFilter] = useState("");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LoanDetail | null>(null);
  const [installments, setInstallments] = useState<LoanInstallment[]>([]);
  const [guarantors, setGuarantors] = useState<LoanGuarantor[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [action, setAction] = useState<LifecycleAction | null>(null);
  const [actionInstallment, setActionInstallment] =
    useState<LoanInstallment | null>(null);
  const [actionInput, setActionInput] = useState("");
  const [actionInput2, setActionInput2] = useState("");
  const [actionError, setActionError] = useState("");
  const [actioning, setActioning] = useState(false);

  const [newLoanOpen, setNewLoanOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/loan-records", {
        params: {
          status: statusFilter || undefined,
          loanTypeId: loanTypeFilter || undefined,
        },
      });
      setLoans(res.data ?? []);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Failed to load loans.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadKpis = async () => {
    setKpisLoading(true);
    try {
      const res = await api.get("/loan-records/kpis");
      setKpis(res.data);
    } catch {
      /* KPI failure shouldn't block the page */
    } finally {
      setKpisLoading(false);
    }
  };

  const loadLoanTypes = async () => {
    try {
      const res = await api.get("/loan-types", {
        params: { includeInactive: true },
      });
      setLoanTypes(res.data ?? []);
    } catch {
      /* filter dropdown just stays empty */
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
    loadKpis();
    loadLoanTypes();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, loanTypeFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return loans;
    const q = search.toLowerCase();
    return loans.filter(
      (l) =>
        l.employeeName.toLowerCase().includes(q) ||
        l.employeeCode.toLowerCase().includes(q),
    );
  }, [loans, search]);

  const refreshAll = () => {
    load();
    loadKpis();
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const [d, i, g] = await Promise.all([
        api.get(`/loan-records/${id}`),
        api.get(`/loan-records/${id}/installments`),
        api.get(`/loan-records/${id}/guarantors`),
      ]);
      setDetail(d.data);
      setInstallments(i.data ?? []);
      setGuarantors(g.data ?? []);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Failed to load loan details.",
      );
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setInstallments([]);
    setGuarantors([]);
  };

  const openAction = (a: LifecycleAction, installment?: LoanInstallment) => {
    setAction(a);
    setActionInstallment(installment ?? null);
    setActionInput("");
    setActionInput2("");
    setActionError("");
  };

  const closeAction = () => {
    setAction(null);
    setActionInstallment(null);
    setActionInput("");
    setActionInput2("");
    setActionError("");
  };

  const runAction = async () => {
    if (!detail || !action) return;

    if (action === "REJECT" && !actionInput.trim()) {
      setActionError("A rejection reason is required.");
      return;
    }
    if (action === "SKIP" && !actionInstallment) {
      setActionError("No installment selected.");
      return;
    }
    if (action === "RESTRUCTURE" && (!actionInput || Number(actionInput) < 1)) {
      setActionError("Enter the new number of remaining installments.");
      return;
    }

    setActioning(true);
    setActionError("");
    try {
      switch (action) {
        case "APPROVE":
          await api.post(`/loan-records/${detail.id}/approve`);
          break;
        case "REJECT":
          await api.post(`/loan-records/${detail.id}/reject`, {
            rejectionReason: actionInput.trim(),
          });
          break;
        case "DISBURSE":
          await api.post(`/loan-records/${detail.id}/disburse`, {
            disbursementReference: actionInput.trim() || null,
          });
          break;
        case "DELETE":
          await api.delete(`/loan-records/${detail.id}`);
          break;
        case "HOLD":
          await api.post(`/loan-records/${detail.id}/hold`, {
            notes: actionInput.trim() || null,
          });
          break;
        case "RESUME":
          await api.post(`/loan-records/${detail.id}/resume`);
          break;
        case "SETTLE":
          await api.post(`/loan-records/${detail.id}/settle`, {
            settlementAmount: actionInput ? Number(actionInput) : null,
            notes: actionInput2.trim() || null,
          });
          break;
        case "RESTRUCTURE":
          await api.post(`/loan-records/${detail.id}/restructure`, {
            newTotalInstallments: Number(actionInput),
            notes: actionInput2.trim() || null,
          });
          break;
        case "SKIP":
          await api.post(`/loan-records/${detail.id}/skip`, {
            installmentId: actionInstallment!.id,
            skipReason: actionInput.trim() || null,
          });
          break;
      }

      showSuccess("Done", actionSuccessMessage(action));
      closeAction();
      closeDetail();
      refreshAll();
    } catch (e: any) {
      const msg = e?.response?.data?.error;
      setActionError(msg ?? "That action couldn't be completed.");
    } finally {
      setActioning(false);
    }
  };

  const actionSuccessMessage = (a: LifecycleAction) => {
    switch (a) {
      case "APPROVE":
        return "Loan approved and schedule generated.";
      case "REJECT":
        return "Loan rejected.";
      case "DISBURSE":
        return "Loan marked as disbursed.";
      case "DELETE":
        return "Loan request deleted.";
      case "HOLD":
        return "Recovery paused.";
      case "RESUME":
        return "Recovery resumed.";
      case "SETTLE":
        return "Loan settled.";
      case "RESTRUCTURE":
        return "Loan restructured with a new schedule.";
      case "SKIP":
        return "Installment skipped and deferred.";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Loans
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Employee loans, advances, and repayment schedules
          </p>
        </div>
        {canCreate && (
          <Button
            variant="solid"
            size="sm"
            icon={<Plus size={15} />}
            onClick={() => setNewLoanOpen(true)}
          >
            New Loan
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Loans"
          value={kpisLoading ? "—" : (kpis?.activeLoans ?? 0)}
          icon={<Landmark size={22} />}
          colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
        />
        <StatCard
          label="Total Outstanding"
          value={kpisLoading ? "—" : fmtMoney(kpis?.totalOutstanding ?? 0)}
          icon={<Wallet size={22} />}
          colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        />
        <StatCard
          label="Pending Approval"
          value={kpisLoading ? "—" : (kpis?.pendingApprovalCount ?? 0)}
          icon={<Clock size={22} />}
          colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          sub={
            (kpis?.pendingApprovalCount ?? 0) > 0 ? (
              <span className="text-amber-500 font-medium">
                Requires action
              </span>
            ) : (
              <span className="text-emerald-500 font-medium">All clear</span>
            )
          }
        />
        <StatCard
          label="This Month's Recovery"
          value={kpisLoading ? "—" : fmtMoney(kpis?.thisMonthRecovery ?? 0)}
          icon={<TrendingDown size={22} />}
          colorClass="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
        />
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <div className="relative flex-1 max-w-xs">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                placeholder="Search employee…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>

            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={loanTypeFilter}
              onChange={(e) => setLoanTypeFilter(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="">All Loan Types</option>
              {loanTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <button
              onClick={refreshAll}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            <span className="text-sm text-gray-400 ml-auto whitespace-nowrap">
              {filtered.length} loan{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Landmark size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No loans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Loan Type</th>
                    <th className="text-right">Principal</th>
                    <th className="text-right">Outstanding</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Started</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {l.employeeName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {l.employeeCode}
                        </p>
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-300">
                        {l.loanTypeName}
                        {l.isAdvance && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 block">
                            Advance
                          </span>
                        )}
                      </td>
                      <td className="text-right text-sm tabular-nums">
                        {fmtMoney(l.principalAmount)}
                      </td>
                      <td className="text-right text-sm tabular-nums font-semibold">
                        {fmtMoney(l.outstandingBalance)}
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{
                                width: `${Math.min(100, l.progressPct)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
                            {l.paidInstallments}/{l.totalInstallments}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={statusBadgeClass(l.status)}>
                          {STATUS_LABELS[l.status]}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500 dark:text-gray-400">
                        {fmtDate(l.startDate)}
                      </td>
                      <td>
                        <div className="flex items-center justify-end">
                          <button
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                            onClick={() => openDetail(l.id)}
                            title="View details"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail dialog ─────────────────────────────────────────── */}
      <Dialog isOpen={!!detailId} onClose={closeDetail} width={820}>
        {detailLoading || !detail ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h5 className="font-semibold text-gray-900 dark:text-white">
                {detail.employeeName}
              </h5>
              <p className="text-sm text-gray-400 mb-2">
                {detail.employeeCode} · {detail.loanTypeName ?? "—"}
              </p>
              <span className={statusBadgeClass(detail.status)}>
                {STATUS_LABELS[detail.status]}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Principal</p>
                <p className="text-sm font-semibold">
                  {fmtMoney(detail.principalAmount)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">
                  Monthly Installment
                </p>
                <p className="text-sm font-semibold">
                  {fmtMoney(detail.monthlyInstallment)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">
                  Outstanding Balance
                </p>
                <p className="text-sm font-semibold">
                  {fmtMoney(detail.outstandingBalance)}
                </p>
              </div>
            </div>

            {detail.status === "Rejected" && detail.rejectionReason && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400">
                <span className="font-medium">Rejection reason: </span>
                {detail.rejectionReason}
              </div>
            )}

            {detail.guarantorModel === "Single" && detail.guarantorName && (
              <div className="mb-4 text-sm">
                <span className="text-gray-400">Guarantor: </span>
                {detail.guarantorName}
              </div>
            )}

            {guarantors.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                  Guarantors
                </p>
                <div className="flex flex-wrap gap-2">
                  {guarantors.map((g) => (
                    <span
                      key={g.id}
                      className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full"
                    >
                      {g.employeeName} ({g.employeeCode})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {installments.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                  Repayment Schedule
                </p>
                <div className="max-h-56 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-lg">
                  <table className="table-default w-full text-sm">
                    <thead className="sticky top-0 bg-white dark:bg-gray-900">
                      <tr>
                        <th>#</th>
                        <th>Due</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Paid</th>
                        <th>Status</th>
                        {canSkip &&
                          detail.status === "Active" &&
                          detail.allowInstallmentSkip && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {installments.map((inst) => (
                        <tr key={inst.id}>
                          <td>{inst.installmentNo}</td>
                          <td>{fmtMonth(inst.duePeriod)}</td>
                          <td className="text-right tabular-nums">
                            {fmtMoney(inst.amountDue)}
                          </td>
                          <td className="text-right tabular-nums">
                            {fmtMoney(inst.amountPaid)}
                          </td>
                          <td>
                            <span
                              className={installmentStatusBadgeClass(
                                inst.status,
                              )}
                            >
                              {inst.status}
                            </span>
                          </td>
                          {canSkip &&
                            detail.status === "Active" &&
                            detail.allowInstallmentSkip && (
                              <td>
                                {inst.status === "Due" && (
                                  <button
                                    className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500"
                                    title="Skip this installment"
                                    onClick={() => openAction("SKIP", inst)}
                                  >
                                    <SkipForward size={14} />
                                  </button>
                                )}
                              </td>
                            )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button variant="plain" onClick={closeDetail}>
                Close
              </Button>

              {detail.status === "PendingApproval" && canDelete && (
                <Button
                  variant="plain"
                  icon={<Trash2 size={15} />}
                  onClick={() => openAction("DELETE")}
                >
                  Delete
                </Button>
              )}
              {detail.status === "PendingApproval" && (
                <p className="text-sm text-gray-400 self-center">
                  Approve or reject this request from Approvals → Loan
                  Approvals.
                </p>
              )}

              {detail.status === "Approved" && canDisburse && (
                <Button
                  variant="solid"
                  color="primary"
                  icon={<Banknote size={15} />}
                  onClick={() => openAction("DISBURSE")}
                >
                  Disburse
                </Button>
              )}

              {detail.status === "Active" && canHold && (
                <Button
                  variant="default"
                  icon={<PauseCircle size={15} />}
                  onClick={() => openAction("HOLD")}
                >
                  Hold
                </Button>
              )}
              {detail.status === "Active" && canRestructure && (
                <Button
                  variant="default"
                  icon={<Repeat size={15} />}
                  onClick={() => openAction("RESTRUCTURE")}
                >
                  Restructure
                </Button>
              )}
              {(detail.status === "Active" || detail.status === "OnHold") &&
                canSettle && (
                  <Button
                    variant="default"
                    icon={<FlagOff size={15} />}
                    onClick={() => openAction("SETTLE")}
                  >
                    Settle Early
                  </Button>
                )}
              {detail.status === "OnHold" && canResume && (
                <Button
                  variant="solid"
                  color="primary"
                  icon={<PlayCircle size={15} />}
                  onClick={() => openAction("RESUME")}
                >
                  Resume
                </Button>
              )}
            </div>
          </>
        )}
      </Dialog>

      {/* ── Action input dialog (Reject / Restructure / Settle / Skip / Hold / Disburse notes) ─── */}
      <Dialog
        isOpen={
          !!action &&
          action !== "APPROVE" &&
          action !== "RESUME" &&
          action !== "DELETE"
        }
        onClose={closeAction}
        width={480}
      >
        {action === "REJECT" && (
          <>
            <h5 className="font-semibold text-gray-900 dark:text-white mb-4">
              Reject Loan
            </h5>
            <label className="form-label">
              Reason <span className="text-red-500">*</span>
            </label>
            <Input
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="Why is this being rejected?"
            />
          </>
        )}
        {action === "DISBURSE" && (
          <>
            <h5 className="font-semibold text-gray-900 dark:text-white mb-4">
              Disburse Loan
            </h5>
            <label className="form-label">Disbursement Reference</label>
            <Input
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="e.g. bank transfer ref (optional)"
            />
          </>
        )}
        {action === "HOLD" && (
          <>
            <h5 className="font-semibold text-gray-900 dark:text-white mb-4">
              Hold Loan Recovery
            </h5>
            <label className="form-label">Notes</label>
            <Input
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="Reason for pausing recovery (optional)"
            />
          </>
        )}
        {action === "SETTLE" && (
          <>
            <h5 className="font-semibold text-gray-900 dark:text-white mb-4">
              Settle Loan Early
            </h5>
            <label className="form-label">Settlement Amount</label>
            <Input
              type="number"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder={`Leave blank to use outstanding balance (${fmtMoney(detail?.outstandingBalance ?? 0)})`}
            />
            <label className="form-label mt-3">Notes</label>
            <Input
              value={actionInput2}
              onChange={(e) => setActionInput2(e.target.value)}
              placeholder="Optional"
            />
          </>
        )}
        {action === "RESTRUCTURE" && (
          <>
            <h5 className="font-semibold text-gray-900 dark:text-white mb-4">
              Restructure Loan
            </h5>
            <label className="form-label">
              New Remaining Installments <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min={1}
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="e.g. 12"
            />
            <p className="text-xs text-gray-400 mt-1">
              Applies the current outstanding balance (
              {fmtMoney(detail?.outstandingBalance ?? 0)}) over this many new
              installments, starting next period. Already-paid history is
              preserved.
            </p>
            <label className="form-label mt-3">Notes</label>
            <Input
              value={actionInput2}
              onChange={(e) => setActionInput2(e.target.value)}
              placeholder="Optional"
            />
          </>
        )}
        {action === "SKIP" && actionInstallment && (
          <>
            <h5 className="font-semibold text-gray-900 dark:text-white mb-4">
              Skip Installment #{actionInstallment.installmentNo}
            </h5>
            <p className="text-sm text-gray-500 mb-3">
              This installment ({fmtMoney(actionInstallment.amountDue)}, due{" "}
              {fmtMonth(actionInstallment.duePeriod)}) will be deferred to the
              end of the schedule.
            </p>
            <label className="form-label">Reason</label>
            <Input
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="Optional"
            />
          </>
        )}

        {actionError && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mt-3">
            {actionError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-4 mt-1">
          <Button variant="default" onClick={closeAction}>
            Cancel
          </Button>
          <Button variant="solid" loading={actioning} onClick={runAction}>
            Confirm
          </Button>
        </div>
      </Dialog>

      {/* ── Simple confirmations (Approve / Resume / Delete) ────────── */}
      <ConfirmDialog
        open={action === "APPROVE"}
        variant="info"
        title="Approve Loan"
        message="This will approve the loan and generate its repayment schedule. This can't be undone."
        confirmLabel="Approve"
        cancelLabel="Cancel"
        loading={actioning}
        onConfirm={runAction}
        onCancel={closeAction}
      />
      <ConfirmDialog
        open={action === "RESUME"}
        variant="info"
        title="Resume Loan"
        message="Recovery will resume, with remaining installment due dates shifted forward by however long the loan was on hold."
        confirmLabel="Resume"
        cancelLabel="Cancel"
        loading={actioning}
        onConfirm={runAction}
        onCancel={closeAction}
      />
      <ConfirmDialog
        open={action === "DELETE"}
        variant="danger"
        title="Delete Loan Request"
        message="This request will be permanently removed. This can't be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={actioning}
        onConfirm={runAction}
        onCancel={closeAction}
      />

      <RequestLoanDialog
        isOpen={newLoanOpen}
        onClose={() => setNewLoanOpen(false)}
        onDone={() => {
          setNewLoanOpen(false);
          refreshAll();
        }}
      />
    </div>
  );
}
