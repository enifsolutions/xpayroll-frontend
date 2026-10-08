"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Eye,
  Lock,
  Search,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "@/lib/axios";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import { showError } from "@/lib/toast";
import RecordGrievanceDialog from "./RecordGrievanceDialog";
import Button from "@/components/ui/Button";

// ── Types (mirrors GrievanceDto exactly) ──────────────────────────────────────
interface GrievanceRow {
  id: string;
  employeeId: string | null;
  employeeName: string | null;
  categoryId: string;
  categoryName: string;
  subject: string;
  status: string;
  isConfidential: boolean;
  isAnonymous: boolean;
  severity: string;
  assignedTo: string | null;
  assignedToName: string | null;
  acknowledgeDueAt: string | null;
  resolveDueAt: string | null;
  acknowledgedAt: string | null;
  escalatedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

const SEVERITIES = ["Low", "Medium", "High", "Critical"];
const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Open", value: "Open" },
  { label: "In Progress", value: "InProgress" },
  { label: "Resolved", value: "Resolved" },
  { label: "Closed", value: "Closed" },
  { label: "Withdrawn", value: "Withdrawn" },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Open: "bg-blue-50 text-blue-700 border-blue-200",
    InProgress: "bg-amber-50 text-amber-700 border-amber-200",
    Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Closed: "bg-gray-100 text-gray-600 border-gray-200",
    Withdrawn: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}
    >
      {status === "InProgress" ? "In Progress" : status}
    </span>
  );
}

function severityBadge(sev: string) {
  const map: Record<string, string> = {
    Low: "bg-gray-100 text-gray-600",
    Medium: "bg-blue-50 text-blue-700",
    High: "bg-amber-50 text-amber-700",
    Critical: "bg-rose-50 text-rose-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[sev] ?? "bg-gray-100 text-gray-600"}`}
    >
      {sev}
    </span>
  );
}

// SLA badge is computed client-side, deliberately not dependent on the
// Hangfire sweep's stamped columns — this shows live status the instant a
// deadline approaches, not only after the hourly sweep has run. The
// due-soon window is derived the same way the sweep computes it:
// window = dueAt - createdAt (the original SLA period), threshold =
// dueAt - window * (1 - pct/100). This reproduces fn_get_grievance_sla_due's
// own math rather than an arbitrary fixed lookahead.
type SlaState = "breached" | "due-soon" | "on-track" | "none";

function computeSla(row: GrievanceRow, pct: number): SlaState {
  if (!["Open", "InProgress"].includes(row.status)) return "none";
  const now = Date.now();
  const created = new Date(row.createdAt).getTime();

  const check = (dueAt: string | null, satisfied: boolean): SlaState | null => {
    if (!dueAt || satisfied) return null;
    const due = new Date(dueAt).getTime();
    if (now >= due) return "breached";
    const window = due - created;
    const warningStart = due - window * (1 - pct / 100);
    if (now >= warningStart) return "due-soon";
    return "on-track";
  };

  const ack = check(row.acknowledgeDueAt, !!row.acknowledgedAt);
  const resolve = check(row.resolveDueAt, !!row.resolvedAt);

  // Worse of the two applicable states wins.
  const rank: Record<string, number> = {
    breached: 3,
    "due-soon": 2,
    "on-track": 1,
  };
  const candidates = [ack, resolve].filter(Boolean) as SlaState[];
  if (candidates.length === 0) return "none";
  return candidates.reduce((a, b) => (rank[b] > rank[a] ? b : a));
}

function slaBadge(state: SlaState) {
  switch (state) {
    case "breached":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle size={11} /> Breached
        </span>
      );
    case "due-soon":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={11} /> Due Soon
        </span>
      );
    case "on-track":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={11} /> On Track
        </span>
      );
    default:
      return <span className="text-xs text-gray-400">—</span>;
  }
}

interface KpiCardProps {
  label: string;
  value: string | number;
  iconBg: string;
  icon: React.ReactNode;
}
function KpiCard({ label, value, iconBg, icon }: KpiCardProps) {
  return (
    <div className="card">
      <div className="card-body flex flex-col gap-2">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          {icon}
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-1">
          {label}
        </p>
        <p className="text-2xl font-bold heading-text">{value}</p>
      </div>
    </div>
  );
}

const PAGE_SIZE = 10;
function paginationPages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  )
    pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

