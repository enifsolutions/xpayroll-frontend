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
  Clock,
  Moon,
  Sun,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import { useTour } from "@/hooks/useTour";
import TourOverlay from "@/components/onboarding/TourOverlay";
import { SHIFTS_STEPS } from "@/lib/tours/shifts";

interface Shift {
  id: string;
  name: string;
  code: string;
  expectedStart: string;
  expectedEnd: string;
  breakDurationMinutes: number;
  workingHoursPerDay: number;
  isNightShift: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface ShiftForm {
  name: string;
  code: string;
  expectedStart: string;
  expectedEnd: string;
  breakDurationMinutes: string;
  workingHoursPerDay: string;
  isNightShift: boolean;
  isActive: boolean;
}

const EMPTY: ShiftForm = {
  name: '',
  code: '',
  expectedStart: '08:00',
  expectedEnd: '17:00',
  breakDurationMinutes: '60',
  workingHoursPerDay: '8',
  isNightShift: false,
  isActive: true,
};

const PAGE_SIZE = 10;

// "08:00:00" → "08:00"
const toTimeInput = (t: string) => (t ? t.substring(0, 5) : '');
// "08:00" → "08:00:00"
const toTimeValue = (t: string) => (t ? `${t}:00` : '');

const fmt12 = (t: string) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

// Colour palette for shift avatar (keyed by name hash, like Designations)
const AVATAR_COLORS = [
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
];

const avatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function ShiftsPage() {
  const tour = useTour("admin-page-shifts", SHIFTS_STEPS);
  useRequirePermission(Permissions.MasterData.Shifts.View);
  const canManage = usePermission(Permissions.MasterData.Shifts.Manage);

  const [items, setItems] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [form, setForm] = useState<ShiftForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const initialized = useRef(false);

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "day" | "night">("all");
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<Shift[]>("/Shift");
      setItems(res.data);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load shifts.",
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

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.isActive).length;
    const inactive = total - active;
    const night = items.filter((i) => i.isNightShift).length;
    return { total, active, inactive, night };
  }, [items]);

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
      const matchType =
        typeFilter === "all"
          ? true
          : typeFilter === "night"
            ? i.isNightShift
            : !i.isNightShift;
      return matchSearch && matchStatus && matchType;
    });
  }, [items, search, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (item: Shift) => {
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code,
      expectedStart: toTimeInput(item.expectedStart),
      expectedEnd: toTimeInput(item.expectedEnd),
      breakDurationMinutes: String(item.breakDurationMinutes),
      workingHoursPerDay: String(item.workingHoursPerDay),
      isNightShift: item.isNightShift,
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
    if (!form.expectedStart || !form.expectedEnd) {
      setError("Start and End times are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/Shift/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        expectedStart: toTimeValue(form.expectedStart),
        expectedEnd: toTimeValue(form.expectedEnd),
        breakDurationMinutes: parseInt(form.breakDurationMinutes) || 0,
        workingHoursPerDay: parseFloat(form.workingHoursPerDay) || 8,
        isNightShift: form.isNightShift,
        isActive: form.isActive,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? "Shift updated" : "Shift created", form.name);
    } catch (err: any) {
      showError(
        "Failed to save",
        err?.response?.data?.error ?? "Could not save shift.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Shift) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try {
      await api.post("/Shift/save", { action: "DELETE", id: item.id });
      await load();
      showSuccess("Shift deleted", item.name);
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.error ?? "Could not delete shift.",
      );
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Shifts</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage work shift schedules and their timings.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
            data-tour="shifts-add-button"
          >
            Add Shift
          </Button>
        )}
      </div>

      {/* Stat cards — compact horizontal row, matches Designations */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Total Shifts */}
        <div className="card">
          <div className="card-body py-4 px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Total Shifts
            </p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold heading-text">
                {loading ? "–" : stats.total}
              </span>
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 mb-0.5">
                <Clock size={18} />
              </span>
            </div>
          </div>
        </div>

        {/* Active */}
        <div className="card">
          <div className="card-body py-4 px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Active
            </p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold heading-text">
                {loading ? "–" : stats.active}
              </span>
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 mb-0.5">
                <Sun size={18} />
              </span>
            </div>
          </div>
        </div>

        {/* Inactive */}
        <div className="card">
          <div className="card-body py-4 px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Inactive
            </p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold heading-text">
                {loading ? "–" : stats.inactive}
              </span>
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 mb-0.5">
                <Clock size={18} />
              </span>
            </div>
          </div>
        </div>

        {/* Night Shifts */}
        <div className="card">
          <div className="card-body py-4 px-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              Night Shifts
            </p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold heading-text">
                {loading ? "–" : stats.night}
              </span>
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 mb-0.5">
                <Moon size={18} />
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
            data-tour="shifts-filter-row"
          >
            {/* Search */}
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

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input w-36"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="input w-36"
            >
              <option value="all">All Types</option>
              <option value="day">Day</option>
              <option value="night">Night</option>
            </select>

            <span className="ml-auto text-sm text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {filtered.length} shift{filtered.length !== 1 ? "s" : ""}
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
                data-tour="shifts-table-card"
              >
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Timing</th>
                    <th>Break</th>
                    <th>Working Hours</th>
                    <th>Type</th>
                    <th>Status</th>
                    {canManage && <th className="w-24 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManage ? 8 : 7}
                        className="text-center py-8 text-gray-400"
                      >
                        No shifts found
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item) => {
                      const initials = item.name
                        .split(" ")
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase();
                      const colorClass = avatarColor(item.name);
                      const ShiftIcon = item.isNightShift ? Moon : Sun;

                      return (
                        <tr key={item.id}>
                          {/* Name with avatar */}
                          <td>
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex items-center justify-center w-9 h-9 rounded-lg text-sm font-semibold shrink-0 ${colorClass}`}
                              >
                                <ShiftIcon size={16} />
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

                          {/* Timing */}
                          <td className="tabular-nums text-sm">
                            {fmt12(item.expectedStart)} –{" "}
                            {fmt12(item.expectedEnd)}
                          </td>

                          {/* Break */}
                          <td className="text-sm">
                            {item.breakDurationMinutes} min
                          </td>

                          {/* Working hours */}
                          <td className="text-sm">
                            {Number(item.workingHoursPerDay).toFixed(1)} hrs
                          </td>

                          {/* Type badge */}
                          <td>
                            <span
                              className={`xp-badge ${item.isNightShift ? "xp-badge-info" : "xp-badge-warning"}`}
                            >
                              <span className="inline-flex items-center gap-1">
                                {item.isNightShift ? (
                                  <Moon size={11} />
                                ) : (
                                  <Sun size={11} />
                                )}
                                {item.isNightShift ? "Night" : "Day"}
                              </span>
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
                      );
                    })
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
        <h5 className="h5 mb-4">{editing ? "Edit Shift" : "Add Shift"}</h5>

        <div className="space-y-4">
          {/* Name + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Name <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g. Morning Shift"
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
                placeholder="e.g. MORN"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                maxLength={50}
              />
            </div>
          </div>

          {/* Start + End time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Start Time <span className="text-error">*</span>
              </label>
              <Input
                type="time"
                value={form.expectedStart}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expectedStart: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">
                End Time <span className="text-error">*</span>
              </label>
              <Input
                type="time"
                value={form.expectedEnd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expectedEnd: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Break + Working hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Break Duration (minutes)</label>
              <Input
                type="number"
                min="0"
                placeholder="60"
                value={form.breakDurationMinutes}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    breakDurationMinutes: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="form-label">Working Hours / Day</label>
              <Input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                placeholder="8"
                value={form.workingHoursPerDay}
                onChange={(e) =>
                  setForm((f) => ({ ...f, workingHoursPerDay: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Night Shift</span>
              <Switcher
                checked={form.isNightShift}
                onChange={(val) =>
                  setForm((f) => ({ ...f, isNightShift: val }))
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