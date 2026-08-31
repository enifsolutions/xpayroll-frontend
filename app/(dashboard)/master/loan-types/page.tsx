"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Landmark,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { showSuccess, showError } from "@/lib/toast";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";

interface LoanType {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  interestMethod: "None" | "Flat" | "ReducingBalance";
  defaultInterestRate: number;
  minInterestRate: number | null;
  maxInterestRate: number | null;
  maxAmountType: "Fixed" | "SalaryMultiple";
  maxAmountValue: number;
  maxTenureMonths: number | null;
  minServiceMonths: number;
  maxConcurrentLoans: number;
  maxTotalDeductionPct: number | null;
  guarantorModel: "None" | "Single" | "Multi";
  minGuarantors: number;
  allowInstallmentSkip: boolean;
  shortfallBehavior: "PartialDeductRollForward" | "SkipInstallment";
  isAdvance: boolean;
  countsTowardDesignationCap: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface LoanTypeForm {
  name: string;
  code: string;
  isActive: boolean;
  interestMethod: "None" | "Flat" | "ReducingBalance";
  defaultInterestRate: string;
  minInterestRate: string;
  maxInterestRate: string;
  maxAmountType: "Fixed" | "SalaryMultiple";
  maxAmountValue: string;
  maxTenureMonths: string;
  minServiceMonths: string;
  maxConcurrentLoans: string;
  maxTotalDeductionPct: string;
  guarantorModel: "None" | "Single" | "Multi";
  minGuarantors: string;
  allowInstallmentSkip: boolean;
  shortfallBehavior: "PartialDeductRollForward" | "SkipInstallment";
  isAdvance: boolean;
  countsTowardDesignationCap: boolean;
}

const EMPTY_FORM: LoanTypeForm = {
  name: "",
  code: "",
  isActive: true,
  interestMethod: "None",
  defaultInterestRate: "0",
  minInterestRate: "",
  maxInterestRate: "",
  maxAmountType: "Fixed",
  maxAmountValue: "",
  maxTenureMonths: "",
  minServiceMonths: "0",
  maxConcurrentLoans: "1",
  maxTotalDeductionPct: "",
  guarantorModel: "None",
  minGuarantors: "0",
  allowInstallmentSkip: true,
  shortfallBehavior: "PartialDeductRollForward",
  isAdvance: false,
  countsTowardDesignationCap: true,
};

function interestMethodLabel(m: string) {
  return m === "ReducingBalance" ? "Reducing Balance" : m;
}

export default function LoanTypesPage() {
  useRequirePermission(Permissions.Payroll.LoanType.View);
  const canManage = usePermission(Permissions.Payroll.LoanType.Manage);
  const userId = useAuthStore((s) => s.user?.userId);
  const initialized = useRef(false);

  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LoanTypeForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/loan-types", {
        params: { includeInactive: true },
      });
      setLoanTypes(res.data ?? []);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Failed to load loan types.",
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

  const filtered = useMemo(() => {
    return loanTypes.filter((t) => {
      if (statusFilter === "active" && !t.isActive) return false;
      if (statusFilter === "inactive" && t.isActive) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.name.toLowerCase().includes(q) &&
          !t.code.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [loanTypes, search, statusFilter]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (t: LoanType) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      code: t.code,
      isActive: t.isActive,
      interestMethod: t.interestMethod,
      defaultInterestRate: String(t.defaultInterestRate),
      minInterestRate: t.minInterestRate?.toString() ?? "",
      maxInterestRate: t.maxInterestRate?.toString() ?? "",
      maxAmountType: t.maxAmountType,
      maxAmountValue: String(t.maxAmountValue),
      maxTenureMonths: t.maxTenureMonths?.toString() ?? "",
      minServiceMonths: String(t.minServiceMonths),
      maxConcurrentLoans: String(t.maxConcurrentLoans),
      maxTotalDeductionPct: t.maxTotalDeductionPct?.toString() ?? "",
      guarantorModel: t.guarantorModel,
      minGuarantors: String(t.minGuarantors),
      allowInstallmentSkip: t.allowInstallmentSkip,
      shortfallBehavior: t.shortfallBehavior,
      isAdvance: t.isAdvance,
      countsTowardDesignationCap: t.countsTowardDesignationCap,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError("Name is required");
      return;
    }
    if (!form.code.trim()) {
      setFormError("Code is required");
      return;
    }
    if (!form.maxAmountValue) {
      setFormError("Maximum amount is required");
      return;
    }
    if (!form.maxTenureMonths) {
      setFormError("Maximum tenure is required");
      return;
    }
    if (
      form.guarantorModel === "Multi" &&
      (!form.minGuarantors || Number(form.minGuarantors) < 1)
    ) {
      setFormError(
        "Multi guarantor model requires at least 1 minimum guarantor",
      );
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await api.post("/loan-types/save", {
        action: editingId ? "UPDATE" : "ADD",
        id: editingId ?? null,
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        isActive: form.isActive,
        interestMethod: form.interestMethod,
        defaultInterestRate: Number(form.defaultInterestRate) || 0,
        minInterestRate: form.minInterestRate
          ? Number(form.minInterestRate)
          : null,
        maxInterestRate: form.maxInterestRate
          ? Number(form.maxInterestRate)
          : null,
        maxAmountType: form.maxAmountType,
        maxAmountValue: Number(form.maxAmountValue),
        maxTenureMonths: Number(form.maxTenureMonths),
        minServiceMonths: Number(form.minServiceMonths) || 0,
        maxConcurrentLoans: Number(form.maxConcurrentLoans) || 1,
        maxTotalDeductionPct: form.maxTotalDeductionPct
          ? Number(form.maxTotalDeductionPct)
          : null,
        guarantorModel: form.guarantorModel,
        minGuarantors:
          form.guarantorModel === "Multi" ? Number(form.minGuarantors) : 0,
        allowInstallmentSkip: form.allowInstallmentSkip,
        shortfallBehavior: form.shortfallBehavior,
        isAdvance: form.isAdvance,
        countsTowardDesignationCap: form.countsTowardDesignationCap,
        userId,
      });
      setDialogOpen(false);
      showSuccess(editingId ? "Loan type updated" : "Loan type added");
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.error;
      setFormError(
        msg ??
          (e?.response?.status === 409
            ? "A loan type with this code already exists"
            : "Failed to save"),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.post("/loan-types/save", {
        action: "DELETE",
        id: deleteId,
        userId,
      });
      setDeleteId(null);
      showSuccess("Loan type deleted");
      await load();
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.error ??
          "This loan type may still be in active use.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Loan Types
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Configure the loan and advance types available to employees
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            size="sm"
            onClick={openAdd}
            icon={<Plus size={15} />}
          >
            Add Loan Type
          </Button>
        )}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <div className="relative flex-1 max-w-xs">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                placeholder="Search by name or code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full"
              />
            </div>

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

            <button
              onClick={load}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            <span className="text-sm text-gray-400 ml-auto whitespace-nowrap">
              {filtered.length} loan type{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Landmark size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No loan types found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Interest</th>
                    <th>Max Amount</th>
                    <th>Max Tenure</th>
                    <th>Guarantor</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {t.name}
                        </p>
                        {t.isAdvance && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">
                            Advance — single installment
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">
                          {t.code}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-300">
                        {interestMethodLabel(t.interestMethod)}
                        {t.interestMethod !== "None" && (
                          <span className="text-gray-400">
                            {" "}
                            · {t.defaultInterestRate}%
                          </span>
                        )}
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-300">
                        {t.maxAmountType === "Fixed"
                          ? `Rs. ${t.maxAmountValue.toLocaleString()}`
                          : `${t.maxAmountValue}× salary`}
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-300">
                        {t.maxTenureMonths ? `${t.maxTenureMonths} mo` : "—"}
                      </td>
                      <td>
                        {t.guarantorModel === "None" ? (
                          <span className="text-xs text-gray-400">None</span>
                        ) : (
                          <span className="xp-badge xp-badge-info">
                            {t.guarantorModel}
                            {t.guarantorModel === "Multi"
                              ? ` (min ${t.minGuarantors})`
                              : ""}
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${t.isActive ? "xp-badge-success" : "xp-badge-neutral"}`}
                        >
                          {t.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {canManage && (
                            <button
                              onClick={() => openEdit(t)}
                              className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {canManage && (
                            <button
                              onClick={() => setDeleteId(t.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        width={680}
      >
        <div className="mb-5">
          <h5 className="font-semibold text-gray-900 dark:text-white">
            {editingId ? "Edit Loan Type" : "Add Loan Type"}
          </h5>
        </div>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Staff Loan"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">
                Code <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. STAFF"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <span className="form-label mb-0">Salary Advance</span>
              <p className="text-xs text-gray-400">
                Single-installment, recovered next payroll — no amortization
                schedule
              </p>
            </div>
            <Switcher
              checked={form.isAdvance}
              onChange={(v) => setForm((f) => ({ ...f, isAdvance: v }))}
            />
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Interest
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Method</label>
                <select
                  className="input w-full"
                  value={form.interestMethod}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      interestMethod: e.target
                        .value as LoanTypeForm["interestMethod"],
                    }))
                  }
                >
                  <option value="None">None</option>
                  <option value="Flat">Flat</option>
                  <option value="ReducingBalance">Reducing Balance</option>
                </select>
              </div>
              <div>
                <label className="form-label">Default Rate (%)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.defaultInterestRate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      defaultInterestRate: e.target.value,
                    }))
                  }
                  disabled={form.interestMethod === "None"}
                />
              </div>
              <div>
                <label className="form-label">Allowed Range (%)</label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Min"
                    value={form.minInterestRate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        minInterestRate: e.target.value,
                      }))
                    }
                    disabled={form.interestMethod === "None"}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Max"
                    value={form.maxInterestRate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        maxInterestRate: e.target.value,
                      }))
                    }
                    disabled={form.interestMethod === "None"}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Amount &amp; Tenure
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Amount Ceiling Type</label>
                <select
                  className="input w-full"
                  value={form.maxAmountType}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxAmountType: e.target
                        .value as LoanTypeForm["maxAmountType"],
                    }))
                  }
                >
                  <option value="Fixed">Fixed amount</option>
                  <option value="SalaryMultiple">Multiple of salary</option>
                </select>
              </div>
              <div>
                <label className="form-label">
                  {form.maxAmountType === "Fixed"
                    ? "Max Amount (Rs.)"
                    : "Max Multiple (×)"}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step={form.maxAmountType === "Fixed" ? "1" : "0.1"}
                  value={form.maxAmountValue}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxAmountValue: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="form-label">
                  Max Tenure (months) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={form.maxTenureMonths}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxTenureMonths: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="form-label">Min Service (months)</label>
                <Input
                  type="number"
                  value={form.minServiceMonths}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minServiceMonths: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="form-label">Max Concurrent Loans</label>
                <Input
                  type="number"
                  value={form.maxConcurrentLoans}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxConcurrentLoans: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="form-label">DSR Override (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Company default"
                  value={form.maxTotalDeductionPct}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxTotalDeductionPct: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-gray-400 mt-1">
                  Optional — only tightens the company-wide DSR limit, never
                  loosens it.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 mt-4">
              <div>
                <span className="form-label mb-0">
                  Counts toward designation loan cap
                </span>
                <p className="text-xs text-gray-400">
                  Off for loans like ETF-secured advances that shouldn't be
                  limited by an employee's designation-level combined cap — only
                  DSR eligibility still applies.
                </p>
              </div>
              <Switcher
                checked={form.countsTowardDesignationCap}
                onChange={(v) =>
                  setForm((f) => ({ ...f, countsTowardDesignationCap: v }))
                }
              />
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
              Guarantor &amp; Recovery
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Guarantor Model</label>
                <select
                  className="input w-full"
                  value={form.guarantorModel}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      guarantorModel: e.target
                        .value as LoanTypeForm["guarantorModel"],
                    }))
                  }
                >
                  <option value="None">None</option>
                  <option value="Single">Single</option>
                  <option value="Multi">Multiple</option>
                </select>
              </div>
              {form.guarantorModel === "Multi" && (
                <div>
                  <label className="form-label">
                    Minimum Guarantors <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={form.minGuarantors}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, minGuarantors: e.target.value }))
                    }
                  />
                </div>
              )}
              <div>
                <label className="form-label">
                  If a deduction can't be fully collected
                </label>
                <select
                  className="input w-full"
                  value={form.shortfallBehavior}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      shortfallBehavior: e.target
                        .value as LoanTypeForm["shortfallBehavior"],
                    }))
                  }
                >
                  <option value="PartialDeductRollForward">
                    Deduct what's available, roll the rest forward
                  </option>
                  <option value="SkipInstallment">
                    Skip the whole installment, defer it to the end
                  </option>
                </select>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="form-label mb-0">
                  Allow Skipping Installments
                </span>
                <Switcher
                  checked={form.allowInstallmentSkip}
                  onChange={(v) =>
                    setForm((f) => ({ ...f, allowInstallmentSkip: v }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-gray-100 dark:border-gray-800 pt-4">
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
              {editingId ? "Save Changes" : "Add Loan Type"}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        variant="danger"
        title="Delete Loan Type"
        message="This action cannot be undone. Deletion is blocked while any loan of this type is still pending, approved, active, or on hold."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