export default function GrievancesPage() {
  useRequirePermission(Permissions.HR.Grievance.View);
  const canAdd = usePermission(Permissions.HR.Grievance.Add);
  const router = useRouter();
  const initialized = useRef(false);

  const [rows, setRows] = useState<GrievanceRow[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [slaPct, setSlaPct] = useState(80);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [page, setPage] = useState(1);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadStaticData();
    load();
  }, []);

  useEffect(() => {
    load();
  }, [statusFilter, categoryFilter, severityFilter]);

  async function loadStaticData() {
    try {
      const [catRes, policyRes] = await Promise.all([
        axios.get("/grievance-config/categories", {
          params: { activeOnly: true },
        }),
        axios.get("/grievance-config/policy"),
      ]);
      setCategories(
        catRes.data.map((c: any) => ({ id: String(c.id), name: c.name })),
      );
      setSlaPct(policyRes.data.slaWarningThresholdPct ?? 80);
    } catch {
      // Non-fatal: category filter degrades to empty, SLA badge falls
      // back to the 80% default.
    }
  }

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (severityFilter) params.severity = severityFilter;

      const res = await axios.get("/grievances", { params });
      setRows(
        res.data.map((r: any) => ({
          ...r,
          id: String(r.id),
          employeeId: r.employeeId != null ? String(r.employeeId) : null,
          categoryId: String(r.categoryId),
          assignedTo: r.assignedTo != null ? String(r.assignedTo) : null,
        })),
      );
      setPage(1);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load grievance cases.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openCase(id: string) {
    router.push(`/hr/grievances/${id}`);
  }

  function handleRecordClick() {
    setRecordDialogOpen(true);
  }

  const filteredRows = rows.filter((r) => {
    const matchesEmployee = employeeSearch.trim()
      ? (r.employeeName ?? "Anonymous")
          .toLowerCase()
          .includes(employeeSearch.toLowerCase())
      : true;
    const matchesAssignee = assigneeSearch.trim()
      ? (r.assignedToName ?? "")
          .toLowerCase()
          .includes(assigneeSearch.toLowerCase())
      : true;
    return matchesEmployee && matchesAssignee;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCount = rows.filter((r) => r.status === "Open").length;
  const inProgressCount = rows.filter((r) => r.status === "InProgress").length;
  const breachedCount = rows.filter(
    (r) => computeSla(r, slaPct) === "breached",
  ).length;
  const resolvedDurations = rows
    .filter((r) => r.resolvedAt)
    .map(
      (r) =>
        (new Date(r.resolvedAt!).getTime() - new Date(r.createdAt).getTime()) /
        86400000,
    );
  const avgResolutionDays =
    resolvedDurations.length > 0
      ? (
          resolvedDurations.reduce((a, b) => a + b, 0) /
          resolvedDurations.length
        ).toFixed(1)
      : "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="mb-1">Grievances</h3>
          <p className="text-sm text-gray-500">
            Track and manage employee grievance cases across your organization.
          </p>
        </div>
        {canAdd && (
          <Button
            variant="solid"
            color="primary"
            icon={<Plus size={16} />}
            onClick={handleRecordClick}
          >
            Record Grievance
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Open"
          value={openCount}
          iconBg="bg-blue-500"
          icon={<FolderOpen size={18} className="text-white" />}
        />
        <KpiCard
          label="In Progress"
          value={inProgressCount}
          iconBg="bg-amber-500"
          icon={<Clock size={18} className="text-white" />}
        />
        <KpiCard
          label="Breached SLA"
          value={breachedCount}
          iconBg="bg-rose-500"
          icon={<AlertTriangle size={18} className="text-white" />}
        />
        <KpiCard
          label="Avg Resolution (days)"
          value={avgResolutionDays}
          iconBg="bg-emerald-500"
          icon={<CheckCircle2 size={18} className="text-white" />}
        />
      </div>

      <div className="card">
        <div className="card-body py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-5 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Employee
              </span>
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  className="input pl-8 w-full"
                  placeholder="Search employee…"
                  value={employeeSearch}
                  onChange={(e) => {
                    setEmployeeSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Status
              </span>
              <select
                className="input w-full"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {STATUS_TABS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Category
              </span>
              <select
                className="input w-full"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Severity
              </span>
              <select
                className="input w-full"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="">All</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Assignee
              </span>
              <div className="relative">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  className="input pl-8 w-full"
                  placeholder="Search assignee…"
                  value={assigneeSearch}
                  onChange={(e) => {
                    setAssigneeSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

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
                    <th>Case</th>
                    <th>Employee</th>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>SLA</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-10 text-gray-400"
                      >
                        No grievance cases found.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer"
                        onClick={() => openCase(row.id)}
                      >
                        <td className="text-sm font-mono text-gray-500">
                          {row.id}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            {row.isConfidential && (
                              <Lock
                                size={12}
                                className="text-amber-500 shrink-0"
                                aria-label="Confidential"
                              />
                            )}
                            <span className="text-sm font-medium">
                              {row.isAnonymous
                                ? "Anonymous"
                                : (row.employeeName ?? "—")}
                            </span>
                          </div>
                        </td>
                        <td className="text-sm">{row.categoryName}</td>
                        <td>{severityBadge(row.severity)}</td>
                        <td>{statusBadge(row.status)}</td>
                        <td>{slaBadge(computeSla(row, slaPct))}</td>
                        <td className="text-sm">{row.assignedToName ?? "—"}</td>
                        <td className="text-sm text-gray-500 whitespace-nowrap">
                          {new Date(row.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                            onClick={() => openCase(row.id)}
                            title="View case"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filteredRows.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
                    {Math.min(page * PAGE_SIZE, filteredRows.length)} of{" "}
                    {filteredRows.length} entries
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
      <RecordGrievanceDialog
        isOpen={recordDialogOpen}
        onClose={() => setRecordDialogOpen(false)}
        onDone={() => {
          setRecordDialogOpen(false);
          load();
        }}
      />
    </div>
  );
}
