'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/axios";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { showSuccess, showError } from "@/lib/toast";
import { getErrorMessage } from "@/lib/apiError";
import {
  PlusIcon, Pencil, Trash2, Search, CalendarDays, CheckCircle2, XCircle, Lock, Star,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import {
  DAY_NAMES_SUN_FIRST, DAY_SHORT_SUN_FIRST, DISPLAY_ORDER,
  defaultFractions, normalizeFractions, summariseWeek, weekTotal,
} from "@/lib/workPattern";

interface WorkPattern {
  id: string;
  code: string;
  name: string;
  dayFractions: number[];          // Sunday-first
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  shiftCount: number;
  assignmentCount: number;
  isInUse: boolean;
  isFractionsLocked: boolean;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface PatternForm {
  name: string;
  code: string;
  description: string;
  dayFractions: number[];          // Sunday-first
  isDefault: boolean;
  isActive: boolean;
}

const EMPTY: PatternForm = {
  name: "", code: "", description: "",
  dayFractions: defaultFractions(), isDefault: false, isActive: true,
};

const PAGE_SIZE = 10;
const OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "Full" },
  { value: 0.5, label: "Half" },
  { value: 0, label: "Off" },
];

const chipCls = (v: number) =>
  v === 1
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
    : v === 0.5
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500";

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "";

