'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import {
  PlusIcon, Pencil, Trash2, Download, Search,
  Briefcase, Users, CircleOff, RotateCcw,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import { usePermission } from '@/hooks/usePermission';
import { Permissions } from '@/lib/permissions';
import { useAuthStore } from "@/store/authStore";

interface Designation {
  id: string;
  title: string;
  level: string | null;
  grade: string | null;
  isActive: boolean;
  employeeCount: number;
  absentDeductionAfterDays: number | null;
  lateDeductionPerMinute: number | null;
  overtimeRateMultiplier: number | null;
  createdAt: string;
}

interface DesignationStats {
  totalDesignations: number;
  totalEmployees: number;
  assignedCount: number;
  vacantCount: number;
}

interface DesignationForm {
  title: string;
  level: string;
  grade: string;
  isActive: boolean;
  absentDeductionAfterDays: string;
  lateDeductionPerMinute: string;
  overtimeRateMultiplier: string;
}

const EMPTY: DesignationForm = {
  title: '',
  level: '',
  grade: '',
  isActive: true,
  absentDeductionAfterDays: '',
  lateDeductionPerMinute: '',
  overtimeRateMultiplier: '',
};
const PAGE_SIZE = 10;

function initials(title: string) {
  return title
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

const AVATAR_PALETTE = [
  'xp-avatar-violet',
  'xp-avatar-blue',
  'xp-avatar-emerald',
  'xp-avatar-amber',
  'xp-avatar-rose',
  'xp-avatar-cyan',
  'xp-avatar-pink',
];

function avatarColor(title: string) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: number | string;
  sub: string;
  loading?: boolean;
}

