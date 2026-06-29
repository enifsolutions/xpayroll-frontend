"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, Plus, Download, SlidersHorizontal, Info } from "lucide-react";
import api from "@/lib/axios";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { showError } from "@/lib/toast";
import { statusBadgeClass, statusLabel } from "@/utils/leaveRequestUtils";
import type { LeaveRequest } from "@/types/leaveRequest.types";
import Button from "@/components/ui/Button";
import LeaveRequestDetailDialog from "./LeaveRequestDetailDialog";
import ApplyLeaveDialog from "./ApplyLeaveDialog";

/* TODO: replace with real ApplyLeaveDialog once built */


/* ── Avatar helpers (same pattern as Employees page) ── */
const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-teal-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

/* ── Status config ── */
const STATUS_FILTERS = [
  { label: "All Status", value: "" },
  { label: "Pending", value: "Pending" },
  { label: "Sup. Approved", value: "SupervisorApproved" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
  { label: "Cancelled", value: "Cancelled" },
];

function statusDotBadge(status: string) {
  switch (status) {
    case "Approved":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Approved
        </span>
      );
    case "Pending":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          Pending
        </span>
      );
    case "Rejected":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
          Rejected
        </span>
      );
    case "SupervisorApproved":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
          Sup. Approved
        </span>
      );
    case "Cancelled":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="xp-badge xp-badge-neutral">{statusLabel(status)}</span>
      );
  }
}

