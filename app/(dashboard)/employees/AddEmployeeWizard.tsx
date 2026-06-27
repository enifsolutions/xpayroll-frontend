'use client'

import { useState, useEffect } from "react";
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { showError, showSuccess } from '@/lib/toast'
import api from '@/lib/axios'
import {
  EMPLOYMENT_TYPES, EMPLOYEE_STATUSES, GENDERS,
  PAYROLL_BASES, CONTRACT_TYPES, CURRENCIES,
} from './employee.types'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

interface LeaveTemplateOption {
  id: string;
  name: string;
  code: string;
}

interface Step1Form {
  employeeCode: string;
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  personalEmail: string;
  phoneNumber: string;
  nationalIdNumber: string;
  tinNumber: string;
  bankAccountNumber: string;
  bankName: string;
  bankBranchCode: string;
  bankBranchName: string;
  bankAccountHolderName: string;
  bankAccountType: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  address: string;
  joinDate: string;
  employmentType: string;
  status: string;
  crew: string;
  groupName: string;
  notes: string;
  leaveTemplateId: string;
}

interface Step2Form {
  contractType: string
  payrollBasis: string
  basicSalary: string
  hourlyRate: string
  dailyRate: string
  allowances: string
  currency: string
  absentDeductionAfterDays: string
  lateDeductionPerMinute: string
  overtimeRateMultiplier: string
  startDate: string
  endDate: string
  contractNotes: string
}

const defaultStep1: Step1Form = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  middleName: "",
  email: "",
  personalEmail: "",
  phoneNumber: "",
  nationalIdNumber: "",
  tinNumber: "",
  bankAccountNumber: "",
  bankName: "",
  bankBranchCode: "",
  bankBranchName: "",
  bankAccountHolderName: "",
  bankAccountType: "",
  dateOfBirth: "",
  gender: "",
  nationality: "",
  address: "",
  joinDate: new Date().toISOString().split("T")[0],
  employmentType: "FullTime",
  status: "Active",
  crew: "",
  groupName: "",
  notes: "",
  leaveTemplateId: "",
};

const defaultStep2: Step2Form = {
  contractType: 'Permanent', payrollBasis: 'Fixed',
  basicSalary: '', hourlyRate: '', dailyRate: '',
  allowances: '0', currency: 'LKR',
  absentDeductionAfterDays: '0', lateDeductionPerMinute: '0',
  overtimeRateMultiplier: '1.5',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '', contractNotes: '',
}

