"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  ListChecks,
  ThumbsUp,
  ThumbsDown,
  Search,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { AttendanceAdjustmentRequest } from "@/types/attendance-log.types";

const STATUSES = ["Pending", "Approved", "Rejected"];

/* ── Avatar helpers (same pattern as Employees page) ── */
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

interface EmployeeAvatarProps {
  name: string;
  profilePictureUrl?: string | null;
  size?: "sm" | "md";
}

function EmployeeAvatar({ name, profilePictureUrl, size = "sm" }: EmployeeAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const dimension = size === "md" ? "w-9 h-9 text-sm" : "w-8 h-8 text-xs";
  const color = getAvatarColor(name);

  if (profilePictureUrl && !imgError) {
    const src = profilePictureUrl.startsWith("http")
      ? profilePictureUrl
      : `https://192.168.8.135:7208${profilePictureUrl}`;
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgError(true)}
        className={`${dimension} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

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

export default function AttendanceAdjustmentsPage() {
  useRequirePermission("Attendance.Adjustment.View");
  const canApprove = usePermission("Attendance.Adjustment.Approve");
  const userId = useAuthStore((s) => s.user?.userId);

  const initialized = useRef(false);
  const [items, setItems] = useState<AttendanceAdjustmentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [search, setSearch] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<AttendanceAdjustmentRequest | null>(
    null,
  );
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [saving, setSaving] = useState(false);

  const [confirmAction, setConfirmAction] = useState<
    "APPROVE" | "REJECT" | null
  >(null);

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await api.get("/attendance-adjustments", { params });
      setItems(res.data);
    } catch {
      showError("Failed to load", "Could not fetch adjustment requests.");
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

  const openDetail = (item: AttendanceAdjustmentRequest) => {
    setSelected(item);
    setReviewNotes("");
    setReviewError("");
    setDetailOpen(true);
  };

  const handleReview = async (action: "APPROVE" | "REJECT") => {
    if (!reviewNotes.trim()) {
      setReviewError("Review notes are required.");
      return;
    }
    if (!selected) return;
    if (!userId) {
      setReviewError(
        "Session not fully loaded yet — please refresh and try again.",
      );
      return;
    }
    setSaving(true);
    try {
      await api.post("/attendance-adjustments/review", {
        action,
        id: selected.id,
        reviewNotes: reviewNotes.trim(),
        requestedBy: userId,
      });
      setDetailOpen(false);
      setConfirmAction(null);
      await load();
      showSuccess(
        action === "APPROVE" ? "Approved" : "Rejected",
        action === "APPROVE"
          ? "Attendance record has been updated."
          : "Adjustment request has been rejected.",
      );
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response
        ?.data?.error;
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

  const attendanceStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      Present: "xp-badge xp-badge-success",
      Absent: "xp-badge xp-badge-danger",
      Late: "xp-badge xp-badge-warning",
      HalfDay: "xp-badge xp-badge-info",
      OnLeave: "xp-badge xp-badge-neutral",
      Holiday: "xp-badge xp-badge-info",
      WeekOff: "xp-badge xp-badge-neutral",
      ToBeRegularized: "xp-badge xp-badge-warning",
    };
    return map[status] ?? "xp-badge xp-badge-neutral";
  };

  const fmtTime = (dt: string | null) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fmtDateTime = (dt: string | null) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold">
            Attendance Adjustment Requests
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Review and approve HR attendance adjustment requests
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

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
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
            {/* Status */}
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
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Current Status</th>
                  <th>Requested Status</th>
                  <th>Requested By</th>
                  <th>Requested At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      {search
                        ? "No results match your search."
                        : "No adjustment requests found."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <EmployeeAvatar
                            name={item.employeeName}
                            profilePictureUrl={(item as any).profilePictureUrl}
                          />
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
                      <td>{item.workDate}</td>
                      <td>
                        <span className={attendanceStatusBadge(item.oldStatus)}>
                          {item.oldStatus}
                        </span>
                      </td>
                      <td>
                        <span className={attendanceStatusBadge(item.newStatus)}>
                          {item.newStatus}
                        </span>
                      </td>
                      <td className="text-sm text-gray-500">
                        {item.requestedByName}
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
                            title="View details"
                          >
                            <Eye size={15} />
                          </button>
                          {canApprove && item.status === "Pending" && (
                            <>
                              <button
                                className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500"
                                onClick={() => {
                                  setSelected(item);
                                  setReviewNotes("");
                                  setReviewError("");
                                  setDetailOpen(true);
                                }}
                                title="Approve"
                              >
                                <CheckCircle size={15} />
                              </button>
                              <button
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                                onClick={() => {
                                  setSelected(item);
                                  setReviewNotes("");
                                  setReviewError("");
                                  setDetailOpen(true);
                                }}
                                title="Reject"
                              >
                                <XCircle size={15} />
                              </button>
                            </>
                          )}
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
        width={680}
      >
        {selected && (
          <>
            {/* Dialog header with employee avatar */}
            <div className="flex items-center gap-3 mb-5">
              <EmployeeAvatar
                name={selected.employeeName}
                profilePictureUrl={(selected as any).profilePictureUrl}
                size="md"
              />
              <div>
                <h5 className="font-semibold leading-tight">
                  {selected.employeeName}
                </h5>
                <p className="text-sm text-gray-400">
                  {selected.employeeCode} · {selected.workDate}
                </p>
              </div>
              <div className="ml-auto">
                <span className={statusBadge(selected.status)}>
                  {selected.status}
                </span>
              </div>
            </div>

            {/* Comparison table */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              {/* Current */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h6 className="text-xs font-semibold text-gray-400 uppercase mb-3">
                  Current Record
                </h6>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={attendanceStatusBadge(selected.oldStatus)}>
                      {selected.oldStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Check In</span>
                    <span>{fmtTime(selected.oldCheckIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Check Out</span>
                    <span>{fmtTime(selected.oldCheckOut)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Hours</span>
                    <span>{selected.oldHoursWorked}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Break</span>
                    <span>{selected.oldBreakMinutes}m</span>
                  </div>
                </div>
              </div>

              {/* Requested */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <h6 className="text-xs font-semibold text-blue-500 uppercase mb-3">
                  Requested Change
                </h6>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className={attendanceStatusBadge(selected.newStatus)}>
                      {selected.newStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Check In</span>
                    <span>{fmtTime(selected.newCheckIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Check Out</span>
                    <span>{fmtTime(selected.newCheckOut)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Hours</span>
                    <span>{selected.newHoursWorked}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Break</span>
                    <span>{selected.newBreakMinutes}m</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <label className="form-label">Reason for Adjustment</label>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-600 dark:text-gray-300">
                {selected.reason}
              </div>
            </div>

            {/* Review info if already reviewed */}
            {selected.status !== "Pending" && (
              <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
                <div className="flex gap-2 mb-1">
                  <span className="text-gray-400">Reviewed by:</span>
                  <span>{selected.reviewedByName ?? "—"}</span>
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
                    onChange={(e) => {
                      setReviewNotes(e.target.value);
                      setReviewError("");
                    }}
                    placeholder="Add notes for your decision..."
                  />
                  {reviewError && (
                    <p className="text-red-500 text-xs mt-1">{reviewError}</p>
                  )}
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
        title="Approve Adjustment"
        message={`This will update the attendance record for ${selected?.employeeName} on ${selected?.workDate} with the requested changes. This action cannot be undone.`}
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
        title="Reject Adjustment"
        message={`The adjustment request for ${selected?.employeeName} on ${selected?.workDate} will be rejected. The original attendance record will remain unchanged.`}
        confirmLabel="Yes, Reject"
        cancelLabel="Cancel"
        loading={saving}
        onConfirm={() => handleReview("REJECT")}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}