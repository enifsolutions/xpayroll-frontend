"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  ListChecks,
  Search,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";

/* ── Types ─────────────────────────────────────────────────────────── */

interface LoanListItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  loanTypeId: string;
  loanTypeName: string;
  isAdvance: boolean;
  principalAmount: number;
  totalInstallments: number;
  status: string;
  requestedAt: string | null;
  notes: string | null;
}

interface LoanGuarantor {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  notes: string | null;
}

interface LoanDetail {
  id: string;
  employeeName: string;
  employeeCode: string;
  loanTypeName: string | null;
  guarantorModel: string | null;
  principalAmount: number;
  interestRate: number | null;
  totalInstallments: number;
  status: string;
  startDate: string;
  requestedAt: string | null;
  requestedByName: string | null;
  guarantorEmployeeId: string | null;
  guarantorName: string | null;
  notes: string | null;
}

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `Rs. ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDateTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/* ── KPI Card ─────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  iconBg,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
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
            className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function LoanApprovalsPage() {
  useRequirePermission(Permissions.Payroll.Loan.Approve);
  const canApprove = usePermission(Permissions.Payroll.Loan.Approve);
  const canReject = usePermission(Permissions.Payroll.Loan.Reject);

  const initialized = useRef(false);
  const [items, setItems] = useState<LoanListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<LoanDetail | null>(null);
  const [guarantors, setGuarantors] = useState<LoanGuarantor[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    "APPROVE" | "REJECT" | null
  >(null);
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/loan-records", {
        params: { status: "PendingApproval" },
      });
      setItems(res.data ?? []);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not fetch loan approvals.",
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

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.employeeName.toLowerCase().includes(q) ||
        i.employeeCode.toLowerCase().includes(q),
    );
  }, [items, search]);

  const totalPending = items.length;
  const totalPrincipal = items.reduce((sum, i) => sum + i.principalAmount, 0);
  const advanceCount = items.filter((i) => i.isAdvance).length;

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    setRejectReason("");
    setRejectError("");
    try {
      const [d, g] = await Promise.all([
        api.get(`/loan-records/${id}`),
        api.get(`/loan-records/${id}/guarantors`),
      ]);
      setDetail(d.data);
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
    setGuarantors([]);
    setConfirmAction(null);
    setRejectReason("");
    setRejectError("");
  };

  const handleApprove = async () => {
    if (!detail) return;
    setActing(true);
    try {
      await api.post(`/loan-records/${detail.id}/approve`);
      showSuccess(
        "Approved",
        "Loan approved and repayment schedule generated.",
      );
      closeDetail();
      load();
    } catch (err: any) {
      showError(
        "Approval failed",
        err?.response?.data?.error ?? "Could not approve this loan.",
      );
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    if (!rejectReason.trim()) {
      setRejectError("A rejection reason is required.");
      return;
    }
    setActing(true);
    try {
      await api.post(`/loan-records/${detail.id}/reject`, {
        rejectionReason: rejectReason.trim(),
      });
      showSuccess("Rejected", "Loan request has been rejected.");
      closeDetail();
      load();
    } catch (err: any) {
      showError(
        "Rejection failed",
        err?.response?.data?.error ?? "Could not reject this loan.",
      );
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Loan Approvals
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Review and decide on pending loan and advance requests
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Pending Requests"
          value={totalPending}
          icon={<Clock size={20} className="text-amber-500" />}
          iconBg="bg-amber-50 dark:bg-amber-900/30"
          sub={
            totalPending > 0 ? (
              <span className="text-amber-500 font-medium">
                Requires action
              </span>
            ) : (
              <span className="text-emerald-500 font-medium">All clear</span>
            )
          }
        />
        <StatCard
          label="Total Amount Pending"
          value={fmtMoney(totalPrincipal)}
          icon={<Wallet size={20} className="text-blue-500" />}
          iconBg="bg-blue-50 dark:bg-blue-900/30"
        />
        <StatCard
          label="Advances"
          value={advanceCount}
          icon={<ListChecks size={20} className="text-violet-500" />}
          iconBg="bg-violet-50 dark:bg-violet-900/30"
          sub={<span className="text-gray-400">of {totalPending} total</span>}
        />
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-5">
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
            <span className="text-sm text-gray-400 ml-auto whitespace-nowrap">
              {filtered.length} pending
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <CheckCircle size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No loans awaiting approval</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Loan Type</th>
                    <th className="text-right">Amount</th>
                    <th>Tenure</th>
                    <th>Requested</th>
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
                      <td className="text-right text-sm tabular-nums font-semibold">
                        {fmtMoney(l.principalAmount)}
                      </td>
                      <td className="text-sm text-gray-500 dark:text-gray-400">
                        {l.totalInstallments} mo
                      </td>
                      <td className="text-sm text-gray-500 dark:text-gray-400">
                        {fmtDateTime(l.requestedAt)}
                      </td>
                      <td>
                        <div className="flex justify-end">
                          <button
                            className="btn btn-primary btn-sm text-xs px-3 py-1"
                            onClick={() => openDetail(l.id)}
                          >
                            Review
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

      {/* ── Review dialog ─────────────────────────────────────────── */}
      <Dialog isOpen={!!detailId} onClose={closeDetail} width={680}>
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
              <span className="xp-badge xp-badge-warning">
                Pending Approval
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Amount</p>
                <p className="text-sm font-semibold">
                  {fmtMoney(detail.principalAmount)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Tenure</p>
                <p className="text-sm font-semibold">
                  {detail.totalInstallments} months
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Interest Rate</p>
                <p className="text-sm font-semibold">
                  {detail.interestRate ? `${detail.interestRate}%` : "None"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-400">Requested by: </span>
                {detail.requestedByName ?? "—"}
              </div>
              <div>
                <span className="text-gray-400">Requested at: </span>
                {fmtDateTime(detail.requestedAt)}
              </div>
              <div>
                <span className="text-gray-400">Start date: </span>
                {detail.startDate}
              </div>
              {detail.guarantorModel === "Single" && (
                <div>
                  <span className="text-gray-400">Guarantor: </span>
                  {detail.guarantorName ?? (
                    <span className="text-rose-500">
                      Not set — approval will fail
                    </span>
                  )}
                </div>
              )}
            </div>

            {detail.guarantorModel === "Multi" && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">
                  Guarantors
                </p>
                {guarantors.length === 0 ? (
                  <p className="text-sm text-rose-500">
                    None added yet — approval will fail
                  </p>
                ) : (
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
                )}
              </div>
            )}

            {detail.notes && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">
                  Notes
                </p>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300">
                  {detail.notes}
                </div>
              </div>
            )}

            {(canApprove || canReject) && (
              <div className="mb-4">
                <label className="form-label">Rejection Reason</label>
                <Input
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setRejectError("");
                  }}
                  placeholder="Required only if rejecting"
                />
                {rejectError && (
                  <p className="text-red-500 text-xs mt-1">{rejectError}</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="plain" onClick={closeDetail}>
                Close
              </Button>
              {canReject && (
                <Button
                  variant="solid"
                  color="danger"
                  icon={<XCircle size={15} />}
                  loading={acting}
                  onClick={() => setConfirmAction("REJECT")}
                >
                  Reject
                </Button>
              )}
              {canApprove && (
                <Button
                  variant="solid"
                  color="primary"
                  icon={<CheckCircle size={15} />}
                  loading={acting}
                  onClick={() => setConfirmAction("APPROVE")}
                >
                  Approve
                </Button>
              )}
            </div>
          </>
        )}
      </Dialog>

      <ConfirmDialog
        open={confirmAction === "APPROVE"}
        variant="info"
        title="Approve Loan"
        message={`This will approve ${detail?.employeeName}'s loan and generate its repayment schedule. This can't be undone.`}
        confirmLabel="Approve"
        cancelLabel="Cancel"
        loading={acting}
        onConfirm={handleApprove}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === "REJECT"}
        variant="danger"
        title="Reject Loan"
        message={`${detail?.employeeName}'s loan request will be rejected with the reason provided.`}
        confirmLabel="Reject"
        cancelLabel="Cancel"
        loading={acting}
        onConfirm={handleReject}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