export default function AddEmployeeWizard({ open, onClose, onSaved }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdEmployeeId, setCreatedEmployeeId] = useState<string | null>(
    null,
  );
  const [form1, setForm1] = useState<Step1Form>(defaultStep1);
  const [form2, setForm2] = useState<Step2Form>(defaultStep2);
  const [leaveTemplates, setLeaveTemplates] = useState<LeaveTemplateOption[]>(
    [],
  );

  useEffect(() => {
    api
      .get<LeaveTemplateOption[]>("/LeaveTemplate?isActive=true")
      .then((r) =>
        setLeaveTemplates(r.data.map((t) => ({ ...t, id: String(t.id) }))),
      )
      .catch(() => {});
  }, []);

  const f1 =
    (field: keyof Step1Form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm1((p) => ({ ...p, [field]: e.target.value }));

  const f2 =
    (field: keyof Step2Form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm2((p) => ({ ...p, [field]: e.target.value }));

  const reset = () => {
    setStep(1);
    setError("");
    setCreatedEmployeeId(null);
    setForm1(defaultStep1);
    setForm2(defaultStep2);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleStep1Next = async () => {
    setError("");
    if (!form1.employeeCode.trim()) {
      setError("Employee code is required.");
      return;
    }
    if (!form1.firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!form1.lastName.trim()) {
      setError("Last name is required.");
      return;
    }
    if (!form1.joinDate) {
      setError("Join date is required.");
      return;
    }
    if (!form1.leaveTemplateId) {
      setError("Leave template is required.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/employees/save", {
        action: "ADD",
        employeeCode: form1.employeeCode,
        firstName: form1.firstName,
        lastName: form1.lastName,
        middleName: form1.middleName || null,
        email: form1.email || null,
        personalEmail: form1.personalEmail || null,
        phoneNumber: form1.phoneNumber || null,
        nationalIdNumber: form1.nationalIdNumber || null,
        tinNumber: form1.tinNumber || null,
        bankAccountNumber: form1.bankAccountNumber || null,
        bankName: form1.bankName || null,
        bankBranchCode: form1.bankBranchCode || null,
        bankBranchName: form1.bankBranchName || null,
        bankAccountHolderName: form1.bankAccountHolderName || null,
        bankAccountType: form1.bankAccountType || null,
        dateOfBirth: form1.dateOfBirth || null,
        gender: form1.gender || null,
        nationality: form1.nationality || null,
        address: form1.address || null,
        joinDate: form1.joinDate,
        employmentType: form1.employmentType,
        status: form1.status,
        crew: form1.crew || null,
        groupName: form1.groupName || null,
        notes: form1.notes || null,
        leaveTemplateId: form1.leaveTemplateId,
        userId: 1,
      });
      const res = await api.get(
        `/employees?employeeCode=${form1.employeeCode}`,
      );
      const created = res.data?.[0];
      if (!created)
        throw new Error("Employee saved but could not retrieve ID.");
      setCreatedEmployeeId(created.id);
      setForm2((p) => ({ ...p, startDate: form1.joinDate }));
      setStep(2);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to save employee.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStep2Save = async () => {
    setError("");
    if (!form2.startDate) {
      setError("Contract start date is required.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/employees/contracts/save", {
        action: "ADD",
        employeeId: createdEmployeeId,
        contractType: form2.contractType,
        payrollBasis: form2.payrollBasis,
        basicSalary: parseFloat(form2.basicSalary) || 0,
        hourlyRate: form2.hourlyRate ? parseFloat(form2.hourlyRate) : null,
        dailyRate: form2.dailyRate ? parseFloat(form2.dailyRate) : null,
        allowances: parseFloat(form2.allowances) || 0,
        currency: form2.currency,
        absentDeductionAfterDays: parseInt(form2.absentDeductionAfterDays) || 0,
        lateDeductionPerMinute: parseFloat(form2.lateDeductionPerMinute) || 0,
        overtimeRateMultiplier: parseFloat(form2.overtimeRateMultiplier) || 1.5,
        startDate: form2.startDate,
        endDate: form2.endDate || null,
        isActive: true,
        notes: form2.contractNotes || null,
        userId: 1,
      });
      showSuccess("Employee added successfully.");
      reset();
      onSaved();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          err?.message ??
          "Failed to save contract.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog isOpen={open} onClose={handleClose} onRequestClose={handleClose}>
      <div className="p-6 w-full max-w-4xl">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold
            ${step === 1 ? "bg-primary text-white" : "bg-emerald-500 text-white"}`}
          >
            {step > 1 ? "✓" : "1"}
          </div>
          <div className="flex-1 h-0.5 bg-gray-200">
            <div
              className={`h-full bg-primary transition-all duration-300 ${step > 1 ? "w-full" : "w-0"}`}
            />
          </div>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold
            ${step === 2 ? "bg-primary text-white" : "bg-gray-200 text-gray-400"}`}
          >
            2
          </div>
        </div>

        {/* ── Step 1 ── */}
        {step === 1 && (
          <>
            <h5 className="font-semibold text-base mb-4">
              Step 1 — Employee Details
            </h5>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    Employee Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form1.employeeCode}
                    onChange={f1("employeeCode")}
                    placeholder="EMP001"
                  />
                </div>
                <div>
                  <label className="form-label">
                    Join Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form1.joinDate}
                    onChange={f1("joinDate")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form1.firstName}
                    onChange={f1("firstName")}
                    placeholder="Kasun"
                  />
                </div>
                <div>
                  <label className="form-label">Middle Name</label>
                  <Input
                    value={form1.middleName}
                    onChange={f1("middleName")}
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="form-label">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={form1.lastName}
                    onChange={f1("lastName")}
                    placeholder="Perera"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Work Email</label>
                  <Input
                    type="email"
                    value={form1.email}
                    onChange={f1("email")}
                    placeholder="kasun@company.lk"
                  />
                </div>
                <div>
                  <label className="form-label">Personal Email</label>
                  <Input
                    type="email"
                    value={form1.personalEmail}
                    onChange={f1("personalEmail")}
                    placeholder="kasun@gmail.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Phone Number</label>
                  <Input
                    value={form1.phoneNumber}
                    onChange={f1("phoneNumber")}
                    placeholder="+94 77 123 4567"
                  />
                </div>
                <div>
                  <label className="form-label">National ID</label>
                  <Input
                    value={form1.nationalIdNumber}
                    onChange={f1("nationalIdNumber")}
                    placeholder="987654321V"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Date of Birth</label>
                  <Input
                    type="date"
                    value={form1.dateOfBirth}
                    onChange={f1("dateOfBirth")}
                  />
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  <select
                    className="input w-full"
                    value={form1.gender}
                    onChange={f1("gender")}
                  >
                    <option value="">— Select —</option>
                    {GENDERS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Nationality</label>
                  <Input
                    value={form1.nationality}
                    onChange={f1("nationality")}
                    placeholder="Sri Lankan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Employment Type</label>
                  <select
                    className="input w-full"
                    value={form1.employmentType}
                    onChange={f1("employmentType")}
                  >
                    {EMPLOYMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    className="input w-full"
                    value={form1.status}
                    onChange={f1("status")}
                  >
                    {EMPLOYEE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Leave Template — mandatory */}
              <div>
                <label className="form-label">
                  Leave Template <span className="text-red-500">*</span>
                </label>
                <select
                  style={{
                    height: "40px",
                    width: "100%",
                    borderRadius: "10px",
                    border: form1.leaveTemplateId
                      ? "1px solid #e5e7eb"
                      : "1px solid #fca5a5",
                    backgroundColor: "#f3f4f6",
                    padding: "0 12px",
                    fontSize: "14px",
                    color: form1.leaveTemplateId ? "#1f2937" : "#6b7280",
                    outline: "none",
                    appearance: "auto",
                  }}
                  value={form1.leaveTemplateId}
                  onChange={f1("leaveTemplateId")}
                >
                  <option value="">— Select leave template —</option>
                  {leaveTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
                {form1.leaveTemplateId && (
                  <p className="text-xs text-amber-600 mt-1">
                    ⚠ This template will seed leave balances and cannot be
                    changed after saving.
                  </p>
                )}
                {leaveTemplates.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No active leave templates found. Please create one first.
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">Address</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={form1.address}
                  onChange={f1("address")}
                  placeholder="No. 12, Galle Road, Colombo 03"
                />
              </div>

              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-xs font-semibold text-gray-500 px-2">
                  Bank Details
                </legend>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">Account Holder Name</label>
                    <Input
                      value={form1.bankAccountHolderName}
                      onChange={f1("bankAccountHolderName")}
                      placeholder="As per bank records"
                    />
                  </div>
                  <div>
                    <label className="form-label">Account Number</label>
                    <Input
                      value={form1.bankAccountNumber}
                      onChange={f1("bankAccountNumber")}
                      placeholder="0012345678"
                    />
                  </div>
                  <div>
                    <label className="form-label">Account Type</label>
                    <select
                      className="input w-full"
                      value={form1.bankAccountType}
                      onChange={f1("bankAccountType")}
                    >
                      <option value="">Select…</option>
                      <option value="Savings">Savings</option>
                      <option value="Current">Current</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Bank Name</label>
                    <Input
                      value={form1.bankName}
                      onChange={f1("bankName")}
                      placeholder="Commercial Bank"
                    />
                  </div>
                  <div>
                    <label className="form-label">Branch Name</label>
                    <Input
                      value={form1.bankBranchName}
                      onChange={f1("bankBranchName")}
                      placeholder="e.g. Colombo 03"
                    />
                  </div>
                  <div>
                    <label className="form-label">Branch Code</label>
                    <Input
                      value={form1.bankBranchCode}
                      onChange={f1("bankBranchCode")}
                      placeholder="001"
                    />
                  </div>
                </div>
              </fieldset>

              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-xs font-semibold text-gray-500 px-2">
                  Tax & Classification
                </legend>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">TIN Number</label>
                    <Input
                      value={form1.tinNumber}
                      onChange={f1("tinNumber")}
                      placeholder="Tax Identification Number"
                    />
                  </div>
                  <div>
                    <label className="form-label">Crew</label>
                    <Input
                      value={form1.crew}
                      onChange={f1("crew")}
                      placeholder="Crew label"
                    />
                  </div>
                  <div>
                    <label className="form-label">Group</label>
                    <Input
                      value={form1.groupName}
                      onChange={f1("groupName")}
                      placeholder="Group label"
                    />
                  </div>
                </div>
              </fieldset>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={form1.notes}
                  onChange={f1("notes")}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="plain" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="solid"
                loading={saving}
                onClick={handleStep1Next}
              >
                Next — Contract
              </Button>
            </div>
          </>
        )}

        {/* ── Step 2 ── */}
        {step === 2 && (
          <>
            <h5 className="font-semibold text-base mb-4">
              Step 2 — Contract Details
            </h5>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Contract Type</label>
                  <select
                    className="input w-full"
                    value={form2.contractType}
                    onChange={f2("contractType")}
                  >
                    {CONTRACT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Payroll Basis</label>
                  <select
                    className="input w-full"
                    value={form2.payrollBasis}
                    onChange={f2("payrollBasis")}
                  >
                    {PAYROLL_BASES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Basic Salary</label>
                  <Input
                    type="number"
                    value={form2.basicSalary}
                    onChange={f2("basicSalary")}
                    placeholder="75000"
                  />
                </div>
                <div>
                  <label className="form-label">Allowances</label>
                  <Input
                    type="number"
                    value={form2.allowances}
                    onChange={f2("allowances")}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <select
                    className="input w-full"
                    value={form2.currency}
                    onChange={f2("currency")}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {form2.payrollBasis === "Hourly" && (
                <div>
                  <label className="form-label">Hourly Rate</label>
                  <Input
                    type="number"
                    value={form2.hourlyRate}
                    onChange={f2("hourlyRate")}
                    placeholder="500"
                  />
                </div>
              )}

              {form2.payrollBasis === "Daily" && (
                <div>
                  <label className="form-label">Daily Rate</label>
                  <Input
                    type="number"
                    value={form2.dailyRate}
                    onChange={f2("dailyRate")}
                    placeholder="3000"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form2.startDate}
                    onChange={f2("startDate")}
                  />
                </div>
                <div>
                  <label className="form-label">End Date</label>
                  <Input
                    type="date"
                    value={form2.endDate}
                    onChange={f2("endDate")}
                  />
                </div>
              </div>

              <fieldset className="border border-gray-200 rounded-lg p-4">
                <legend className="text-xs font-semibold text-gray-500 px-2">
                  Deduction Rules
                </legend>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">
                      Absent Deduction After (days)
                    </label>
                    <Input
                      type="number"
                      value={form2.absentDeductionAfterDays}
                      onChange={f2("absentDeductionAfterDays")}
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Late Deduction / Minute
                    </label>
                    <Input
                      type="number"
                      value={form2.lateDeductionPerMinute}
                      onChange={f2("lateDeductionPerMinute")}
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="form-label">OT Rate Multiplier</label>
                    <Input
                      type="number"
                      value={form2.overtimeRateMultiplier}
                      onChange={f2("overtimeRateMultiplier")}
                      step="0.1"
                    />
                  </div>
                </div>
              </fieldset>

              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="input w-full"
                  rows={2}
                  value={form2.contractNotes}
                  onChange={f2("contractNotes")}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

            <div className="flex justify-between mt-6">
              <Button
                variant="plain"
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
              >
                ← Back
              </Button>
              <div className="flex gap-3">
                <Button variant="plain" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="solid"
                  loading={saving}
                  onClick={handleStep2Save}
                >
                  Save Employee
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}