function StatCard({ icon, iconBg, label, value, sub, loading }: StatCardProps) {
  return (
    <div className="card flex-1">
      <div className="card-body flex items-center gap-4 py-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {label}
          </p>
          {loading ? (
            <div className="mt-1 h-7 w-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ) : (
            <p className="text-2xl font-bold heading-text leading-tight">{value}</p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
        </div>
      </div>
    </div>
  );
}

export default function DesignationsPage() {
  useRequirePermission(Permissions.MasterData.Designations.View);
  const canManage = usePermission(Permissions.MasterData.Designations.Manage);
  const userId = useAuthStore((s) => s.user?.userId);

  const [items, setItems] = useState<Designation[]>([]);
  const [stats, setStats] = useState<DesignationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Designation | null>(null);
  const [form, setForm] = useState<DesignationForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get<DesignationStats>("/designations/stats");
      setStats(res.data);
    } catch {
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<Designation[]>("/designations");
      setItems(res.data);
      setPage(1);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load designations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
    loadStats();
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.level ?? "").toLowerCase().includes(q) ||
          (d.grade ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter === "active") list = list.filter((d) => d.isActive);
    if (statusFilter === "inactive") list = list.filter((d) => !d.isActive);
    return list;
  }, [items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setDialogOpen(true);
  };
  const openEdit = (d: Designation) => {
    setEditing(d);
    setForm({
      title: d.title,
      level: d.level ?? "",
      grade: d.grade ?? "",
      isActive: d.isActive,
      absentDeductionAfterDays: d.absentDeductionAfterDays?.toString() ?? "",
      lateDeductionPerMinute: d.lateDeductionPerMinute?.toString() ?? "",
      overtimeRateMultiplier: d.overtimeRateMultiplier?.toString() ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/designations/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        title: form.title.trim(),
        level: form.level.trim() || null,
        grade: form.grade.trim() || null,
        isActive: form.isActive,
        absentDeductionAfterDays: form.absentDeductionAfterDays
          ? parseInt(form.absentDeductionAfterDays)
          : null,
        lateDeductionPerMinute: form.lateDeductionPerMinute
          ? parseFloat(form.lateDeductionPerMinute)
          : null,
        overtimeRateMultiplier: form.overtimeRateMultiplier
          ? parseFloat(form.overtimeRateMultiplier)
          : null,
        userId,
      });
      setDialogOpen(false);
      await Promise.all([load(), loadStats()]);
      showSuccess(
        editing ? "Designation updated" : "Designation created",
        form.title,
      );
    } catch (err: any) {
      showError(
        "Failed to save",
        err?.response?.data?.error ?? "Could not save.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: Designation) => {
    if (!confirm(`Delete "${d.title}"?`)) return;
    try {
      await api.post("/designations/save", { action: "DELETE", id: d.id });
      await Promise.all([load(), loadStats()]);
      showSuccess("Designation deleted", d.title);
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.error ?? "Could not delete.",
      );
    }
  };

  const handleExport = () => {
    const csv = [
      ["Title", "Level", "Grade", "Employees", "Status"].join(","),
      ...filtered.map((d) =>
        [
          d.title,
          d.level ?? "",
          d.grade ?? "",
          d.employeeCount,
          d.isActive ? "Active" : "Inactive",
        ].join(","),
      ),
    ].join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: "designations.csv",
    });
    a.click();
  };

  const set = <K extends keyof DesignationForm>(k: K, v: DesignationForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const activeCount = items.filter((d) => d.isActive).length;
  const inactiveCount = items.filter((d) => !d.isActive).length;
  const branchCount = stats?.assignedCount ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="h3">Designations</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Manage organizational roles, hierarchical levels, and salary grades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            icon={<Download size={15} />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
          {canManage && (
            <Button
              variant="solid"
              icon={<PlusIcon size={16} />}
              onClick={openAdd}
            >
              Add Designation
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-5">
        <StatCard
          icon={<Briefcase size={18} className="text-violet-600" />}
          iconBg="bg-violet-100 dark:bg-violet-900/40"
          label="Total Designations"
          value={
            statsLoading ? "—" : (stats?.totalDesignations ?? items.length)
          }
          sub="All branches combined"
          loading={statsLoading}
        />
        <StatCard
          icon={<Users size={18} className="text-emerald-600" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/40"
          label="Active"
          value={activeCount}
          sub="Currently operational"
        />
        <StatCard
          icon={<CircleOff size={18} className="text-amber-500" />}
          iconBg="bg-amber-100 dark:bg-amber-900/40"
          label="Inactive"
          value={inactiveCount}
          sub="Suspended or dissolved"
        />
        <StatCard
          icon={<RotateCcw size={18} className="text-blue-500" />}
          iconBg="bg-blue-100 dark:bg-blue-900/40"
          label="Assigned"
          value={statsLoading ? "—" : branchCount}
          sub="With employees assigned"
          loading={statsLoading}
        />
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search designations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input w-full pl-9 text-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
              className="input text-sm w-40"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <span className="ml-auto text-sm text-gray-400 whitespace-nowrap">
              {filtered.length} designation{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-14">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Designation</th>
                    <th>Level</th>
                    <th>Grade</th>
                    <th>Employees</th>
                    <th>Status</th>
                    {canManage && <th className="w-24 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-14 text-gray-400"
                      >
                        No designations found
                      </td>
                    </tr>
                  ) : (
                    paged.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className={`xp-avatar xp-avatar-md ${avatarColor(d.title)}`}
                            >
                              {initials(d.title)}
                            </div>
                            <div>
                              <p className="font-semibold heading-text text-sm">
                                {d.title}
                              </p>
                              <p className="text-xs text-gray-400">
                                Added {fmtDate(d.createdAt)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {d.level ? (
                            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200">
                              {d.level}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="text-sm text-gray-600 dark:text-gray-400">
                          {d.grade ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="text-sm font-medium heading-text">
                          {d.employeeCount > 0 ? (
                            d.employeeCount
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`xp-badge ${d.isActive ? "xp-badge-success" : "xp-badge-neutral"}`}
                          >
                            {d.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        {canManage && (
                          <td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEdit(d)}
                                className="p-1.5 rounded-lg text-violet-400 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(d)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length} results
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (n) => (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            n === page
                              ? "bg-primary text-white"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
        width={640}
      >
        <h5 className="h5 mb-4">
          {editing ? "Edit Designation" : "Add Designation"}
        </h5>
        <div className="space-y-4">
          <div>
            <label className="form-label">
              Title <span className="text-error">*</span>
            </label>
            <Input
              placeholder="e.g. Software Engineer"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Level</label>
              <Input
                placeholder="e.g. Senior"
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Grade</label>
              <Input
                placeholder="e.g. G3"
                value={form.grade}
                onChange={(e) => set("grade", e.target.value)}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Deduction Rule Overrides
            </p>
            <p className="text-xs text-gray-400 mb-3">
              Optional. Leave blank to use the Company default (or whichever
              hierarchy channel is configured in Company Settings).
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Absent Deduct After (days)</label>
                <Input
                  type="number"
                  placeholder="Company default"
                  value={form.absentDeductionAfterDays}
                  onChange={(e) => set("absentDeductionAfterDays", e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Late Deduct / Minute</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Company default"
                  value={form.lateDeductionPerMinute}
                  onChange={(e) => set("lateDeductionPerMinute", e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">OT Rate Multiplier</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Company default"
                  value={form.overtimeRateMultiplier}
                  onChange={(e) => set("overtimeRateMultiplier", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Active</span>
            <Switcher
              checked={form.isActive}
              onChange={(v) => set("isActive", v)}
            />
          </div>
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
    </div>
  );
}
