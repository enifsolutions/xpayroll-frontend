"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { CheckCircle2, XCircle, Plus, X } from "lucide-react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { showError, showSuccess } from "@/lib/toast";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import EmployeeSearchSelect from "./EmployeeSearchSelect";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}

interface LoanType {
  id: string;
  name: string;
  interestMethod: "None" | "Flat" | "ReducingBalance";
  defaultInterestRate: number;
  minInterestRate: number | null;
  maxInterestRate: number | null;
  maxAmountType: "Fixed" | "SalaryMultiple";
  maxAmountValue: number;
  maxTenureMonths: number | null;
  guarantorModel: "None" | "Single" | "Multi";
  minGuarantors: number;
  isAdvance: boolean;
}

interface Eligibility {
  isEligible: boolean;
  serviceMonths: number | null;
  minServiceMonths: number;
  serviceOk: boolean;
  concurrentCount: number;
  maxConcurrentLoans: number;
  concurrentOk: boolean;
  tenureMonths: number;
  maxTenureMonths: number | null;
  tenureOk: boolean;
  grossSalary: number | null;
  maxAllowedAmount: number;
  amountOk: boolean;
  designationMaxLoanAmount: number | null;
  designationCombinedAmount: number | null;
  designationCapOk: boolean;
  guarantorsRequired: number;
  guarantorModel: string;
  projectedEmi: number;
  existingMonthlyTotal: number;
  effectiveDsrLimit: number;
  projectedDsr: number;
  dsrOk: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}

const EMPTY_FORM = {
  employeeId: "",
  loanTypeId: "",
  principalAmount: "",
  totalInstallments: "",
  startDate: "",
  interestRate: "",
  notes: "",
  guarantorEmployeeId: "",
};

