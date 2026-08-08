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
  Download,
  Printer,
  TrendingUp,
  Calendar,
  Percent,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import { getErrorMessage } from "@/lib/apiError";

interface StatutoryRate {
  id: string;
  scheme: string;
  effectiveYear: number;
  effectiveMonth: number;
  employeeRate: number;
  employerRate: number;
  maxWageCeiling: number | null;
  isActive: boolean;
}

interface StatutoryRateForm {
  scheme: string;
  effectiveYear: string;
  effectiveMonth: string;
  employeeRate: string;
  employerRate: string;
  maxWageCeiling: string;
  isActive: boolean;
}

const EMPTY: StatutoryRateForm = {
  scheme: 'EPF',
  effectiveYear: String(new Date().getFullYear()),
  effectiveMonth: '1',
  employeeRate: '0',
  employerRate: '0',
  maxWageCeiling: '',
  isActive: true,
};

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const SCHEMES = ['EPF', 'ETF', 'PAYE', 'APIT', 'SocialSecurity', 'Other'];

const SCHEME_COLOURS: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  EPF: {
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-300",
    label: "Employee Provident Fund",
  },
  ETF: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
    label: "Employee Trust Fund",
  },
  PAYE: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-300",
    label: "Income Tax (PAYE)",
  },
  APIT: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
    label: "APIT Withholding",
  },
  SocialSecurity: {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-700 dark:text-teal-300",
    label: "Social Security",
  },
  Other: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-600 dark:text-gray-400",
    label: "Other",
  },
};

const SCHEME_LABELS: Record<string, string> = {
  EPF: "Employee Provident Fund",
  ETF: "Employee Trust Fund",
  PAYE: "Income Tax (PAYE)",
  APIT: "APIT Withholding",
  SocialSecurity: "Social Security",
};

const PAGE_SIZE = 10;

