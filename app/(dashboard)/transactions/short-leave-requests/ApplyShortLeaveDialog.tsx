"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { showError, showSuccess } from "@/lib/toast";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";

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
  leaveDate: "",
  fromTime: "",
  toTime: "",
  reason: "",
};

export default function ApplyShortLeaveDialog({ isOpen, onClose, onDone }: Props) {
  const userId = useAuthStore((s) => s.user?.userId);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [empLoading, setEmpLoading] = useState(false);

  const [quota, setQuota] = useState<{ used: number; max: number } | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setEmpSearch("");
    setQuota(null);
    if (employees.length === 0) loadEmployees();
  }, [isOpen]);

  async function loadEmployees() {
    setEmpLoading(true);
    try {
      const res = await api.get("/employees", { params: { status: "Active" } });
      setEmployees(
        res.data.map((e: any) => ({
          id: String(e.id),
          firstName: e.firstName,
          lastName: e.lastName,
          employeeCode: e.employeeCode,
        })),
      );
    } catch (err: any) {
      showError("Load failed", err?.response?.data?.error ?? "Could not fetch employee list.");
    } finally {
      setEmpLoading(false);
    }
  }

  const filteredEmployees = employees.filter(
    (e) =>
      empSearch === "" ||
      e.employeeCode.toLowerCase().includes(empSearch.toLowerCase()) ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(empSearch.toLowerCase()),
  );
  const selectedEmployee = employees.find((e) => e.id === form.employeeId);

  // Live quota meter: counts this employee's Pending/SupervisorApproved/Approved
  // short leave requests for the current calendar month, mirroring exactly what
  // sp_action_short_leave's own quota check counts server-side. No dedicated
  // "quota status" endpoint exists yet — this reuses the existing list endpoint
  // and counts client-side rather than adding new backend surface for a
  // read-only convenience display.
  useEffect(() => {
    if (!form.employeeId) {
      setQuota(null);
      return;
    }
    setLoadingQuota(true);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    api
      .get("/short-leave-policy")
      .then((policyRes) => {
        const maxQuota = policyRes.data.monthlyQuota;
        return api
          .get("/short-leave-requests", {
            params: { employeeId: form.employeeId, dateFrom: monthStart, dateTo: monthEnd },
          })
          .then((reqRes) => {
            const used = reqRes.data.filter((r: any) =>
              ["Pending", "SupervisorApproved", "Approved"].includes(r.status),
            ).length;
            setQuota({ used, max: maxQuota });
          });
      })
      .catch(() => setQuota(null))
      .finally(() => setLoadingQuota(false));
  }, [form.employeeId]);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.employeeId) e.employeeId = "Employee is required.";
    if (!form.leaveDate) e.leaveDate = "Date is required.";
    if (!form.fromTime) e.fromTime = "From time is required.";
    if (!form.toTime) e.toTime = "To time is required.";
    if (form.fromTime && form.toTime && form.toTime <= form.fromTime)
      e.toTime = "To time must be after from time.";
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
      await api.post("/short-leave-requests/save", {
        action: "ADD",
        employeeId: form.employeeId,
        leaveDate: form.leaveDate,
        fromTime: form.fromTime,
        toTime: form.toTime,
        reason: form.reason || null,
        rejectionReason: null,
        cancellationReason: null,
        actionBy: userId,
        appliedBy: userId,
      });
      showSuccess("Short Leave Applied", "Short leave request submitted successfully.");
      onDone();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ??
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to submit short leave request.";
      showError("Submit Failed", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} onRequestClose={onClose}>
      <div className="p-6 pb-4">
        <h4 className="font-bold heading-text mb-1">Apply for Short Leave</h4>
        <p className="text-sm text-gray-500">
          Submit a short leave request on behalf of an employee.
        </p>
      </div>

      <div className="px-6 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">
        <div>
          <label className="form-label">
            Employee <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Input
              placeholder="Search by name or code..."
              value={empSearch}
              onChange={(e) => {
                setEmpSearch(e.target.value);
                if (form.employeeId) set("employeeId", "");
              }}
            />
            {form.employeeId && selectedEmployee && (
              <div className="mt-1 text-sm text-primary font-medium">
                ✓ {selectedEmployee.firstName} {selectedEmployee.lastName} (
                {selectedEmployee.employeeCode})
              </div>
            )}
            {empSearch && !form.employeeId && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {empLoading ? (
                  <div className="p-3 text-sm text-gray-400">Loading...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="p-3 text-sm text-gray-400">No employees found</div>
                ) : (
                  filteredEmployees.slice(0, 10).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => {
                        set("employeeId", e.id);
                        setEmpSearch(`${e.firstName} ${e.lastName}`);
                      }}
                    >
                      {e.firstName} {e.lastName}{" "}
                      <span className="text-gray-400">({e.employeeCode})</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {errors.employeeId && <p className="text-xs text-rose-500 mt-1">{errors.employeeId}</p>}
        </div>

        {form.employeeId && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800/40 px-4 py-2.5 text-sm">
            {loadingQuota ? (
              <span className="text-gray-400">Checking quota…</span>
            ) : quota ? (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">This month's usage</span>
                <span className={`font-semibold ${quota.used >= quota.max ? "text-amber-600" : "text-gray-700"}`}>
                  {quota.used} of {quota.max} used
                  {quota.used >= quota.max && " — next request may convert to half-day leave"}
                </span>
              </div>
            ) : (
              <span className="text-gray-400">Quota status unavailable.</span>
            )}
          </div>
        )}

        <div>
          <label className="form-label">
            Date <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            className="input w-full"
            style={{ border: errors.leaveDate ? "1px solid #f87171" : undefined }}
            value={form.leaveDate}
            onChange={(e) => set("leaveDate", e.target.value)}
          />
          {errors.leaveDate && <p className="text-xs text-rose-500 mt-1">{errors.leaveDate}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="form-label">
              From Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              className="input w-full"
              style={{ border: errors.fromTime ? "1px solid #f87171" : undefined }}
              value={form.fromTime}
              onChange={(e) => set("fromTime", e.target.value)}
            />
            {errors.fromTime && <p className="text-xs text-rose-500 mt-1">{errors.fromTime}</p>}
          </div>
          <div>
            <label className="form-label">
              To Time <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              className="input w-full"
              style={{ border: errors.toTime ? "1px solid #f87171" : undefined }}
              value={form.toTime}
              onChange={(e) => set("toTime", e.target.value)}
            />
            {errors.toTime && <p className="text-xs text-rose-500 mt-1">{errors.toTime}</p>}
          </div>
        </div>

        <div>
          <label className="form-label">Reason</label>
          <textarea
            className="input w-full resize-none"
            rows={3}
            placeholder="Optional — provide a reason for the short leave…"
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 px-6 py-4">
        <button className="btn btn-default" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <Button variant="solid" color="primary" loading={saving} onClick={handleSave}>
          Submit Request
        </Button>
      </div>
    </Dialog>
  );
}
