"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, XCircle } from "lucide-react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { showSuccess, showError } from "@/lib/toast";
import { statusBadgeClass, statusLabel } from "@/utils/leaveRequestUtils";
import type {
  LeaveRequest,
  LeaveRequestForm,
} from "@/types/leaveRequest.types";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";

interface LeaveType {
  id: string;
  name: string;
  isCoveringEmployee: boolean;
}
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}

const DEFAULT_FORM: LeaveRequestForm & { coveringEmployeeId: string } = {
  employeeId: "",
  leaveTypeId: "",
  fromDate: "",
  toDate: "",
  days: "",
  reason: "",
  coveringEmployeeId: "",
};

export default function MyLeavePage() {
  useRequirePermission("Leave.Request.Apply");

  const userId = useAuthStore((s) => s.user?.userId);
  const initialized = useRef(false);

  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(
    new Date().getFullYear().toString(),
  );
  const [empFilter, setEmpFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [saving, setSaving] = useState(false);

  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Derived: does the selected leave type require a covering employee?
  const selectedLeaveType = leaveTypes.find((lt) => lt.id === form.leaveTypeId);
  const requiresCovering = selectedLeaveType?.isCoveringEmployee ?? false;

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { year: yearFilter };
      if (empFilter) params.employeeId = empFilter;
      const res = await api.get("/leave-requests", { params });
      setItems(res.data.map((r: LeaveRequest) => ({ ...r, id: String(r.id) })));
    } catch (err:any) {
      showError(
        "Load Failed",
        err?.response?.data?.error ?? "Could not load leave requests.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMasterData() {
    try {
      const [ltRes, empRes] = await Promise.all([
        api.get("/leave-types"),
        api.get("/employees"),
      ]);
      setLeaveTypes(
        ltRes.data.map((t: any) => ({
          id: String(t.id),
          name: t.name,
          isCoveringEmployee: t.isCoveringEmployee ?? false,
        })),
      );
      setEmployees(
        empRes.data.map((e: any) => ({
          id: String(e.id),
          firstName: e.firstName,
          lastName: e.lastName,
          employeeCode: e.employeeCode,
        })),
      );
    } catch (err: any) {
      showError(
        "Load Failed",
        err?.response?.data?.error ?? "Could not load master data.",
      );
    }
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      loadMasterData();
      load();
    }
  }, []);

  useEffect(() => {
    load();
  }, [yearFilter, empFilter]);

  // Reset covering employee when leave type changes
  useEffect(() => {
    setForm((f) => ({ ...f, coveringEmployeeId: "" }));
  }, [form.leaveTypeId]);

  // Auto-calculate days
  useEffect(() => {
    if (form.fromDate && form.toDate) {
      const from = new Date(form.fromDate);
      const to = new Date(form.toDate);
      if (to >= from) {
        const diff = Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1;
        setForm((f) => ({ ...f, days: diff.toString() }));
      }
    }
  }, [form.fromDate, form.toDate]);

  function openApply() {
    setForm({ ...DEFAULT_FORM });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (
      !form.employeeId ||
      !form.leaveTypeId ||
      !form.fromDate ||
      !form.toDate ||
      !form.days
    ) {
      showError("Validation", "Please fill all required fields.");
      return;
    }
    if (requiresCovering && !form.coveringEmployeeId) {
      showError(
        "Validation",
        "A covering employee is required for this leave type.",
      );
      return;
    }
    if (!userId) {
      showError("Session Error", "Please refresh and try again.");
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
        days: parseFloat(form.days),
        reason: form.reason || null,
        coveringEmployeeId: form.coveringEmployeeId || null,
        actionBy: userId,
      });
      showSuccess("Applied", "Leave request submitted successfully.");
      setDialogOpen(false);
      load();
    } catch (err: any) {
      showError(
        "Error",
        err?.response?.data?.error ?? "Could not submit leave request.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    if (!userId) {
      showError("Session Error", "Please refresh and try again.");
      return;
    }
    setCancelling(true);
    try {
      await api.post("/leave-requests/cancel", {
        id: cancelTarget.id,
        actionBy: userId,
      });
      showSuccess("Cancelled", "Leave request cancelled.");
      setCancelDialog(false);
      load();
    } catch (err: any) {
      showError("Failed", err?.response?.data?.error ?? "Could not cancel.");
    } finally {
      setCancelling(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) =>
    (currentYear - i).toString(),
  );

  // Employees available for covering (exclude the selected employee)
  const coveringOptions = employees.filter((e) => e.id !== form.employeeId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="mb-1">Leave Requests</h3>
          <p className="text-sm text-gray-500">
            Apply and manage leave requests for employees.
          </p>
        </div>
        <Button variant="solid" icon={<Plus size={16} />} onClick={openApply}>
          Apply for Leave
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="input w-36"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          className="input w-56"
          value={empFilter}
          onChange={(e) => setEmpFilter(e.target.value)}
        >
          <option value="">All Employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.firstName} {e.lastName} ({e.employeeCode})
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Days</th>
                  <th>Covering</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-400">
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="font-medium">{item.employeeName}</div>
                        <div className="text-xs text-gray-400">
                          {item.employeeCode}
                        </div>
                      </td>
                      <td>{item.leaveTypeName}</td>
                      <td>{item.fromDate}</td>
                      <td>{item.toDate}</td>
                      <td>{item.days}</td>
                      <td>
                        {(item as any).coveringEmployeeName ? (
                          <span className="text-sm">
                            {(item as any).coveringEmployeeName}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td>
                        <span className={statusBadgeClass(item.status)}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        {(item.status === "Pending" ||
                          item.status === "SupervisorApproved") && (
                          <button
                            onClick={() => {
                              setCancelTarget(item);
                              setCancelDialog(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                            title="Cancel"
                          >
                            <XCircle size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <h5 className="mb-4">Apply for Leave</h5>
        <div className="space-y-4">
          <div>
            <label className="form-label">
              Employee <span className="text-error">*</span>
            </label>
            <select
              className="input w-full"
              value={form.employeeId}
              onChange={(e) =>
                setForm((f) => ({ ...f, employeeId: e.target.value }))
              }
            >
              <option value="">Select employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              Leave Type <span className="text-error">*</span>
            </label>
            <select
              className="input w-full"
              value={form.leaveTypeId}
              onChange={(e) =>
                setForm((f) => ({ ...f, leaveTypeId: e.target.value }))
              }
            >
              <option value="">Select leave type</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Covering employee — shown only when leave type requires it */}
          {requiresCovering && (
            <div>
              <label className="form-label">
                Covering Employee <span className="text-error">*</span>
                <span className="ml-1 text-xs text-gray-400">
                  (required for this leave type)
                </span>
              </label>
              <select
                className="input w-full"
                value={form.coveringEmployeeId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, coveringEmployeeId: e.target.value }))
                }
              >
                <option value="">Select covering employee</option>
                {coveringOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.employeeCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                From Date <span className="text-error">*</span>
              </label>
              <Input
                type="date"
                value={form.fromDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fromDate: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">
                To Date <span className="text-error">*</span>
              </label>
              <Input
                type="date"
                value={form.toDate}
                min={form.fromDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, toDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className="form-label">
              Number of Days <span className="text-error">*</span>
            </label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              value={form.days}
              placeholder="Auto-calculated"
              onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label">Reason</label>
            <textarea
              className="input w-full"
              rows={3}
              value={form.reason}
              placeholder="Optional reason for leave..."
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            Submit
          </Button>
        </div>
      </Dialog>

      {/* Cancel Confirm Dialog */}
      <Dialog
        isOpen={cancelDialog}
        onClose={() => setCancelDialog(false)}
        onRequestClose={() => setCancelDialog(false)}
      >
        <h5 className="mb-3">Cancel Leave Request</h5>
        <p className="text-sm text-gray-500 mb-4">
          Are you sure you want to cancel the{" "}
          <strong>{cancelTarget?.leaveTypeName}</strong> request for{" "}
          <strong>{cancelTarget?.employeeName}</strong> (
          {cancelTarget?.fromDate} – {cancelTarget?.toDate})?
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="plain" onClick={() => setCancelDialog(false)}>
            Back
          </Button>
          <Button
            variant="solid"
            loading={cancelling}
            onClick={handleCancel}
            className="bg-red-500 hover:bg-red-600"
          >
            Yes, Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
