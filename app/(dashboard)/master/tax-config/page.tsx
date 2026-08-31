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
  FileText,
  CheckCircle2,
  CalendarClock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import TaxYearReadinessBanner from "@/components/master/TaxYearReadinessBanner";
import { getErrorMessage } from "@/lib/apiError";
import { useTour } from "@/hooks/useTour";
import TourOverlay from "@/components/onboarding/TourOverlay";
import { TAX_CONFIG_STEPS } from "@/lib/tours/tax-config";

interface TaxConfig {
  id: string;
  name: string;
  taxYear: number;
  regime: string;
  isActive: boolean;
  createdAt: string;
}

interface TaxConfigForm {
  name: string;
  taxYear: string;
  regime: string;
  isActive: boolean;
}

const EMPTY: TaxConfigForm = {
  name: '',
  taxYear: String(new Date().getFullYear()),
  regime: 'PAYE',
  isActive: true,
};

const REGIMES = ['PAYE', 'APIT', 'WHT', 'Other'];

const REGIME_BADGE: Record<string, string> = {
  PAYE: "xp-badge xp-badge-primary",
  APIT: "xp-badge xp-badge-info",
  WHT: "xp-badge xp-badge-warning",
  Other: "xp-badge xp-badge-neutral",
};

const PAGE_SIZE = 10;

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  iconBg,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="card">
      <div className="card-body flex items-start gap-4">
        <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">
            {label}
          </p>
          <p className="text-2xl font-bold heading-text">{value}</p>
          {sub && <div className="mt-1">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function TaxConfigPage() {
   const tour = useTour("admin-page-tax-config", TAX_CONFIG_STEPS);
  useRequirePermission(Permissions.MasterData.TaxConfig.View);
  const canManage = usePermission(Permissions.MasterData.TaxConfig.Manage);

  const [items, setItems] = useState<TaxConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaxConfig | null>(null);
  const [form, setForm] = useState<TaxConfigForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRegime, setFilterRegime] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const initialized = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<TaxConfig[]>("/tax-configs");
      setItems(res.data);
    } catch (err: any) {
      showError(
        "Load failed",
        getErrorMessage(err, "Could not load tax configurations."),
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

  // ── Derived stats ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.isActive).length;
    const years = new Set(items.map((i) => i.taxYear)).size;
    const regimes = new Set(items.map((i) => i.regime)).size;
    return { total, active, years, regimes };
  }, [items]);

  // ── Filtered + paginated ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) => {
      const matchSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        String(i.taxYear).includes(q) ||
        i.regime.toLowerCase().includes(q);
      const matchRegime = !filterRegime || i.regime === filterRegime;
      const matchStatus =
        !filterStatus || (filterStatus === "active" ? i.isActive : !i.isActive);
      return matchSearch && matchRegime && matchStatus;
    });
  }, [items, search, filterRegime, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // reset to page 1 on filter change
  useEffect(() => {
    setPage(1);
  }, [search, filterRegime, filterStatus]);

  // ── Dialog helpers ─────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (item: TaxConfig) => {
    setEditing(item);
    setForm({
      name: item.name,
      taxYear: String(item.taxYear),
      regime: item.regime,
      isActive: item.isActive,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.taxYear) {
      setError("Tax year is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/tax-configs/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        name: form.name.trim(),
        taxYear: parseInt(form.taxYear),
        regime: form.regime,
        isActive: form.isActive,
      });
      setDialogOpen(false);
      await load();
      showSuccess(
        editing ? "Tax config updated" : "Tax config created",
        form.name,
      );
    } catch (err: any) {
      showError(
        "Failed to save",
        getErrorMessage(err, "Could not save tax config."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: TaxConfig) => {
    if (!confirm(`Delete tax config "${item.name}"?`)) return;
    try {
      await api.post("/tax-configs/save", { action: "DELETE", id: item.id });
      await load();
      showSuccess("Tax config deleted", item.name);
    } catch (err: any) {
      showError("Delete failed", getErrorMessage(err, "Could not delete."));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Tax Configuration</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage PAYE and other tax regime configurations by year. Tax slabs
            are managed within each specific configuration set.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
            data-tour="tax-config-add-button"
          >
            Add Config
          </Button>
        )}
      </div>

      <TaxYearReadinessBanner />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<FileText size={20} className="text-violet-600" />}
          iconBg="bg-violet-100 dark:bg-violet-900/30"
          label="Total Tax Regimes"
          value={stats.total}
          sub={
            <span className="text-xs text-violet-600 font-medium">
              {stats.regimes} regime type{stats.regimes !== 1 ? "s" : ""}
            </span>
          }
        />
        <StatCard
          icon={<CheckCircle2 size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          label="Active Configurations"
          value={stats.active.toString().padStart(2, "0")}
          sub={
            stats.total > 0 ? (
              <span className="text-xs text-emerald-600 font-medium">
                {Math.round((stats.active / stats.total) * 100)}% active
              </span>
            ) : undefined
          }
        />
        <StatCard
          icon={<CalendarClock size={20} className="text-amber-600" />}
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          label="Tax Years Covered"
          value={stats.years}
          sub={
            <span className="text-xs text-amber-600 font-medium">
              Across all regimes
            </span>
          }
        />
        <StatCard
          icon={<ShieldCheck size={20} className="text-blue-600" />}
          iconBg="bg-blue-100 dark:bg-blue-900/30"
          label="Inactive Configs"
          value={stats.total - stats.active}
          sub={
            <span className="text-xs text-gray-500 font-medium">
              Archived / disabled
            </span>
          }
        />
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-body">
          {/* Search & filters */}
          <div
            className="flex flex-col sm:flex-row gap-3 mb-5"
            data-tour="tax-config-filter-row"
          >
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                className="input w-full pl-9"
                placeholder="Search by name, year or regime…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-full sm:w-40"
              value={filterRegime}
              onChange={(e) => setFilterRegime(e.target.value)}
            >
              <option value="">All Regimes</option>
              {REGIMES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              className="input w-full sm:w-36"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <table
                className="table-default table-hover w-full"
                data-tour="tax-config-table-card"
              >
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Tax Year</th>
                    <th>Regime</th>
                    <th>Status</th>
                    <th>Created</th>
                    {canManage && <th className="w-24 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canManage ? 6 : 5}
                        className="text-center py-10 text-gray-400"
                      >
                        {search || filterRegime || filterStatus
                          ? "No results match your filters."
                          : "No tax configurations found."}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                              <FileText size={13} className="text-violet-600" />
                            </div>
                            <span className="font-medium heading-text">
                              {item.name}
                            </span>
                          </div>
                        </td>
                        <td className="font-semibold text-primary">
                          {item.taxYear}
                        </td>
                        <td>
                          <span
                            className={
                              REGIME_BADGE[item.regime] ??
                              "xp-badge xp-badge-neutral"
                            }
                          >
                            {item.regime}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`xp-badge ${item.isActive ? "xp-badge-success" : "xp-badge-danger"}`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="text-gray-500 text-sm">
                          {new Date(item.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            },
                          )}
                        </td>
                        {canManage && (
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => openEdit(item)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/30 transition-colors"
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
              {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-sm text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length} entries
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            p === page
                              ? "bg-primary text-white"
                              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <h5 className="h5 mb-4">
          {editing ? "Edit Tax Config" : "Add Tax Config"}
        </h5>

        <div className="space-y-4">
          <div>
            <label className="form-label">
              Name <span className="text-error">*</span>
            </label>
            <Input
              placeholder="e.g. PAYE 2025/2026"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Tax Year <span className="text-error">*</span>
              </label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={form.taxYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, taxYear: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Regime</label>
              <select
                className="input w-full"
                value={form.regime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, regime: e.target.value }))
                }
              >
                {REGIMES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Active</span>
            <Switcher
              checked={form.isActive}
              onChange={(val) => setForm((f) => ({ ...f, isActive: val }))}
            />
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