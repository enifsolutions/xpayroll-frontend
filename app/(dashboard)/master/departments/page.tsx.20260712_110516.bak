"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Building2,
  Users,
  GitBranch,
  TrendingUp,
  Plus,
  Download,
  RefreshCw,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Network,
  Circle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
import { showSuccess, showError } from "@/lib/toast";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Department {
  id: string;
  branchId: string | null;
  branchName: string | null;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface DepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
  inactiveDepartments: number;
  totalBranches: number;
}

interface Branch {
  id: string;
  name: string;
}

interface DepartmentForm {
  name: string;
  code: string;
  branchId: string;
  description: string;
  isActive: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const AVATAR_COLORS = [
  "bg-violet-200 text-violet-800 dark:bg-violet-700 dark:text-violet-100",
  "bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-100",
  "bg-emerald-200 text-emerald-800 dark:bg-emerald-700 dark:text-emerald-100",
  "bg-amber-200 text-amber-800 dark:bg-amber-700 dark:text-amber-100",
  "bg-rose-200 text-rose-800 dark:bg-rose-700 dark:text-rose-100",
  "bg-cyan-200 text-cyan-800 dark:bg-cyan-700 dark:text-cyan-100",
  "bg-fuchsia-200 text-fuchsia-800 dark:bg-fuchsia-700 dark:text-fuchsia-100",
  "bg-orange-200 text-orange-800 dark:bg-orange-700 dark:text-orange-100",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {sub}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Hierarchy Tree ───────────────────────────────────────────────────────────

interface TreeNode extends Department {
  children: TreeNode[];
}

function buildTree(departments: Department[]): TreeNode[] {
  // Since parent_id isn't in the DTO yet, group by branch as top-level nodes
  const byBranch: Record<string, TreeNode[]> = {};
  for (const d of departments) {
    const key = d.branchName ?? "Unassigned";
    if (!byBranch[key]) byBranch[key] = [];
    byBranch[key].push({ ...d, children: [] });
  }

  // Return as flat branch-grouped array for visualization
  return departments.map((d) => ({ ...d, children: [] }));
}

function HierarchyTree({ departments }: { departments: Department[] }) {
  const byBranch = useMemo(() => {
    const map: Record<string, Department[]> = {};
    for (const d of departments) {
      const key = d.branchName ?? "Unassigned";
      if (!map[key]) map[key] = [];
      map[key].push(d);
    }
    return map;
  }, [departments]);

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      {Object.entries(byBranch).map(([branch, depts]) => (
        <div key={branch}>
          {/* Branch header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
              <GitBranch
                size={14}
                className="text-violet-600 dark:text-violet-400"
              />
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {branch}
            </span>
            <span className="text-xs text-gray-400">({depts.length})</span>
          </div>

          {/* Departments under branch */}
          <div className="ml-5 border-l-2 border-gray-100 dark:border-gray-700 pl-4 space-y-2">
            {depts.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${getAvatarColor(d.name)}`}
                >
                  {initials(d.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                    {d.name}
                  </p>
                  <p className="text-xs text-gray-400">{d.code}</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    d.isActive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {d.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DepartmentsPage() {
  const userId = useAuthStore((s) => s.user?.userId);
  const initialized = useRef(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [stats, setStats] = useState<DepartmentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Filters & pagination
  const [branchFilter, setBranchFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState(1);

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hierarchyOpen, setHierarchyOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<DepartmentForm>({
    name: "",
    code: "",
    branchId: "",
    description: "",
    isActive: true,
  });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ─── Load data ──────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      const [deptRes, branchRes] = await Promise.all([
        api.get("/departments"),
        api.get("/branches"),
      ]);
      setDepartments(deptRes.data ?? []);
      setBranches(branchRes.data ?? []);
    } catch {
      showError("Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get("/departments/stats");
      setStats(res.data);
    } catch {
      // stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
    loadStats();
  }, []);

  // ─── Filtered & paginated data ───────────────────────────────────────────────

  const filtered = useMemo(() => {
    return departments.filter((d) => {
      if (branchFilter && d.branchId !== branchFilter) return false;
      if (statusFilter === "active" && !d.isActive) return false;
      if (statusFilter === "inactive" && d.isActive) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !d.name.toLowerCase().includes(q) &&
          !d.code.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [departments, branchFilter, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [branchFilter, statusFilter, search]);

  // ─── Form helpers ────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      code: "",
      branchId: "",
      description: "",
      isActive: true,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditingId(d.id);
    setForm({
      name: d.name,
      code: d.code,
      branchId: d.branchId ?? "",
      description: d.description ?? "",
      isActive: d.isActive,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Department name is required");
      return;
    }
    if (!form.code.trim()) {
      setFormError("Department code is required");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.post("/departments/save", {
        action: editingId ? "UPDATE" : "ADD",
        id: editingId ?? null,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        branchId: form.branchId || null,
        description: form.description.trim() || null,
        isActive: form.isActive,
        userId,
      });
      setDialogOpen(false);
      showSuccess(editingId ? "Department updated" : "Department added");
      await Promise.all([load(), loadStats()]);
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      setFormError(
        msg ??
          (e?.response?.status === 409
            ? "Code already exists"
            : "Failed to save"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.post("/departments/save", { action: "DELETE", id, userId });
      setDeleteId(null);
      showSuccess("Department deleted");
      await Promise.all([load(), loadStats()]);
    } catch {
      showError("Failed to delete department");
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params = branchFilter ? `?branchId=${branchFilter}` : "";
      const res = await api.get(`/departments/export/csv${params}`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(
        new Blob([res.data], { type: "text/csv" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `departments_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess("CSV exported");
    } catch {
      showError("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Departments
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage organizational departments and branch assignments
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="default"
            size="sm"
            onClick={handleExportCsv}
            loading={exporting}
            icon={<Download size={15} />}
          >
            Export CSV
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setHierarchyOpen(true)}
            icon={<Network size={15} />}
          >
            View Hierarchy
          </Button>
          <Button
            variant="solid"
            size="sm"
            onClick={openAdd}
            icon={<Plus size={15} />}
          >
            Add Department
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Departments"
          value={statsLoading ? "—" : (stats?.totalDepartments ?? 0)}
          sub="All branches combined"
          icon={Building2}
          color="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
        />
        <KpiCard
          label="Active"
          value={statsLoading ? "—" : (stats?.activeDepartments ?? 0)}
          sub="Currently operational"
          icon={TrendingUp}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
        />
        <KpiCard
          label="Inactive"
          value={statsLoading ? "—" : (stats?.inactiveDepartments ?? 0)}
          sub="Suspended or dissolved"
          icon={Circle}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
        />
        <KpiCard
          label="Branches"
          value={statsLoading ? "—" : (stats?.totalBranches ?? 0)}
          sub="With departments assigned"
          icon={GitBranch}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        />
      </div>

      {/* ── Table card ── */}
      <div className="card">
        <div className="card-body">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Input
                placeholder="Search by name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>

            {/* Branch filter */}
            <select
              className="input"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 130 }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Refresh */}
            <button
              onClick={() => {
                load();
                loadStats();
              }}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            <span className="text-sm text-gray-400 ml-auto whitespace-nowrap">
              {filtered.length} department{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Building2 size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No departments found</p>
              {(search || branchFilter || statusFilter) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setBranchFilter("");
                    setStatusFilter("");
                  }}
                  className="text-xs text-violet-500 hover:underline mt-1"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Code</th>
                    <th>Branch</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((d) => (
                    <tr key={d.id}>
                      {/* Department with avatar */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(d.name)}`}
                          >
                            {initials(d.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                              {d.name}
                            </p>
                            <p className="text-xs text-gray-400">
                              Added{" "}
                              {new Date(d.createdAt).toLocaleDateString(
                                "en-GB",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">
                          {d.code}
                        </span>
                      </td>

                      {/* Branch */}
                      <td>
                        {d.branchName ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-full">
                            <GitBranch size={11} />
                            {d.branchName}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Description */}
                      <td>
                        <span
                          className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 max-w-[220px]"
                          title={d.description ?? ""}
                        >
                          {d.description ?? "—"}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`xp-badge ${d.isActive ? "xp-badge-success" : "xp-badge-neutral"}`}
                        >
                          {d.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(d)}
                            className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteId(d.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages} &nbsp;·&nbsp; {filtered.length}{" "}
                results
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (n) =>
                      n === 1 || n === totalPages || Math.abs(n - page) <= 1,
                  )
                  .reduce<(number | "...")[]>((acc, n, i, arr) => {
                    if (i > 0 && n - (arr[i - 1] as number) > 1)
                      acc.push("...");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === "..." ? (
                      <span
                        key={`e${i}`}
                        className="px-1 text-gray-400 text-sm"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          page === n
                            ? "bg-violet-600 text-white"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {n}
                      </button>
                    ),
                  )}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        width={480}
      >
        <div className="mb-5">
          <h5 className="font-semibold text-gray-900 dark:text-white">
            {editingId ? "Edit Department" : "Add Department"}
          </h5>
        </div>

        <div className="space-y-4">
          <div>
            <label className="form-label">
              Department Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Engineering"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label">
              Code <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. DEPT-ENG-001"
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
            />
          </div>

          <div>
            <label className="form-label">Branch</label>
            <select
              className="input w-full"
              value={form.branchId}
              onChange={(e) =>
                setForm((f) => ({ ...f, branchId: e.target.value }))
              }
            >
              <option value="">— Select Branch —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="input w-full resize-none"
              rows={3}
              placeholder="Brief description of this department's role…"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="form-label mb-0">Active</span>
            <Switcher
              checked={form.isActive}
              onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
          </div>

          {formError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="default" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" onClick={handleSave} loading={saving}>
              {editingId ? "Save Changes" : "Add Department"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} width={400}>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <div>
            <h5 className="font-semibold text-gray-900 dark:text-white">
              Delete Department
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              This action cannot be undone. The department will be soft-deleted.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-1">
            <Button variant="default" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              className="bg-red-500 hover:bg-red-600 text-white border-red-500"
              onClick={() => handleDelete(deleteId!)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── Hierarchy Dialog ── */}
      {hierarchyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setHierarchyOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 dark:bg-black/70" />
          {/* Panel */}
          <div
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-[560px] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5">
              <h5 className="font-semibold text-gray-900 dark:text-white">
                Department Hierarchy
              </h5>
              <p className="text-xs text-gray-400 mt-0.5">
                Organized by branch
              </p>
            </div>
            {departments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No departments to display
              </p>
            ) : (
              <HierarchyTree departments={departments} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
