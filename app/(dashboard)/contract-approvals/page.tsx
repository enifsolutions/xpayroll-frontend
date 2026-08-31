"use client";

import { useEffect, useRef, useState } from "react";
import {
  Eye,
  Clock,
  ListChecks,
  ThumbsUp,
  ThumbsDown,
  Search,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getErrorMessage } from "@/lib/apiError";
import { useTour } from "@/hooks/useTour";
import TourOverlay from "@/components/onboarding/TourOverlay";
import { CONTRACT_APPROVALS_STEPS } from "@/lib/tours/contract-approvals";

const STATUSES = ["Pending", "Approved", "Rejected"];

interface ContractChangeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  contractId: string;
  oldSnapshot: Record<string, any> | null;
  newSnapshot: Record<string, any> | null;
  status: string;
  requestedBy: string | null;
  requestedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  designationId: "Designation",
  contractType: "Contract Type",
  payrollBasis: "Payroll Basis",
  basicSalary: "Basic Salary",
  hourlyRate: "Hourly Rate",
  dailyRate: "Daily Rate",
  allowances: "Allowances",
  currency: "Currency",
  absentDeductionAfterDays: "Absent Deduct After (days)",
  lateDeductionPerMinute: "Late Deduct / Minute",
  overtimeRateMultiplier: "OT Rate Multiplier",
  startDate: "Start Date",
  endDate: "End Date",
  notes: "Notes",
};

