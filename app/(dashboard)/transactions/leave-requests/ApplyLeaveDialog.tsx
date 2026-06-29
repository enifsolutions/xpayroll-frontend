"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { showError, showSuccess } from "@/lib/toast";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";

interface LeaveType {
  id: string;
  name: string;
  daysPerYear: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}

const EMPTY_FORM = {
  employeeId: "",
  leaveTypeId: "",
  fromDate: "",
  toDate: "",
  reason: "",
  coveringEmployeeId: "",
};

export default function ApplyLeaveDialog({ isOpen, onClose, onDone }: Props) {
  const userId = useAuthStore((s) => s.user?.userId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [calculatedDays, setCalculatedDays] = useState<number | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setCalculatedDays(null);
    loadMeta();
  }, [isOpen]);

  async function loadMeta() {
    setLoadingMeta(true);
    try {
      const [ltRes, empRes] = await Promise.all([
        api.get("/leave-types"),
        api.get("/employees"),
      ]);
      setLeaveTypes(
        ltRes.data.map((x: LeaveType) => ({ ...x, id: String(x.id) })),
      );
      setEmployees(
        empRes.data.map((x: Employee) => ({ ...x, id: String(x.id) })),
      );
    } catch {
      showError("Load Failed", "Could not load form data.");
    } finally {
      setLoadingMeta(false);
    }
  }

  useEffect(() => {
    if (!form.fromDate || !form.toDate) {
      setCalculatedDays(null);
      return;
    }
    const from = new Date(form.fromDate);
    const to = new Date(form.toDate);
    if (to < from) {
      setCalculatedDays(null);
      return;
    }
    let count = 0;
    const cur = new Date(from);
    while (cur <= to) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    setCalculatedDays(count);
  }, [form.fromDate, form.toDate]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.employeeId) e.employeeId = "Employee is required.";
    if (!form.leaveTypeId) e.leaveTypeId = "Leave type is required.";
    if (!form.fromDate) e.fromDate = "From date is required.";
    if (!form.toDate) e.toDate = "To date is required.";
    if (form.fromDate && form.toDate && form.toDate < form.fromDate)
      e.toDate = "To date must be on or after from date.";
    if (calculatedDays !== null && calculatedDays === 0)
      e.toDate = "Selected range contains no working days.";
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
      await api.post("/leave-requests/save", {
        action: "ADD",
        employeeId: form.employeeId,
        leaveTypeId: form.leaveTypeId,
        fromDate: form.fromDate,
        toDate: form.toDate,
        days: calculatedDays,
        reason: form.reason || null,
        coveringEmployeeId: form.coveringEmployeeId || null,
        actionBy: userId,
      });
      showSuccess("Leave Applied", "Leave request submitted successfully.");
      onDone();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to submit leave request.";
      showError("Submit Failed", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} onRequestClose={onClose}>
      {/* Header */}
      <div className="p-6 pb-4">
        <h4 className="font-bold heading-text mb-1">Apply for Leave</h4>
        <p className="text-sm text-gray-500">
          Submit a leave request on behalf of an employee.
        </p>
      </div>

      {/* Body */}
      <div className="px-6 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {loadingMeta ? (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Employee */}
            <div>
              <label className="form-label">
                Employee <span className="text-rose-500">*</span>
              </label>
              <select
                className="input w-full"
                style={{
                  border: errors.employeeId ? "1px solid #f87171" : undefined,
                }}
                value={form.employeeId}
                onChange={(e) => set("employeeId", e.target.value)}
              >
                <option value="">— Select Employee —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeCode} — {emp.firstName} {emp.lastName}
                  </option>
                ))}
              </select>
              {errors.employeeId && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.employeeId}
                </p>
              )}
            </div>

            {/* Leave Type */}
            <div>
              <label className="form-label">
                Leave Type <span className="text-rose-500">*</span>
              </label>
              <select
                className="input w-full"
                style={{
                  border: errors.leaveTypeId ? "1px solid #f87171" : undefined,
                }}
                value={form.leaveTypeId}
                onChange={(e) => set("leaveTypeId", e.target.value)}
              >
                <option value="">— Select Leave Type —</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name}
                    {lt.daysPerYear ? ` (${lt.daysPerYear} days/yr)` : ""}
                  </option>
                ))}
              </select>
              {errors.leaveTypeId && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.leaveTypeId}
                </p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">
                  From Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  className="input w-full"
                  style={{
                    border: errors.fromDate ? "1px solid #f87171" : undefined,
                  }}
                  value={form.fromDate}
                  onChange={(e) => set("fromDate", e.target.value)}
                />
                {errors.fromDate && (
                  <p className="text-xs text-rose-500 mt-1">
                    {errors.fromDate}
                  </p>
                )}
              </div>
              <div>
                <label className="form-label">
                  To Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  className="input w-full"
                  style={{
                    border: errors.toDate ? "1px solid #f87171" : undefined,
                  }}
                  value={form.toDate}
                  min={form.fromDate}
                  onChange={(e) => set("toDate", e.target.value)}
                />
                {errors.toDate && (
                  <p className="text-xs text-rose-500 mt-1">{errors.toDate}</p>
                )}
              </div>
            </div>

            {/* Working days pill */}
            {calculatedDays !== null && (
              <p className="text-xs text-blue-600 font-medium">
                {calculatedDays} working {calculatedDays === 1 ? "day" : "days"}{" "}
                selected
              </p>
            )}

            {/* Reason */}
            <div>
              <label className="form-label">Reason</label>
              <textarea
                className="input w-full resize-none"
                rows={3}
                placeholder="Optional — provide a reason for the leave request…"
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
              />
            </div>

            {/* Covering Employee */}
            <div>
              <label className="form-label">
                Covering Employee{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                className="input w-full"
                value={form.coveringEmployeeId}
                onChange={(e) => set("coveringEmployeeId", e.target.value)}
              >
                <option value="">— None —</option>
                {employees
                  .filter((emp) => emp.id !== form.employeeId)
                  .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} — {emp.firstName} {emp.lastName}
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
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