export default function WorkPatternsPage() {
  useRequirePermission(Permissions.Settings.WorkPattern.View);
  const canManage = usePermission(Permissions.Settings.WorkPattern.Manage);

  const [items, setItems] = useState<WorkPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkPattern | null>(null);
  const [form, setForm] = useState<PatternForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const initialized = useRef(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkPattern | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<WorkPattern[]>("/work-patterns");
      setItems(res.data.map((p) => ({ ...p, dayFractions: normalizeFractions(p.dayFractions) })));
    } catch (err) {
      showError("Load failed", getErrorMessage(err, "Could not load work patterns."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.isActive).length;
    return { total, active, inactive: total - active, inUse: items.filter((i) => i.isInUse).length };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) => {
      const matchSearch = !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" ? true : statusFilter === "active" ? i.isActive : !i.isActive;
      return matchSearch && matchStatus;
    });
  }, [items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY, dayFractions: defaultFractions() });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (p: WorkPattern) => {
    setEditing(p);
    setForm({
      name: p.name, code: p.code, description: p.description ?? "",
      dayFractions: [...p.dayFractions], isDefault: p.isDefault, isActive: p.isActive,
    });
    setError("");
    setDialogOpen(true);
  };

  const setDay = (sunFirstIdx: number, value: number) =>
    setForm((f) => {
      const next = [...f.dayFractions];
      next[sunFirstIdx] = value;
      return { ...f, dayFractions: next };
    });

  const fractionsLocked = !!editing?.isFractionsLocked;

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setError("Name and Code are required.");
      return;
    }
    if (!fractionsLocked && weekTotal(form.dayFractions) === 0) {
      setError("A pattern needs at least one working day.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/work-patterns/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        // null on UPDATE = "unchanged" (server contract); also used while locked
        dayFractions: fractionsLocked ? null : form.dayFractions,
        description: form.description.trim(),
        isDefault: form.isDefault,
        isActive: form.isActive,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? "Work pattern updated" : "Work pattern created", form.name);
    } catch (err) {
      showError("Failed to save", getErrorMessage(err, "Could not save work pattern."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.post("/work-patterns/save", { action: "DELETE", id: deleteTarget.id });
      setConfirmOpen(false);
      const name = deleteTarget.name;
      setDeleteTarget(null);
      await load();
      showSuccess("Work pattern deleted", name);
    } catch (err) {
      showError("Delete failed", getErrorMessage(err, "Could not delete work pattern."));
    } finally {
      setDeleting(false);
    }
  };

  const StatCard = ({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) => (
    <div className="card">
      <div className="card-body py-4 px-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{label}</p>
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold heading-text">{loading ? "–" : value}</span>
          <span className={`flex items-center justify-center w-9 h-9 rounded-lg mb-0.5 ${tone}`}>{icon}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Work Patterns</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Define which weekdays are worked in full, in half, or not at all. Shifts and employees point at a pattern.
          </p>
        </div>
        {canManage && (
          <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
            Add Work Pattern
          </Button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Patterns" value={stats.total} icon={<CalendarDays size={18} />} tone="bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300" />
        <StatCard label="Active" value={stats.active} icon={<CheckCircle2 size={18} />} tone="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300" />
        <StatCard label="Inactive" value={stats.inactive} icon={<XCircle size={18} />} tone="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" />
        <StatCard label="In Use" value={stats.inUse} icon={<Lock size={18} />} tone="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300" />
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="input w-36"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <span className="ml-auto text-sm text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {filtered.length} pattern{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Week</th>
                    <th>Used By</th>
                    <th>Status</th>
                    {canManage && <th className="w-24 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 6 : 5} className="text-center py-8 text-gray-400">
                        No work patterns found
                      </td>
                    </tr>
                  ) : (
                    paginated.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-medium heading-text">{p.name}</span>
                            {p.isDefault && (
                              <span className="xp-badge xp-badge-info">
                                <span className="inline-flex items-center gap-1"><Star size={11} /> Default</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{p.code}</code>
                        </td>
                        <td>
                          <div className="flex gap-1 mb-1">
                            {DISPLAY_ORDER.map((i) => (
                              <span
                                key={i}
                                title={`${DAY_NAMES_SUN_FIRST[i]}: ${p.dayFractions[i]}`}
                                className={`w-8 text-center text-[11px] font-semibold rounded py-0.5 ${chipCls(p.dayFractions[i])}`}
                              >
                                {DAY_SHORT_SUN_FIRST[i].slice(0, 2)}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{summariseWeek(p.dayFractions)}</span>
                        </td>
                        <td className="text-sm">
                          {p.shiftCount} shift{p.shiftCount !== 1 ? "s" : ""}, {p.assignmentCount} override{p.assignmentCount !== 1 ? "s" : ""}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className={`xp-badge ${p.isActive ? "xp-badge-success" : "xp-badge-danger"}`}>
                              {p.isActive ? "Active" : "Inactive"}
                            </span>
                            {p.isFractionsLocked && (
                              <span
                                className="text-gray-400"
                                title={`Weekdays locked until ${fmtDate(p.lockedUntil)} (payroll already run this financial year)`}
                              >
                                <Lock size={13} />
                              </span>
                            )}
                          </div>
                        </td>
                        {canManage && (
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEdit(p)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-violet-50 hover:text-primary dark:hover:bg-violet-900/20 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => { setDeleteTarget(p); setConfirmOpen(true); }}
                                disabled={p.isDefault || p.isInUse}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                title={p.isDefault ? "The default pattern cannot be deleted" : p.isInUse ? "In use — cannot delete" : "Delete"}
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

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((n) => Math.max(1, n - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          n === page ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
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

      <Dialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} onRequestClose={() => setDialogOpen(false)}>
        <h5 className="h5 mb-4">{editing ? "Edit Work Pattern" : "Add Work Pattern"}</h5>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Name <span className="text-error">*</span></label>
              <Input
                placeholder="e.g. Monday to Saturday (Half)"
                value={form.name}
                maxLength={255}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="form-label">Code <span className="text-error">*</span></label>
              <Input
                placeholder="e.g. MON_SAT_HALF"
                value={form.code}
                maxLength={50}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <Input
              placeholder="Optional"
              value={form.description}
              maxLength={500}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label">Working week</label>
            {fractionsLocked && (
              <div className="flex items-start gap-2 text-sm rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-3 py-2 mb-2">
                <Lock size={14} className="mt-0.5 shrink-0" />
                <span>
                  This pattern is in use and payroll has already run this financial year, so its weekdays are locked
                  {editing?.lockedUntil ? ` until ${fmtDate(editing.lockedUntil)}` : ""}. To change the week, create a new
                  pattern and assign it.
                </span>
              </div>
            )}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {DISPLAY_ORDER.map((i) => (
                <div key={i} className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-sm font-medium w-28">{DAY_NAMES_SUN_FIRST[i]}</span>
                  <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                    {OPTIONS.map((o) => {
                      const selected = form.dayFractions[i] === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          disabled={fractionsLocked}
                          onClick={() => setDay(i, o.value)}
                          className={`px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
                            selected
                              ? "bg-primary text-white"
                              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:hover:bg-transparent"
                          } ${fractionsLocked && !selected ? "opacity-50" : ""}`}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
              <span className="font-medium">{summariseWeek(form.dayFractions)}</span>
              <span className="text-gray-400"> · {weekTotal(form.dayFractions)} paid days / week</span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Default pattern</span>
              <Switcher
                checked={form.isDefault}
                onChange={(val: boolean) => {
                  // the current default can only be changed by promoting another pattern
                  if (editing?.isDefault) return;
                  setForm((f) => ({ ...f, isDefault: val }));
                }}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Active</span>
              <Switcher
                checked={form.isActive}
                onChange={(val: boolean) => {
                  if (editing?.isDefault) return;
                  setForm((f) => ({ ...f, isActive: val }));
                }}
              />
            </div>
          </div>
          {editing?.isDefault && (
            <p className="text-xs text-gray-400">
              This is the default pattern. To change the default, set another pattern as default.
            </p>
          )}

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title="Delete Work Pattern"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ""}
        confirmLabel="Yes, Delete"
        cancelLabel="Keep It"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }}
      />
    </div>
  );
}