function fmtValue(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function fmtDateTime(dt: string | null) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

/* ── Avatar helpers (same pattern as Attendance Adjustments page) ── */
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-orange-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function EmployeeAvatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const dimension = size === "md" ? "w-9 h-9 text-sm" : "w-8 h-8 text-xs";
  const color = getAvatarColor(name);
  return (
    <div
      className={`${dimension} ${color} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}

/* ── KPI Card ── */
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  sub?: React.ReactNode;
}

function StatCard({ label, value, icon, iconBg, sub }: StatCardProps) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContractApprovalsPage() {
  const tour = useTour(
    "admin-page-contract-approvals",
    CONTRACT_APPROVALS_STEPS,
  );
  useRequirePermission(Permissions.HR.EmployeeContract.Approve);
  const canApprove = usePermission(Permissions.HR.EmployeeContract.Approve);

  const initialized = useRef(false);
  const [items, setItems] = useState<ContractChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [search, setSearch] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<ContractChangeRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"APPROVE" | "REJECT" | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get<ContractChangeRequest[]>("/employees/contracts/change-requests", {
        params,
      });
      setItems(res.data);
    } catch (err){
      showError("Failed to load", getErrorMessage(err, "Could not fetch contract change requests."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  /* ── KPI counts derived from current loaded items ── */
  const totalCount = items.length;
  const pendingCount = items.filter((i) => i.status === "Pending").length;
  const approvedCount = items.filter((i) => i.status === "Approved").length;
  const rejectedCount = items.filter((i) => i.status === "Rejected").length;

  /* ── Client-side search filter ── */
  const filtered = search.trim()
    ? items.filter(
        (i) =>
          i.employeeName.toLowerCase().includes(search.toLowerCase()) ||
          i.employeeCode.toLowerCase().includes(search.toLowerCase()),
      )
    : items;

  const changedFields = (r: ContractChangeRequest) => {
    const old = r.oldSnapshot ?? {};
    const next = r.newSnapshot ?? {};
    const keys = Object.keys(FIELD_LABELS).filter((k) => k in next || k in old);
    return keys.filter((k) => String(old[k] ?? "") !== String(next[k] ?? ""));
  };

  const openDetail = (item: ContractChangeRequest) => {
    setSelected(item);
    setReviewNotes("");
    setDetailOpen(true);
  };

  const handleReview = async (action: "APPROVE" | "REJECT") => {
    if (!reviewNotes.trim()) {
      showError("Missing information", "Review notes are required.");
      return;
    }
    if (!selected) return;
    setSaving(true);
    try {
      await api.post("/employees/contracts/change-requests/review", {
        action,
        id: selected.id,
        reviewNotes: reviewNotes.trim(),
      });
      setDetailOpen(false);
      setConfirmAction(null);
      await load();
      showSuccess(
        action === "APPROVE" ? "Approved" : "Rejected",
        action === "APPROVE"
          ? `${selected.employeeName}'s contract has been updated.`
          : "The requested change has been rejected.",
      );
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showError("Review failed", msg ?? "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Pending: "xp-badge xp-badge-warning",
      Approved: "xp-badge xp-badge-success",
      Rejected: "xp-badge xp-badge-danger",
    };
    return map[status] ?? "xp-badge xp-badge-neutral";
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold">Contract Change Requests</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and action pending contract changes before they go live
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Total Requests"
          value={totalCount}
          iconBg="bg-blue-50 dark:bg-blue-900/30"
          icon={<ListChecks size={20} className="text-blue-500" />}
          sub={<span className="text-gray-400">In selected range</span>}
        />
        <StatCard
          label="Pending Review"
          value={pendingCount}
          iconBg="bg-amber-50 dark:bg-amber-900/30"
          icon={<Clock size={20} className="text-amber-500" />}
          sub={
            pendingCount > 0 ? (
              <span className="text-amber-500 font-medium">
                Requires action
              </span>
            ) : (
              <span className="text-emerald-500 font-medium">All clear</span>
            )
          }
        />
        <StatCard
          label="Approved"
          value={approvedCount}
          iconBg="bg-emerald-50 dark:bg-emerald-900/30"
          icon={<ThumbsUp size={20} className="text-emerald-500" />}
          sub={
            totalCount > 0 ? (
              <span className="text-gray-400">
                {Math.round((approvedCount / totalCount) * 100)}% approval rate
              </span>
            ) : null
          }
        />
        <StatCard
          label="Rejected"
          value={rejectedCount}
          iconBg="bg-rose-50 dark:bg-rose-900/30"
          icon={<ThumbsDown size={20} className="text-rose-500" />}
          sub={
            totalCount > 0 ? (
              <span className="text-gray-400">
                {Math.round((rejectedCount / totalCount) * 100)}% rejection rate
              </span>
            ) : null
          }
        />
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div
                className="grid grid-cols-1 md:grid-cols-5 gap-4"
                data-tour="contract-approvals-filter-row"
              >
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    className="input input-md w-full pl-9"
                    placeholder="Search employee..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="input input-md w-full"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
                <Button variant="solid" color="primary" onClick={load}>
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <table
              className="table-default table-hover w-full"
              data-tour="contract-approvals-table-card"
            >
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Changed Fields</th>
                  <th>Requested By</th>
                  <th>Requested At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      {search
                        ? "No results match your search."
                        : "No contract change requests found."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <EmployeeAvatar name={item.employeeName} />
                          <div>
                            <div className="font-medium leading-tight">
                              {item.employeeName}
                            </div>
                            <div className="text-xs text-gray-400">
                              {item.employeeCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm text-gray-500 dark:text-gray-400">
                        {changedFields(item)
                          .map((k) => FIELD_LABELS[k])
                          .join(", ") || "—"}
                      </td>
                      <td className="text-sm text-gray-500">
                        {item.requestedBy ?? "—"}
                      </td>
                      <td className="text-sm text-gray-400">
                        {fmtDateTime(item.requestedAt)}
                      </td>
                      <td>
                        <span className={statusBadge(item.status)}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                            onClick={() => openDetail(item)}
                            title="Review"
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail / Review Dialog */}
      <Dialog
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={720}
      >
        {selected && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <EmployeeAvatar name={selected.employeeName} size="md" />
              <div>
                <h5 className="font-semibold leading-tight">
                  {selected.employeeName}
                </h5>
                <p className="text-sm text-gray-400">{selected.employeeCode}</p>
              </div>
              <div className="ml-auto">
                <span className={statusBadge(selected.status)}>
                  {selected.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5">
              {/* Current */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h6 className="text-xs font-semibold text-gray-400 uppercase mb-3">
                  Current Record
                </h6>
                <div className="space-y-2 text-sm">
                  {Object.keys(FIELD_LABELS).map((k) => (
                    <div key={k} className="flex justify-between gap-3">
                      <span className="text-gray-500 shrink-0">
                        {FIELD_LABELS[k]}
                      </span>
                      <span className="text-right truncate">
                        {fmtValue(selected.oldSnapshot?.[k])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requested */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h6 className="text-xs font-semibold text-blue-500 uppercase mb-3">
                  Requested Change
                </h6>
                <div className="space-y-2 text-sm">
                  {Object.keys(FIELD_LABELS).map((k) => {
                    const isChanged =
                      String(selected.oldSnapshot?.[k] ?? "") !==
                      String(selected.newSnapshot?.[k] ?? "");
                    return (
                      <div key={k} className="flex justify-between gap-3">
                        <span className="text-gray-500 shrink-0">
                          {FIELD_LABELS[k]}
                        </span>
                        <span
                          className={`text-right truncate ${
                            isChanged
                              ? "font-semibold text-blue-600 dark:text-blue-400"
                              : ""
                          }`}
                        >
                          {fmtValue(selected.newSnapshot?.[k])}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Review info if already reviewed */}
            {selected.status !== "Pending" && (
              <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
                <div className="flex gap-2 mb-1">
                  <span className="text-gray-400">Reviewed by:</span>
                  <span>{selected.reviewedBy ?? "—"}</span>
                  <span className="text-gray-400 ml-2">
                    {fmtDateTime(selected.reviewedAt)}
                  </span>
                </div>
                {selected.reviewNotes && (
                  <div className="text-gray-600 dark:text-gray-300">
                    {selected.reviewNotes}
                  </div>
                )}
              </div>
            )}

            {/* Review notes + actions for pending */}
            {canApprove && selected.status === "Pending" && (
              <>
                <div className="mb-4">
                  <label className="form-label">
                    Review Notes <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add notes for your decision..."
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="plain" onClick={() => setDetailOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="solid"
                    color="danger"
                    loading={saving}
                    onClick={() => {
                      if (!reviewNotes.trim()) {
                        showError(
                          "Missing information",
                          "Review notes are required.",
                        );
                        return;
                      }
                      setDetailOpen(false);
                      setConfirmAction("REJECT");
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="solid"
                    color="primary"
                    loading={saving}
                    onClick={() => {
                      if (!reviewNotes.trim()) {
                        showError(
                          "Missing information",
                          "Review notes are required.",
                        );
                        return;
                      }
                      setDetailOpen(false);
                      setConfirmAction("APPROVE");
                    }}
                  >
                    Approve
                  </Button>
                </div>
              </>
            )}

            {(!canApprove || selected.status !== "Pending") && (
              <div className="flex justify-end mt-4">
                <Button variant="plain" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
              </div>
            )}
          </>
        )}
      </Dialog>

      {/* Approve confirmation */}
      <ConfirmDialog
        open={confirmAction === "APPROVE"}
        variant="info"
        title="Approve Contract Change"
        message={`This will update ${selected?.employeeName}'s active contract with the requested changes. This action cannot be undone.`}
        confirmLabel="Yes, Approve"
        cancelLabel="Cancel"
        loading={saving}
        onConfirm={() => handleReview("APPROVE")}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Reject confirmation */}
      <ConfirmDialog
        open={confirmAction === "REJECT"}
        variant="danger"
        title="Reject Contract Change"
        message={`The requested change for ${selected?.employeeName} will be rejected. The current contract will remain unchanged.`}
        confirmLabel="Yes, Reject"
        cancelLabel="Cancel"
        loading={saving}
        onConfirm={() => handleReview("REJECT")}
        onCancel={() => setConfirmAction(null)}
      />

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
