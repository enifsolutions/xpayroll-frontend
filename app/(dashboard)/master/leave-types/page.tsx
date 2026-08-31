'use client';

import { useEffect, useState, useRef, useMemo } from "react";
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import {
  PlusIcon,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Wallet,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";
import { useTour } from "@/hooks/useTour";
import TourOverlay from "@/components/onboarding/TourOverlay";
import { LEAVE_TYPES_STEPS } from "@/lib/tours/leave-types";

interface LeaveType {
  id: string;
  name: string;
  code: string;
  accrualType: string;
  daysPerYear: number;
  isPaid: boolean;
  carryForward: boolean;
  maxCarryDays: number;
  requiresApproval: boolean;
  minNoticeDays: number;
  genderRestriction: string | null;
  isCoveringEmployee: boolean;
  isActive: boolean;
}

interface LeaveTypeStats {
  totalLeaveTypes: number;
  activeCount: number;
  inactiveCount: number;
  paidCount: number;
}

interface LeaveTypeForm {
  name: string;
  code: string;
  accrualType: string;
  daysPerYear: string;
  isPaid: boolean;
  carryForward: boolean;
  maxCarryDays: string;
  requiresApproval: boolean;
  minNoticeDays: string;
  genderRestriction: string;
  isCoveringEmployee: boolean;
  isActive: boolean;
}

const EMPTY: LeaveTypeForm = {
  name: "",
  code: "",
  accrualType: "Annual",
  daysPerYear: "",
  isPaid: true,
  carryForward: false,
  maxCarryDays: "0",
  requiresApproval: true,
  minNoticeDays: "0",
  genderRestriction: "",
  isCoveringEmployee: false,
  isActive: true,
};

const ACCRUAL_OPTIONS = [
  { value: 'Annual',    label: 'Annual' },
  { value: 'Monthly',   label: 'Monthly' },
  { value: 'NoAccrual', label: 'No Accrual' },
];

const PAGE_SIZE = 10;

// Avatar colour palette keyed by name hash (same as Designations/Shifts)
const AVATAR_COLORS = [
  "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
];

const avatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export default function LeaveTypesPage() {
  const tour = useTour("admin-page-leave-types", LEAVE_TYPES_STEPS);
  useRequirePermission(Permissions.MasterData.LeaveTypes.View);
  const canManage = usePermission(Permissions.MasterData.LeaveTypes.Manage);
  const userId = useAuthStore((s) => s.user?.userId);

  const [items, setItems] = useState<LeaveType[]>([]);
  const [stats, setStats] = useState<LeaveTypeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveType | null>(null);
  const [form, setForm] = useState<LeaveTypeForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const initialized = useRef(false);

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">(
    "all",
  );
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        api.get<LeaveType[]>("/leave-types"),
        api.get<LeaveTypeStats>("/leave-types/stats"),
      ]);
      setItems(listRes.data);
      setStats(statsRes.data);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load leave types.",
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

  // Filtered + paginated
  const filtered = useMemo(() => {
    return items.filter((i) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? i.isActive
            : !i.isActive;
      const matchPaid =
        paidFilter === "all"
          ? true
          : paidFilter === "paid"
            ? i.isPaid
            : !i.isPaid;
      return matchSearch && matchStatus && matchPaid;
    });
  }, [items, search, statusFilter, paidFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, paidFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (item: LeaveType) => {
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code,
      accrualType: item.accrualType,
      daysPerYear: String(item.daysPerYear),
      isPaid: item.isPaid,
      carryForward: item.carryForward,
      maxCarryDays: String(item.maxCarryDays),
      requiresApproval: item.requiresApproval,
      minNoticeDays: String(item.minNoticeDays),
      genderRestriction: item.genderRestriction ?? "",
      isCoveringEmployee: item.isCoveringEmployee,
      isActive: item.isActive,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and Code are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/leave-types/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        accrualType: form.accrualType,
        daysPerYear: parseFloat(form.daysPerYear) || 0,
        isPaid: form.isPaid,
        carryForward: form.carryForward,
        maxCarryDays: parseInt(form.maxCarryDays) || 0,
        requiresApproval: form.requiresApproval,
        minNoticeDays: parseInt(form.minNoticeDays) || 0,
        genderRestriction: form.genderRestriction || null,
        isCoveringEmployee: form.isCoveringEmployee,
        isActive: form.isActive,
        userId,
      });
      setDialogOpen(false);
      await load();
      showSuccess(
        editing ? "Leave type updated" : "Leave type created",
        form.name,
      );
    } catch (err: any) {
      showError(
        "Failed to save",
        err?.response?.data?.error ?? "Could not save leave type.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: LeaveType) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.post("/leave-types/save", { action: "DELETE", id: item.id });
      await load();
      showSuccess("Leave type deleted", item.name);
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.error ?? "Could not delete leave type.",
      );
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Leave Types</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Define leave entitlements, accrual rules, and approval policies.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
            data-tour="leave-types-add-button"
          >
            Add Leave Type
          </Button>
        )}
      </div>

      {/* Stat cards — compact horizontal row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="card-body py-4 px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Total Types
            </p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold heading-text">
                {loading ? "–" : (stats?.totalLeaveTypes ?? 0)}
              </span>
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 mb-0.5">
                <CalendarDays size={18} />
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body py-4 px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Active
            </p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold heading-text">
                {loading ? "–" : (stats?.activeCount ?? 0)}
              </span>
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 mb-0.5">
                <CheckCircle2 size={18} />
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body py-4 px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Inactive
            </p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold heading-text">
                {loading ? "–" : (stats?.inactiveCount ?? 0)}
              </span>
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 mb-0.5">
                <XCircle size={18} />
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body py-4 px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Paid Leave
            </p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold heading-text">
                {loading ? "–" : (stats?.paidCount ?? 0)}
              </span>
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 mb-0.5">
                <Wallet size={18} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-body">
          {/* Search + filter row */}
          <div
            className="flex items-center gap-3 mb-5"
            data-tour="leave-types-filter-row"
          >
            <div className="relative flex-1 max-w-xs">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 w-full"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input w-36"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={paidFilter}
              onChange={(e) => setPaidFilter(e.target.value as any)}
              className="input w-36"
            >
              <option value="all">All Types</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>

            <span className="ml-auto text-sm text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {filtered.length} type{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <table
                className="table-default table-hover w-full"
                data-tour="leave-types-table-card"
              >
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Accrual</th>
                    <th>Days/Year</th>
                    <th>Paid</th>
                    <th>Carry Forward</th>
                    <th>Approval</th>
                    <th>Covering Emp.</th>
                    <th>Status</th>
                    {canManage && <th className="w-24 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManage ? 10 : 9}
                        className="text-center py-8 text-gray-400"
                      >
                        No leave types found
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item) => (
                      <tr key={item.id}>
                        {/* Name with avatar */}
                        <td>
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-semibold shrink-0 ${avatarColor(item.name)}`}
                            >
                              {initials(item.name)}
                            </span>
                            <span className="font-medium heading-text">
                              {item.name}
                            </span>
                          </div>
                        </td>

                        {/* Code */}
                        <td>
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {item.code}
                          </code>
                        </td>

                        {/* Accrual */}
                        <td className="text-sm">
                          {ACCRUAL_OPTIONS.find(
                            (o) => o.value === item.accrualType,
                          )?.label ?? item.accrualType}
                        </td>

                        {/* Days/Year */}
                        <td className="text-sm tabular-nums">
                          {item.daysPerYear}
                        </td>

                        {/* Paid badge */}
                        <td>
                          <span
                            className={`xp-badge ${item.isPaid ? "xp-badge-success" : "xp-badge-neutral"}`}
                          >
                            {item.isPaid ? "Paid" : "Unpaid"}
                          </span>
                        </td>

                        {/* Carry Forward badge */}
                        <td>
                          {item.carryForward ? (
                            <span className="xp-badge xp-badge-info">
                              Up to {item.maxCarryDays}d
                            </span>
                          ) : (
                            <span className="xp-badge xp-badge-neutral">
                              No
                            </span>
                          )}
                        </td>

                        {/* Approval badge */}
                        <td>
                          <span
                            className={`xp-badge ${item.requiresApproval ? "xp-badge-warning" : "xp-badge-neutral"}`}
                          >
                            {item.requiresApproval ? "Required" : "Auto"}
                          </span>
                        </td>

                        {/* Covering Emp badge */}
                        <td>
                          <span
                            className={`xp-badge ${item.isCoveringEmployee ? "xp-badge-info" : "xp-badge-neutral"}`}
                          >
                            {item.isCoveringEmployee ? "Required" : "No"}
                          </span>
                        </td>

                        {/* Status badge */}
                        <td>
                          <span
                            className={`xp-badge ${item.isActive ? "xp-badge-success" : "xp-badge-danger"}`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        {canManage && (
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEdit(item)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-violet-50 hover:text-primary dark:hover:bg-violet-900/20 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

      {/* Add/Edit Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <h5 className="h5 mb-4">
          {editing ? "Edit Leave Type" : "Add Leave Type"}
        </h5>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Name <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g. Annual Leave"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">
                Code <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g. AL"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Accrual Type</label>
              <select
                className="input w-full"
                value={form.accrualType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, accrualType: e.target.value }))
                }
              >
                {ACCRUAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Days Per Year</label>
              <Input
                type="number"
                placeholder="e.g. 14"
                value={form.daysPerYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, daysPerYear: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Min Notice Days</label>
              <Input
                type="number"
                placeholder="0"
                value={form.minNoticeDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, minNoticeDays: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Max Carry Forward Days</label>
              <Input
                type="number"
                placeholder="0"
                value={form.maxCarryDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, maxCarryDays: e.target.value }))
                }
                disabled={!form.carryForward}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Gender Restriction</label>
            <select
              className="input w-full"
              value={form.genderRestriction}
              onChange={(e) =>
                setForm((f) => ({ ...f, genderRestriction: e.target.value }))
              }
            >
              <option value="">No Restriction</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="All">All</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Paid Leave</span>
              <Switcher
                checked={form.isPaid}
                onChange={(val) => setForm((f) => ({ ...f, isPaid: val }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Carry Forward</span>
              <Switcher
                checked={form.carryForward}
                onChange={(val) =>
                  setForm((f) => ({ ...f, carryForward: val }))
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Requires Approval</span>
              <Switcher
                checked={form.requiresApproval}
                onChange={(val) =>
                  setForm((f) => ({ ...f, requiresApproval: val }))
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                Covering Employee Required
              </span>
              <Switcher
                checked={form.isCoveringEmployee}
                onChange={(val) =>
                  setForm((f) => ({ ...f, isCoveringEmployee: val }))
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Active</span>
              <Switcher
                checked={form.isActive}
                onChange={(val) => setForm((f) => ({ ...f, isActive: val }))}
              />
            </div>
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