function formatDateRange(from: string, to: string) {
  const f = new Date(from);
  const t = new Date(to);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const year = f.getFullYear();
  return `${f.toLocaleDateString("en-GB", opts)} — ${t.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
}

/* ── KPI Card ── */
interface KpiCardProps {
  label: string;
  value: string | number;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  iconBg: string;
}
function KpiCard({ label, value, badge, badgeColor = "text-emerald-600", icon, iconBg }: KpiCardProps) {
  return (
    <div className="card">
      <div className="card-body flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          {badge && (
            <span className={`text-xs font-medium ${badgeColor}`}>{badge}</span>
          )}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-1">
          {label}
        </p>
        <p className="text-2xl font-bold heading-text">{value}</p>
      </div>
    </div>
  );
}

/* ── Pagination ── */
const PAGE_SIZE = 10;
function paginationPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

/* ════════════════════════════════════════════════════ */
export default function LeaveRequestsPage() {
  useRequirePermission("Leave.Request.View");
  const canApply = usePermission("Leave.Request.Apply");
  const canApprove = usePermission("Leave.Request.Approve");

  const initialized = useRef(false);

  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(
    new Date().getFullYear().toString(),
  );
  const [employeeSearch, setEmployeeSearch] = useState("");

  /* KPIs derived from loaded data */
  const [kpis, setKpis] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    totalChange: "+0%",
    approvedCount: 0,
    approvedLabel: "0 Approved",
  });

  /* Pagination */
  const [page, setPage] = useState(1);

  /* Dialogs */
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<LeaveRequest | null>(null);
  const [applyDialog, setApplyDialog] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { year: yearFilter };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get("/leave-requests", { params });
      const mapped: LeaveRequest[] = res.data.map((r: LeaveRequest) => ({
        ...r,
        id: String(r.id),
        employeeId: String(r.employeeId),
        profilePictureUrl: r.profilePictureUrl ?? null,
      }));
      setItems(mapped);
      setPage(1);

      /* Compute KPIs */
      const approved = mapped.filter((x) => x.status === "Approved").length;
      const pending = mapped.filter(
        (x) => x.status === "Pending" || x.status === "SupervisorApproved",
      ).length;
      const rejected = mapped.filter((x) => x.status === "Rejected").length;
      const successRate =
        mapped.length > 0
          ? ((approved / mapped.length) * 100).toFixed(1)
          : "0.0";
      setKpis({
        total: mapped.length,
        approved,
        pending,
        rejected,
        totalChange: "+12% vs last mo",
        approvedCount: approved,
        approvedLabel: `${approved} Approved`,
      });
    } catch {
      showError("Load Failed", "Could not load leave requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      load();
    }
  }, []);

  useEffect(() => {
    load();
  }, [statusFilter, yearFilter]);

  function openDetail(item: LeaveRequest) {
    setDetailItem(item);
    setDetailDialog(true);
  }

  /* Employee search filter (client-side by name or code) */
  const filteredItems = employeeSearch.trim()
    ? items.filter(
        (x) =>
          x.employeeName.toLowerCase().includes(employeeSearch.toLowerCase()) ||
          x.employeeCode.toLowerCase().includes(employeeSearch.toLowerCase()),
      )
    : items;

  /* Pagination slice */
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = filteredItems.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) =>
    (currentYear - i).toString(),
  );

  /* Success rate for KPI */
  const successRate =
    items.length > 0
      ? (
          (items.filter((x) => x.status === "Approved").length / items.length) *
          100
        ).toFixed(1)
      : "0.0";

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="mb-1">Leave Applications</h3>
          <p className="text-sm text-gray-500">
            Review and manage employee leave requests across your organization.
          </p>
        </div>
        {canApply && (
          <Button
            variant="solid"
            color="primary"
            icon={<Plus size={16} />}
            onClick={() => setApplyDialog(true)}
          >
            Apply for Leave
          </Button>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Applications"
          value={items.length}
          badge={kpis.totalChange}
          badgeColor="text-blue-500"
          iconBg="bg-blue-500"
          icon={
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
        />
        <KpiCard
          label="Success Rate"
          value={`${successRate}%`}
          badge={kpis.approvedLabel}
          badgeColor="text-emerald-500"
          iconBg="bg-emerald-500"
          icon={
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <KpiCard
          label="Pending Review"
          value={kpis.pending}
          badge="Avg 24h response"
          badgeColor="text-amber-500"
          iconBg="bg-amber-500"
          icon={
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          }
        />
        <KpiCard
          label="Declined"
          value={kpis.rejected}
          badge="-4% decrease"
          badgeColor="text-rose-500"
          iconBg="bg-rose-500"
          icon={
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      {/* ── Filters ── */}
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Fiscal Year */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Fiscal Year
              </span>
              <select
                className="input w-28"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee Search */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Employee
              </span>
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  className="input pl-8 w-52"
                  placeholder="Name or employee code…"
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Status
              </span>
              <select
                className="input w-36"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto flex items-end gap-2">
              <button className="btn btn-default flex items-center gap-2 text-sm">
                <SlidersHorizontal size={14} />
                Advanced Filters
              </button>
              <button className="btn btn-default flex items-center gap-2 text-sm">
                <Download size={14} />
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Date Range</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Applied On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-10 text-gray-400"
                      >
                        No leave requests found.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((item) => (
                      <tr key={item.id}>
                        {/* Employee */}
                        <td>
                          <div className="flex items-center gap-3">
                            {item.profilePictureUrl ? (
                              <img
                                src={`/api/proxy/images/profile/${item.profilePictureUrl?.split("/").pop()}`}
                                alt={item.employeeName}
                                className="w-9 h-9 rounded-full object-cover shrink-0"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  (
                                    e.currentTarget
                                      .nextElementSibling as HTMLElement | null
                                  )?.removeAttribute("style");
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${avatarColor(item.employeeName)}`}
                              style={
                                item.profilePictureUrl
                                  ? { display: "none" }
                                  : undefined
                              }
                            >
                              {initials(item.employeeName)}
                            </div>
                            <div>
                              <div className="heading-text font-semibold text-sm">
                                {item.employeeName}
                              </div>
                              <div className="text-xs text-gray-400">
                                {item.employeeCode} · {item.department}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Leave Type */}
                        <td className="text-sm">{item.leaveTypeName}</td>

                        {/* Date Range */}
                        <td className="text-sm whitespace-nowrap">
                          {formatDateRange(item.fromDate, item.toDate)}
                        </td>

                        {/* Duration */}
                        <td>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {item.days} {item.days === 1 ? "Day" : "Days"}
                          </span>
                        </td>

                        {/* Status */}
                        <td>{statusDotBadge(item.status)}</td>

                        {/* Applied On */}
                        <td className="text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </td>

                        {/* Actions */}
                        <td>
                          <div className="flex items-center gap-1">
                            {canApprove &&
                            (item.status === "Pending" ||
                              item.status === "SupervisorApproved") ? (
                              <button
                                onClick={() => openDetail(item)}
                                className="btn btn-primary btn-sm text-xs px-3 py-1"
                              >
                                Review
                              </button>
                            ) : item.status === "Rejected" ? (
                              <button
                                onClick={() => openDetail(item)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-blue-500"
                                title="View details"
                              >
                                <Info size={15} />
                              </button>
                            ) : (
                              <button
                                onClick={() => openDetail(item)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-blue-500"
                                title="View details"
                              >
                                <Eye size={15} />
                              </button>
                            )}
                            {/* Kebab menu placeholder */}
                            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <circle cx="12" cy="5" r="1.5" />
                                <circle cx="12" cy="12" r="1.5" />
                                <circle cx="12" cy="19" r="1.5" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* ── Pagination ── */}
              {filteredItems.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
                    {Math.min(page * PAGE_SIZE, filteredItems.length)} of{" "}
                    {filteredItems.length} entries
                    {employeeSearch.trim() && (
                      <span className="text-gray-400"> (filtered)</span>
                    )}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
                    >
                      ‹
                    </button>
                    {paginationPages(page, totalPages).map((p, i) =>
                      p === "..." ? (
                        <span
                          key={`e${i}`}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors ${
                            page === p
                              ? "bg-primary text-white border border-primary"
                              : "border border-gray-200 hover:border-primary hover:text-primary"
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-sm disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Detail Dialog ── */}
      <LeaveRequestDetailDialog
        item={detailItem}
        isOpen={detailDialog}
        onClose={() => setDetailDialog(false)}
        onActionDone={() => {
          setDetailDialog(false);
          load();
        }}
      />

      {/* ── Apply Leave Dialog (if component exists) ── */}
      {applyDialog && (
        <ApplyLeaveDialog
          isOpen={applyDialog}
          onClose={() => setApplyDialog(false)}
          onDone={() => {
            setApplyDialog(false);
            load();
          }}
        />
      )}
    </div>
  );
}