function fmtMoney(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `Rs. ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EligibilityRow({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  detail: string;
  label: string;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      {ok ? (
        <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
      ) : (
        <XCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-400">{detail}</p>
      </div>
    </div>
  );
}

export default function RequestLoanDialog({ isOpen, onClose, onDone }: Props) {
  const userId = useAuthStore((s) => s.user?.userId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [guarantorIds, setGuarantorIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loanTypes, setLoanTypes] = useState<LoanType[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedType = useMemo(
    () => loanTypes.find((t) => t.id === form.loanTypeId) ?? null,
    [loanTypes, form.loanTypeId],
  );

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setGuarantorIds([]);
    setErrors({});

    setEligibility(null);
    loadMeta();
  }, [isOpen]);

  async function loadMeta() {
    setLoadingMeta(true);
    try {
      const [empRes, typeRes] = await Promise.all([
        api.get("/employees"),
        api.get("/loan-types", { params: { includeInactive: false } }),
      ]);
      setEmployees(
        empRes.data.map((x: Employee) => ({ ...x, id: String(x.id) })),
      );
      setLoanTypes(
        typeRes.data.map((x: LoanType) => ({ ...x, id: String(x.id) })),
      );
    } catch {
      showError("Load Failed", "Could not load form data.");
    } finally {
      setLoadingMeta(false);
    }
  }

  // Prefill interest rate + force tenure=1 for advances when the type changes
  useEffect(() => {
    if (!selectedType) return;
    setForm((f) => ({
      ...f,
      interestRate:
        selectedType.interestMethod === "None"
          ? ""
          : String(selectedType.defaultInterestRate),
      totalInstallments: selectedType.isAdvance ? "1" : f.totalInstallments,
    }));
    setGuarantorIds([]);
  }, [selectedType?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  // Live eligibility preview, debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (
      !form.employeeId ||
      !form.loanTypeId ||
      !form.principalAmount ||
      !form.totalInstallments
    ) {
      setEligibility(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setEligibilityLoading(true);
      try {
        const res = await api.get("/loan-records/eligibility", {
          params: {
            employeeId: form.employeeId,
            loanTypeId: form.loanTypeId,
            principalAmount: form.principalAmount,
            totalInstallments: form.totalInstallments,
            interestRate: form.interestRate || undefined,
            startDate: form.startDate || undefined,
          },
        });
        setEligibility(res.data);
      } catch {
        setEligibility(null);
      } finally {
        setEligibilityLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [
    form.employeeId,
    form.loanTypeId,
    form.principalAmount,
    form.totalInstallments,
    form.interestRate,
    form.startDate,
  ]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.employeeId) e.employeeId = "Employee is required.";
    if (!form.loanTypeId) e.loanTypeId = "Loan type is required.";
    if (!form.principalAmount || Number(form.principalAmount) <= 0)
      e.principalAmount = "Enter a valid amount.";
    if (!form.totalInstallments || Number(form.totalInstallments) <= 0)
      e.totalInstallments = "Enter valid tenure.";
    if (!form.startDate) e.startDate = "Start date is required.";
    if (
      selectedType?.guarantorModel === "Single" &&
      !form.guarantorEmployeeId
    ) {
      e.guarantorEmployeeId = "A guarantor is required for this loan type.";
    }
    if (
      selectedType?.guarantorModel === "Multi" &&
      guarantorIds.length < selectedType.minGuarantors
    ) {
      e.guarantors = `At least ${selectedType.minGuarantors} guarantor(s) required.`;
    }
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setSaving(true);

    try {
      await api.post("/loan-records/request", {
        employeeId: form.employeeId,
        loanTypeId: form.loanTypeId,
        principalAmount: Number(form.principalAmount),
        totalInstallments: Number(form.totalInstallments),
        startDate: form.startDate,
        interestRate: form.interestRate ? Number(form.interestRate) : null,
        notes: form.notes || null,
        guarantorEmployeeId:
          selectedType?.guarantorModel === "Single"
            ? form.guarantorEmployeeId
            : null,
        guarantorIdsCsv:
          selectedType?.guarantorModel === "Multi"
            ? guarantorIds.join(",")
            : null,
      });
      showSuccess("Loan Requested", "The request is now pending approval.");
      onDone();
    } catch (err: any) {
      showError(
        "Request Failed",
        err?.response?.data?.error ?? "Failed to submit loan request.",
      );
    } finally {
      setSaving(false);
    }
  }

  const addGuarantorRow = () => setGuarantorIds((g) => [...g, ""]);
  const removeGuarantorRow = (idx: number) =>
    setGuarantorIds((g) => g.filter((_, i) => i !== idx));
  const setGuarantorAt = (idx: number, empId: string) =>
    setGuarantorIds((g) => g.map((v, i) => (i === idx ? empId : v)));

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onRequestClose={onClose}
      width={760}
    >
      <div className="p-6 pb-4">
        <h4 className="font-bold heading-text mb-1">New Loan Request</h4>
        <p className="text-sm text-gray-500">
          Submit a loan or advance request on behalf of an employee.
        </p>
      </div>

      <div className="px-6 pb-4 grid grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto">
        {loadingMeta ? (
          <div className="col-span-2 flex justify-center py-8">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Left column: form ───────────────────────────────── */}
            <div className="space-y-4">
              <div>
                <label className="form-label">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <EmployeeSearchSelect
                  employees={employees}
                  value={form.employeeId}
                  onChange={(id) => set("employeeId", id)}
                  hasError={!!errors.employeeId}
                />
                {errors.employeeId && (
                  <p className="text-xs text-rose-500 mt-1">
                    {errors.employeeId}
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">
                  Loan Type <span className="text-rose-500">*</span>
                </label>
                <select
                  className="input w-full"
                  style={{
                    border: errors.loanTypeId ? "1px solid #f87171" : undefined,
                  }}
                  value={form.loanTypeId}
                  onChange={(e) => set("loanTypeId", e.target.value)}
                >
                  <option value="">— Select Loan Type —</option>
                  {loanTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.isAdvance ? " (Advance)" : ""}
                    </option>
                  ))}
                </select>
                {errors.loanTypeId && (
                  <p className="text-xs text-rose-500 mt-1">
                    {errors.loanTypeId}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">
                    Amount (Rs.) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="input w-full"
                    style={{
                      border: errors.principalAmount
                        ? "1px solid #f87171"
                        : undefined,
                    }}
                    value={form.principalAmount}
                    onChange={(e) => set("principalAmount", e.target.value)}
                  />
                  {errors.principalAmount && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors.principalAmount}
                    </p>
                  )}
                </div>
                <div>
                  <label className="form-label">
                    Tenure (months) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    className="input w-full"
                    style={{
                      border: errors.totalInstallments
                        ? "1px solid #f87171"
                        : undefined,
                    }}
                    value={form.totalInstallments}
                    onChange={(e) => set("totalInstallments", e.target.value)}
                    disabled={selectedType?.isAdvance}
                  />
                  {errors.totalInstallments && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors.totalInstallments}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="input w-full"
                    style={{
                      border: errors.startDate
                        ? "1px solid #f87171"
                        : undefined,
                    }}
                    value={form.startDate}
                    onChange={(e) => set("startDate", e.target.value)}
                  />
                  {errors.startDate && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors.startDate}
                    </p>
                  )}
                </div>
                {selectedType && selectedType.interestMethod !== "None" && (
                  <div>
                    <label className="form-label">Interest Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input w-full"
                      value={form.interestRate}
                      onChange={(e) => set("interestRate", e.target.value)}
                    />
                  </div>
                )}
              </div>

              {selectedType?.guarantorModel === "Single" && (
                <div>
                  <label className="form-label">
                    Guarantor <span className="text-rose-500">*</span>
                  </label>
                  <EmployeeSearchSelect
                    employees={employees}
                    value={form.guarantorEmployeeId}
                    onChange={(id) => set("guarantorEmployeeId", id)}
                    excludeIds={form.employeeId ? [form.employeeId] : []}
                    hasError={!!errors.guarantorEmployeeId}
                  />
                  {errors.guarantorEmployeeId && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors.guarantorEmployeeId}
                    </p>
                  )}
                </div>
              )}

              {selectedType?.guarantorModel === "Multi" && (
                <div>
                  <label className="form-label">
                    Guarantors <span className="text-rose-500">*</span>{" "}
                    <span className="text-gray-400 font-normal">
                      (minimum {selectedType.minGuarantors})
                    </span>
                  </label>
                  <div className="space-y-2">
                    {guarantorIds.map((gid, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1">
                          <EmployeeSearchSelect
                            employees={employees}
                            value={gid}
                            onChange={(id) => setGuarantorAt(idx, id)}
                            excludeIds={[
                              ...(form.employeeId ? [form.employeeId] : []),
                              ...guarantorIds.filter((_, i) => i !== idx),
                            ]}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeGuarantorRow(idx)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 shrink-0"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addGuarantorRow}
                      className="text-xs text-violet-500 hover:underline flex items-center gap-1"
                    >
                      <Plus size={13} /> Add guarantor
                    </button>
                  </div>
                  {errors.guarantors && (
                    <p className="text-xs text-rose-500 mt-1">
                      {errors.guarantors}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="input w-full resize-none"
                  rows={2}
                  placeholder="Optional"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
            </div>

            {/* ── Right column: live eligibility preview ─────────── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                Eligibility Preview
              </p>
              {!form.employeeId ||
              !form.loanTypeId ||
              !form.principalAmount ||
              !form.totalInstallments ? (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
                  Select an employee, loan type, amount, and tenure to see a
                  live eligibility check.
                </div>
              ) : eligibilityLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : eligibility ? (
                <div className="space-y-1">
                  <div
                    className={`mb-3 px-3 py-2 rounded-lg text-sm font-semibold ${
                      eligibility.isEligible
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {eligibility.isEligible ? "Eligible" : "Not Eligible"}
                  </div>

                  <EligibilityRow
                    ok={eligibility.serviceOk}
                    label="Service tenure"
                    detail={`${eligibility.serviceMonths ?? 0} months served, minimum ${eligibility.minServiceMonths} required`}
                  />
                  <EligibilityRow
                    ok={eligibility.concurrentOk}
                    label="Concurrent loans"
                    detail={`${eligibility.concurrentCount} of max ${eligibility.maxConcurrentLoans} of this type`}
                  />
                  <EligibilityRow
                    ok={eligibility.tenureOk}
                    label="Tenure"
                    detail={
                      eligibility.maxTenureMonths
                        ? `${eligibility.tenureMonths} months requested, max ${eligibility.maxTenureMonths} allowed`
                        : `${eligibility.tenureMonths} months requested`
                    }
                  />
                  <EligibilityRow
                    ok={eligibility.amountOk}
                    label="Amount ceiling"
                    detail={`Max allowed ${fmtMoney(eligibility.maxAllowedAmount)}${
                      eligibility.grossSalary
                        ? ` (gross ${fmtMoney(eligibility.grossSalary)})`
                        : ""
                    }`}
                  />
                  {eligibility.designationMaxLoanAmount !== null && (
                    <EligibilityRow
                      ok={eligibility.designationCapOk}
                      label="Designation loan cap"
                      detail={`Combined ${fmtMoney(eligibility.designationCombinedAmount)} of max ${fmtMoney(eligibility.designationMaxLoanAmount)} (across all loan types that count toward this cap)`}
                    />
                  )}
                  <EligibilityRow
                    ok={eligibility.dsrOk}
                    label="Debt service ratio"
                    detail={`Projected ${eligibility.projectedDsr}% vs limit ${eligibility.effectiveDsrLimit}% (EMI ${fmtMoney(eligibility.projectedEmi)} + existing ${fmtMoney(eligibility.existingMonthlyTotal)})`}
                  />
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
                  Couldn't load eligibility — check the selected loan type is
                  valid.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-6 py-4">
        <button className="btn btn-default" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <Button
          variant="solid"
          color="primary"
          loading={saving}
          onClick={handleSave}
        >
          Submit Request
        </Button>
      </div>
    </Dialog>
  );
}