function SchemeAvatar({ scheme }: { scheme: string }) {
  const c = SCHEME_COLOURS[scheme] ?? SCHEME_COLOURS["Other"];
  const abbr = scheme.length <= 4 ? scheme : scheme.slice(0, 3).toUpperCase();
  return (
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${c.bg} ${c.text}`}
    >
      {abbr}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card flex-1 min-w-0">
      <div className="card-body">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold heading-text leading-tight">
              {value}
            </p>
            {sub && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {sub}
              </p>
            )}
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent ?? "bg-violet-100 dark:bg-violet-900/30"}`}
          >
            <Icon
              size={18}
              className={
                accent ? "text-white" : "text-violet-600 dark:text-violet-400"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatutoryRatesPage() {
  useRequirePermission(Permissions.MasterData.StatutoryRates.View);
  const canManage = usePermission(Permissions.MasterData.StatutoryRates.Manage);

  const [items, setItems] = useState<StatutoryRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StatutoryRate | null>(null);
  const [form, setForm] = useState<StatutoryRateForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [schemeFilter, setSchemeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const initialized = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<StatutoryRate[]>("/statutory-rates");
      setItems(res.data);
    } catch (err: any) {
      showError(
        "Load failed",
        getErrorMessage(err, "Could not load statutory rates."),
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

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = items.filter((i) => i.isActive);
    const years = items.map((i) => i.effectiveYear);
    const latestYear = years.length
      ? Math.max(...years)
      : new Date().getFullYear();
    const avgEmpRate = active.length
      ? active.reduce((s, i) => s + i.employeeRate, 0) / active.length
      : 0;
    const nextJan = new Date(latestYear + 1, 0, 1);
    const daysRemaining = Math.round(
      (nextJan.getTime() - Date.now()) / 86400000,
    );
    return {
      activeCount: active.length,
      latestYear,
      avgEmpRate,
      daysRemaining,
    };
  }, [items]);

  // ── Derived schemes list for dropdown ─────────────────────────────────────
  const schemes = useMemo(
    () => [...new Set(items.map((i) => i.scheme))].sort(),
    [items],
  );

  // ── Filtered + paginated ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const matchSearch =
        !q ||
        i.scheme.toLowerCase().includes(q) ||
        (SCHEME_LABELS[i.scheme] ?? "").toLowerCase().includes(q) ||
        String(i.effectiveYear).includes(q);
      const matchScheme = !schemeFilter || i.scheme === schemeFilter;
      const matchStatus =
        !statusFilter ||
        (statusFilter === "active" && i.isActive) ||
        (statusFilter === "inactive" && !i.isActive);
      return matchSearch && matchScheme && matchStatus;
    });
  }, [items, search, schemeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // reset to page 1 when filters change
  const applySearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const applyScheme = (v: string) => {
    setSchemeFilter(v);
    setPage(1);
  };
  const applyStatus = (v: string) => {
    setStatusFilter(v);
    setPage(1);
  };

  // ── Dialog helpers ────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (item: StatutoryRate) => {
    setEditing(item);
    setForm({
      scheme: item.scheme,
      effectiveYear: String(item.effectiveYear),
      effectiveMonth: String(item.effectiveMonth),
      employeeRate: String(item.employeeRate),
      employerRate: String(item.employerRate),
      maxWageCeiling:
        item.maxWageCeiling != null ? String(item.maxWageCeiling) : "",
      isActive: item.isActive,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.scheme.trim()) {
      setError("Scheme is required.");
      return;
    }
    if (!form.effectiveYear) {
      setError("Effective year is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/statutory-rates/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        scheme: form.scheme,
        effectiveYear: parseInt(form.effectiveYear),
        effectiveMonth: parseInt(form.effectiveMonth) || 1,
        employeeRate: parseFloat(form.employeeRate) || 0,
        employerRate: parseFloat(form.employerRate) || 0,
        maxWageCeiling: form.maxWageCeiling
          ? parseFloat(form.maxWageCeiling)
          : null,
        isActive: form.isActive,
      });
      setDialogOpen(false);
      await load();
      showSuccess(
        editing ? "Rate updated" : "Rate added",
        `${form.scheme} ${form.effectiveYear}`,
      );
    } catch (err: any) {
      showError(
        "Failed to save",
        err?.response?.data?.error ?? "Could not save statutory rate.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: StatutoryRate) => {
    if (
      !confirm(
        `Delete "${item.scheme}" rate for ${item.effectiveYear}/${MONTHS[item.effectiveMonth - 1]}?`,
      )
    )
      return;
    try {
      await api.post("/statutory-rates/save", {
        action: "DELETE",
        id: item.id,
      });
      await load();
      showSuccess("Rate deleted", `${item.scheme} ${item.effectiveYear}`);
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.error ?? "Could not delete rate.",
      );
    }
  };

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h3 className="h3">Statutory Rates</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage EPF, ETF, PAYE and other statutory contribution rates by year
            and scheme to ensure payroll compliance.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
            className="shrink-0"
          >
            Add Rate
          </Button>
        )}
      </div>

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="flex gap-4 mb-6">
        <StatCard
          icon={TrendingUp}
          label="Total Active Schemes"
          value={String(stats.activeCount)}
          sub="Updated 2 hours ago"
          accent="bg-violet-600"
        />
        <StatCard
          icon={Calendar}
          label="Latest Effective Year"
          value={String(stats.latestYear)}
          sub="Covers next fiscal cycle"
        />
        <StatCard
          icon={Percent}
          label="Avg. Employee Rate"
          value={`${stats.avgEmpRate.toFixed(1)}%`}
          sub="Across active schemes"
        />
        <StatCard
          icon={Clock}
          label="Next Revision Date"
          value="Jan 01"
          sub={`${stats.daysRemaining} days remaining`}
        />
      </div>

      {/* ── Rate table card ───────────────────────────────────────────────── */}
      <div className="card">
        <div className="card-body">
          {/* Sub-header row: title + export icons */}
          <div className="flex items-center justify-between mb-4">
            <h6 className="font-semibold heading-text">Rate Tables</h6>
            <div className="flex items-center gap-2">
              <button
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 transition-colors"
                title="Export"
              >
                <Download size={16} />
              </button>
              <button
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 transition-colors"
                title="Print"
              >
                <Printer size={16} />
              </button>
            </div>
          </div>

          {/* ── Filter row ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-4">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                className="input pl-9 w-full"
                placeholder="Search scheme or year..."
                value={search}
                onChange={(e) => applySearch(e.target.value)}
              />
            </div>

            {/* Scheme dropdown */}
            <select
              className="input"
              value={schemeFilter}
              onChange={(e) => applyScheme(e.target.value)}
            >
              <option value="">All Schemes</option>
              {schemes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Status dropdown */}
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => applyStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Result count pushed right */}
            <span className="ml-auto text-sm text-gray-400 whitespace-nowrap">
              {filtered.length} {filtered.length === 1 ? "rate" : "rates"}
            </span>
          </div>

          {/* ── Table ─────────────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Scheme Name</th>
                  <th>Year</th>
                  <th>Month</th>
                  <th>Employee Rate</th>
                  <th>Employer Rate</th>
                  <th>Wage Ceiling</th>
                  <th>Status</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      No statutory rates found
                    </td>
                  </tr>
                ) : (
                  paginated.map((item) => {
                    const c =
                      SCHEME_COLOURS[item.scheme] ?? SCHEME_COLOURS["Other"];
                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <SchemeAvatar scheme={item.scheme} />
                            <div className="min-w-0">
                              <p className="font-semibold heading-text leading-tight">
                                {SCHEME_LABELS[item.scheme] ?? item.scheme}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                {c.label}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="font-semibold heading-text">
                          {item.effectiveYear}
                        </td>

                        <td className="text-gray-500 dark:text-gray-400">
                          {item.effectiveMonth === 0
                            ? "Annual"
                            : MONTHS[item.effectiveMonth - 1]}
                        </td>

                        <td>
                          <span className={`font-semibold ${c.text}`}>
                            {item.employeeRate === 0
                              ? "Variable"
                              : `${item.employeeRate.toFixed(2)}%`}
                          </span>
                        </td>

                        <td>
                          <span className={`font-semibold ${c.text}`}>
                            {`${item.employerRate.toFixed(2)}%`}
                          </span>
                        </td>

                        <td className="text-gray-500 dark:text-gray-400">
                          {item.maxWageCeiling != null ? (
                            <span>
                              {item.maxWageCeiling.toLocaleString()}
                              <span className="text-xs text-gray-400 block">
                                Currency: LKR
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400">No Ceiling</span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`xp-badge ${item.isActive ? "xp-badge-success" : "xp-badge-neutral"}`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {canManage && (
                              <>
                                <button
                                  onClick={() => openEdit(item)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20 dark:hover:text-violet-400 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}

          {/* ── Pagination ────────────────────────────────────────────────── */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
                {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length} rates
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (n) =>
                      n === 1 || n === totalPages || Math.abs(n - page) <= 1,
                  )
                  .reduce<(number | "...")[]>((acc, n, idx, arr) => {
                    if (idx > 0 && (n as number) - (arr[idx - 1] as number) > 1)
                      acc.push("...");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, idx) =>
                    n === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-1 text-gray-400 text-sm"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                          page === n
                            ? "bg-primary text-white"
                            : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {n}
                      </button>
                    ),
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <h5 className="h5 mb-4">
          {editing ? "Edit Statutory Rate" : "Add Statutory Rate"}
        </h5>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Scheme <span className="text-error">*</span>
              </label>
              <select
                className="input w-full"
                value={form.scheme}
                onChange={(e) =>
                  setForm((f) => ({ ...f, scheme: e.target.value }))
                }
              >
                {SCHEMES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">
                Effective Year <span className="text-error">*</span>
              </label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={form.effectiveYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effectiveYear: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className="form-label">Effective Month</label>
            <select
              className="input w-full"
              value={form.effectiveMonth}
              onChange={(e) =>
                setForm((f) => ({ ...f, effectiveMonth: e.target.value }))
              }
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Employee Rate (%)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.employeeRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, employeeRate: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Employer Rate (%)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.employerRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, employerRate: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Max Wage Ceiling{" "}
              <span className="text-xs text-gray-400">
                (optional — leave blank for no ceiling)
              </span>
            </label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 250000"
              value={form.maxWageCeiling}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxWageCeiling: e.target.value }))
              }
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium heading-text">Active</span>
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
            {editing ? "Update" : "Add Rate"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}