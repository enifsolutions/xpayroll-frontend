"use client";

import { useEffect, useRef, useState } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Search,
  Play,
  RefreshCw,
  FileEdit,
  ClipboardList,
  Lock,
  Clock,
  UserX,
  AlertTriangle,
  Timer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
import type {
  AttendanceLog,
  AttendanceLogForm,
  AttendanceLogFilters,
  AttendanceGenerationLog,
} from "@/types/attendance-log.types";
import { useRouter } from "next/navigation";

const SOURCES = [
  "ManualHR",
  "SelfService",
  "Biometric",
  "QrCode",
  "Nfc",
  "SystemAuto",
];
const STATUSES = [
  "Present",
  "Absent",
  "HalfDay",
  "Late",
  "OnLeave",
  "Holiday",
  "WeekOff",
  "ToBeRegularized",
  "NoPay",
];

const PAGE_SIZE = 10;

interface EmployeeOption {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-indigo-500",
  "bg-rose-500",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const emptyForm = (): AttendanceLogForm => ({
  employeeId: "",
  shiftId: "",
  workDate: "",
  checkIn: "",
  checkOut: "",
  source: "ManualHR",
  hoursWorked: "0",
  overtimeHours: "0",
  breakMinutes: "0",
  isLate: false,
  lateMinutes: "0",
  preOtMinutes: "0",
  postOtMinutes: "0",
  earlyLeaveMinutes: "0",
  status: "Present",
  adjustmentReason: "",
  notes: "",
  manualOverride: false,
});

// Pagination helper
function buildPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export default function AttendanceLogsPage() {
  useRequirePermission("Attendance.Log.View");
  const canAdd = usePermission("Attendance.Log.Add");
  const canEdit = usePermission("Attendance.Log.Edit");
  const canDelete = usePermission("Attendance.Log.Delete");
  const canRunGen = usePermission("Attendance.Generation.Run");
  const canViewGen = usePermission("Attendance.Generation.View");
  const canRequestAdj = usePermission("Attendance.Adjustment.Request");
  const canApprove = usePermission("Attendance.Adjustment.Approve");

  const userId = useAuthStore((s) => s.user?.userId);
  const router = useRouter();

  const initialized = useRef(false);
  const [items, setItems] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AttendanceLog | null>(null);
  const [form, setForm] = useState<AttendanceLogForm>(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [empSearch, setEmpSearch] = useState("");
  const [empLoading, setEmpLoading] = useState(false);

  const [shiftStart, setShiftStart] = useState<string | null>(null);
  const [graceMinutes, setGraceMinutes] = useState<number>(0);

  const [genLogs, setGenLogs] = useState<AttendanceGenerationLog[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genRunning, setGenRunning] = useState(false);
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [genDate, setGenDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  });
  const [confirmDelete, setConfirmDelete] = useState<AttendanceLog | null>(
    null,
  );
  const [confirmGen, setConfirmGen] = useState(false);

  const [adjDialogOpen, setAdjDialogOpen] = useState(false);
  const [adjTarget, setAdjTarget] = useState<AttendanceLog | null>(null);
  const [adjForm, setAdjForm] = useState({
    newCheckIn: "",
    newCheckOut: "",
    newStatus: "",
    newBreakMinutes: "0",
    reason: "",
  });
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjError, setAdjError] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  )
    .toISOString()
    .split("T")[0];

  const [filters, setFilters] = useState<AttendanceLogFilters>({
    employeeId: "",
    empSearch: "",
    dateFrom: firstOfMonth,
    dateTo: today,
    status: "",
  });

  // ── KPI derived stats ───────────────────────────────────────────────────
  const kpiPresent = items.filter((i) => i.status === "Present").length;
  const kpiAbsent = items.filter((i) => i.status === "Absent").length;
  const kpiLate = items.filter((i) => i.status === "Late").length;
  const kpiAvgHours =
    items.length > 0
      ? (
          items.reduce((s, i) => s + Number(i.hoursWorked), 0) / items.length
        ).toFixed(1)
      : "0.0";

  // ── Pagination ─────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const paginated = items.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // ── Auto-calculation ──────────────────────────────────────────────────
  const recalculate = (
    checkIn: string,
    checkOut: string,
    breakMins: string,
    currentShiftStart: string | null,
    currentGrace: number,
  ) => {
    if (!checkIn || !checkOut || !form.workDate) {
      setForm((f) => ({
        ...f,
        hoursWorked: "0",
        overtimeHours: "0",
        lateMinutes: "0",
        isLate: false,
      }));
      return;
    }
    const inTime = new Date(`${form.workDate}T${checkIn}`).getTime();
    const outTime = new Date(`${form.workDate}T${checkOut}`).getTime();
    if (isNaN(inTime) || isNaN(outTime) || outTime <= inTime) {
      setForm((f) => ({
        ...f,
        hoursWorked: "0",
        overtimeHours: "0",
        lateMinutes: "0",
        isLate: false,
      }));
      return;
    }
    const totalMins = (outTime - inTime) / 60000;
    const breakM = parseFloat(breakMins) || 0;
    const workedMins = Math.max(0, totalMins - breakM);
    const workedHours = workedMins / 60;
    const otHours = Math.max(0, workedHours - 8);
    let lateMins = 0;
    let isLate = false;
    if (currentShiftStart) {
      const checkInTime = new Date(`${form.workDate}T${checkIn}`);
      const [sh, sm] = currentShiftStart.split(":").map(Number);
      const shiftDate = new Date(`${form.workDate}T${checkIn}`);
      shiftDate.setHours(sh, sm, 0, 0);
      const diffMins = (checkInTime.getTime() - shiftDate.getTime()) / 60000;
      lateMins = Math.max(0, Math.floor(diffMins - currentGrace));
      isLate = lateMins > 0;
    }
    setForm((f) => ({
      ...f,
      hoursWorked: workedHours.toFixed(2),
      overtimeHours: otHours.toFixed(2),
      lateMinutes: String(lateMins),
      isLate,
      status:
        f.status === "ToBeRegularized"
          ? isLate
            ? "Late"
            : "Present"
          : f.status,
    }));
  };

  // ── Data loaders ──────────────────────────────────────────────────────
  const load = async (f: AttendanceLogFilters = filters) => {
    setLoading(true);
    setCurrentPage(1);
    try {
      const params: Record<string, string> = {};
      if (f.employeeId) params.employeeId = f.employeeId;
      if (f.dateFrom) params.dateFrom = f.dateFrom;
      if (f.dateTo) params.dateTo = f.dateTo;
      if (f.status) params.status = f.status;
      const res = await api.get("/attendance-logs", { params });
      setItems(res.data);
    } catch (err:any){
      showError("Load failed", err?.response?.data?.error ?? "Could not fetch attendance logs.");
    } finally {
      setLoading(false);
    }
  };

  const loadGenLogs = async () => {
    setGenLoading(true);
    try {
      const res = await api.get("/attendance-generation/logs", {
        params: { limit: 10 },
      });
      setGenLogs(res.data);
    } catch (err:any) {
      showError("Load failed", err?.response?.data?.error ?? "Could not fetch generation logs.");
    } finally {
      setGenLoading(false);
    }
  };

  const loadEmployees = async () => {
    setEmpLoading(true);
    try {
      const res = await api.get("/employees", { params: { status: "Active" } });
      setEmployees(
        res.data.map(
          (e: {
            id: string;
            employeeCode: string;
            firstName: string;
            lastName: string;
          }) => ({
            id: String(e.id),
            employeeCode: e.employeeCode,
            firstName: e.firstName,
            lastName: e.lastName,
          }),
        ),
      );
    } catch (err:any){
      showError("Load failed", err?.response?.data?.error ?? "Could not fetch employee list.");
    } finally {
      setEmpLoading(false);
    }
  };

  const loadEmployeeShift = async (
    employeeId: string,
  ): Promise<{ start: string | null; grace: number }> => {
    try {
      const res = await api.get(`/shift-assignments?employeeId=${employeeId}`);
      const active = res.data?.find(
        (s: {
          isActive: boolean;
          shiftId: string;
          attendancePolicyId: string;
        }) => s.isActive,
      );
      if (!active) {
        setShiftStart(null);
        setGraceMinutes(0);
        return { start: null, grace: 0 };
      }
      const [shiftRes, policyRes] = await Promise.all([
        api.get(`/shift?id=${active.shiftId}`),
        active.attendancePolicyId
          ? api.get(`/attendance-policies?id=${active.attendancePolicyId}`)
          : Promise.resolve(null),
      ]);
      const shift = Array.isArray(shiftRes.data)
        ? shiftRes.data[0]
        : shiftRes.data;
      const policy = policyRes
        ? Array.isArray(policyRes.data)
          ? policyRes.data[0]
          : policyRes.data
        : null;
      const start = shift?.expectedStart ?? null;
      const grace = policy?.lateGraceMinutes ?? 0;
      setShiftStart(start);
      setGraceMinutes(grace);
      return { start, grace };
    } catch {
      setShiftStart(null);
      setGraceMinutes(0);
      return { start: null, grace: 0 };
    }
  };

  const loadPendingCount = async () => {
    try {
      const res = await api.get("/attendance-adjustments/pending-count", {
        params: { requestedBy: userId },
      });
      setPendingCount(canApprove ? res.data.forReview : res.data.myPending);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
    if (canRequestAdj || canApprove) loadPendingCount();
  }, []);

  // ── Dialog open ───────────────────────────────────────────────────────
  const openAdd = () => {
    setShiftStart(null);
    setGraceMinutes(0);
    setEditing(null);
    setForm(emptyForm());
    setEmpSearch("");
    setError("");
    setDialogOpen(true);
    if (employees.length === 0) loadEmployees();
  };

  const openEdit = async (item: AttendanceLog) => {
    setEditing(item);
    setEmpSearch("");
    setError("");
    const { start, grace } = await loadEmployeeShift(item.employeeId);
    const checkIn = item.checkIn
      ? new Date(item.checkIn).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    const checkOut = item.checkOut
      ? new Date(item.checkOut).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    let hoursWorked = String(item.hoursWorked);
    let overtimeHours = String(item.overtimeHours);
    let lateMinutes = String(item.lateMinutes);
    let isLate = item.isLate;
    if (checkIn && checkOut && item.workDate) {
      const inTime = new Date(`${item.workDate}T${checkIn}`).getTime();
      const outTime = new Date(`${item.workDate}T${checkOut}`).getTime();
      if (outTime > inTime) {
        const breakM = item.breakMinutes || 0;
        const workedMins = Math.max(0, (outTime - inTime) / 60000 - breakM);
        const workedHrs = workedMins / 60;
        hoursWorked = workedHrs.toFixed(2);
        overtimeHours = Math.max(0, workedHrs - 8).toFixed(2);
        if (start) {
          const checkInTime = new Date(`${item.workDate}T${checkIn}`);
          const [sh, sm] = start.split(":").map(Number);
          const shiftDate = new Date(`${item.workDate}T${checkIn}`);
          shiftDate.setHours(sh, sm, 0, 0);
          const diffMins =
            (checkInTime.getTime() - shiftDate.getTime()) / 60000;
          const lateMins = Math.max(0, Math.floor(diffMins - grace));
          lateMinutes = String(lateMins);
          isLate = lateMins > 0;
        }
      }
    }
    setForm({
      employeeId: item.employeeId,
      shiftId: item.shiftId ?? "",
      workDate: item.workDate,
      checkIn,
      checkOut,
      source: item.source,
      hoursWorked,
      overtimeHours,
      breakMinutes: String(item.breakMinutes),
      isLate,
      lateMinutes,
      status: item.status,
      adjustmentReason: item.adjustmentReason ?? "",
      notes: item.notes ?? "",
    });
    setDialogOpen(true);
    if (employees.length === 0) loadEmployees();
  };

  const openAdjustmentRequest = (item: AttendanceLog) => {
    setAdjTarget(item);
    setAdjForm({
      newCheckIn: item.checkIn
        ? new Date(item.checkIn).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      newCheckOut: item.checkOut
        ? new Date(item.checkOut).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      newStatus: item.status,
      newBreakMinutes: String(item.breakMinutes),
      reason: "",
    });
    setAdjError("");
    setAdjDialogOpen(true);
  };

  const handleAdjustmentRequest = async () => {
    if (!adjForm.reason.trim()) {
      setAdjError("Reason is required.");
      return;
    }
    if (!adjForm.newStatus) {
      setAdjError("Status is required.");
      return;
    }
    
    if (!userId) {
      setError("Session not fully loaded yet — please refresh and try again.");
      return;
    }
    setAdjSaving(true);
    try {
      await api.post("/attendance-adjustments/save", {
        action: "ADD",
        attendanceLogId: adjTarget?.id,
        reason: adjForm.reason,
        newCheckIn: toUTC(adjForm.newCheckIn, adjTarget?.workDate ?? ""),
        newCheckOut: toUTC(adjForm.newCheckOut, adjTarget?.workDate ?? ""),
        newStatus: adjForm.newStatus,
        newHoursWorked: 0,
        newBreakMinutes: parseFloat(adjForm.newBreakMinutes) || 0,
        requestedBy: userId,
      });
      setAdjDialogOpen(false);
      showSuccess(
        "Request submitted",
        "Adjustment request sent for supervisor approval.",
      );
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response
        ?.data?.error;
      if (msg?.includes("already exists")) {
        showError(
          "Pending request exists",
          "A pending adjustment request already exists for this record.",
        );
      } else {
        showError("Failed", msg ?? "Could not submit adjustment request.");
      }
    } finally {
      setAdjSaving(false);
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      empSearch === "" ||
      e.employeeCode.toLowerCase().includes(empSearch.toLowerCase()) ||
      `${e.firstName} ${e.lastName}`
        .toLowerCase()
        .includes(empSearch.toLowerCase()),
  );

  const selectedEmployee = employees.find((e) => e.id === form.employeeId);

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.employeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!form.workDate) {
      setError("Work date is required.");
      return;
    }
    
    if (!userId) {
      setError("Session not fully loaded yet — please refresh and try again.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/attendance-logs/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing ? editing.id : null,
        employeeId: form.employeeId,
        shiftId: form.shiftId || null,
        workDate: form.workDate,
        checkIn: toUTC(form.checkIn, form.workDate),
        checkOut: toUTC(form.checkOut, form.workDate),
        source: form.source,
        hoursWorked: parseFloat(form.hoursWorked) || 0,
        overtimeHours: parseFloat(form.overtimeHours) || 0,
        breakMinutes: parseFloat(form.breakMinutes) || 0,
        isLate: form.isLate,
        lateMinutes: parseInt(form.lateMinutes) || 0,
        preOtMinutes: parseInt(form.preOtMinutes) || 0,
        postOtMinutes: parseInt(form.postOtMinutes) || 0,
        earlyLeaveMinutes: parseInt(form.earlyLeaveMinutes) || 0,
        status: form.status,
        isAdjusted: !!editing,
        adjustmentReason: form.adjustmentReason || null,
        notes: form.notes || null,
        userId,
        manualOverride: form.manualOverride,
      });
      setDialogOpen(false);
      await load();
      showSuccess(
        editing ? "Log updated" : "Log added",
        editing
          ? "Attendance log updated successfully."
          : "Attendance log added successfully.",
      );
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response
        ?.data?.error;
      if (msg?.includes("already exists")) {
        showError(
          "Record exists",
          "An attendance log already exists for this date. Please find the existing record and edit it to regularize.",
        );
      } else if (msg?.includes("frozen") || msg?.includes("adjustment")) {
        showError(
          "Record frozen",
          "This attendance record is past the adjustment window and cannot be modified.",
        );
      } else {
        showError("Save failed", msg ?? "An unexpected error occurred.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const item = confirmDelete;
    if (!item) return;
    if (!userId) {
      showError("Session not fully loaded yet — please refresh and try again.");
      return;
    }
    setConfirmDelete(null);
    setDeleting(item.id);
    try {
      await api.post("/attendance-logs/save", {
        action: "DELETE",
        id: item.id,
        userId,
      });
      await load();
      showSuccess("Deleted", "Attendance log deleted.");
    } catch (err:any) {
      showError("Delete failed", err?.response?.data?.error ?? "Could not delete attendance log.");
    } finally {
      setDeleting(null);
    }
  };

  const openGenDialog = () => {
    setGenDialogOpen(true);
    loadGenLogs();
  };

  const handleRunGeneration = async () => {
    
    if (!userId) {
      setError("Session not fully loaded yet — please refresh and try again.");
      return;
    }
    setGenRunning(true);
    try {
      await api.post("/attendance-generation/run", {
        date: genDate,
        runBy: userId,
        runType: "Manual",
      });
      showSuccess(
        "Generation complete",
        `Attendance records generated for ${genDate}.`,
      );
      await loadGenLogs();
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response
        ?.data?.error;
      if (msg?.includes("already been completed")) {
        showError(
          "Already run",
          `Generation for ${genDate} has already been completed.`,
        );
      } else if (msg?.includes("already running")) {
        showError(
          "In progress",
          `Generation for ${genDate} is already running.`,
        );
      } else {
        showError("Generation failed", msg ?? "An unexpected error occurred.");
      }
    } finally {
      setGenRunning(false);
    }
  };

  // ── Badges ────────────────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Present: "xp-badge xp-badge-success",
      Absent: "xp-badge xp-badge-danger",
      Late: "xp-badge xp-badge-warning",
      HalfDay: "xp-badge xp-badge-info",
      OnLeave: "xp-badge xp-badge-neutral",
      Holiday: "xp-badge xp-badge-info",
      WeekOff: "xp-badge xp-badge-neutral",
      ToBeRegularized: "xp-badge xp-badge-warning",
      NoPay: "xp-badge xp-badge-danger",
    };
    return map[status] ?? "xp-badge xp-badge-neutral";
  };

  const genStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      Completed: "xp-badge xp-badge-success",
      Running: "xp-badge xp-badge-info",
      Failed: "xp-badge xp-badge-danger",
    };
    return map[status] ?? "xp-badge xp-badge-neutral";
  };

  const fmtTime = (dt: string | null) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fmtDateTime = (dt: string | null) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const toUTC = (timeStr: string | null, workDate: string): string | null => {
    if (!timeStr || !workDate) return null;
    return new Date(`${workDate}T${timeStr}`).toISOString();
  };

  const isFrozen = (workDate: string): boolean => {
    const days = Math.floor(
      (new Date().getTime() - new Date(workDate).getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return days > 3;
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold">Attendance Logs</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            View and manage employee attendance records
          </p>
        </div>
        <div className="flex gap-2">
          {(canRequestAdj || canApprove) && (
            <Button
              variant="default"
              icon={<ClipboardList size={16} />}
              onClick={() =>
                router.push("/transactions/attendance-adjustments")
              }
            >
              {canApprove ? "Pending Approvals" : "My Requests"}
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 dark:bg-red-500 text-white text-[11px] font-semibold rounded-full px-1 leading-none ring-1 ring-white/20">
                  {pendingCount}
                </span>
              )}
            </Button>
          )}
          {canViewGen && (
            <Button
              variant="default"
              icon={<RefreshCw size={16} />}
              onClick={openGenDialog}
            >
              Generate Attendance
            </Button>
          )}
          {canAdd && (
            <Button
              variant="solid"
              color="primary"
              icon={<Plus size={16} />}
              onClick={openAdd}
            >
              Add Log
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Present */}
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Clock
                size={20}
                className="text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Present</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                {loading ? (
                  <span className="text-base text-gray-400">—</span>
                ) : (
                  kpiPresent
                )}
              </p>
            </div>
          </div>
        </div>
        {/* Total Absent */}
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <UserX size={20} className="text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Absent</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                {loading ? (
                  <span className="text-base text-gray-400">—</span>
                ) : (
                  kpiAbsent
                )}
              </p>
            </div>
          </div>
        </div>
        {/* Late Arrivals */}
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <AlertTriangle
                size={20}
                className="text-orange-500 dark:text-orange-400"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Late Arrivals</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                {loading ? (
                  <span className="text-base text-gray-400">—</span>
                ) : (
                  kpiLate
                )}
              </p>
            </div>
          </div>
        </div>
        {/* Avg Work Hours */}
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Timer size={20} className="text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">
                Avg Work Hours
              </p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                {loading ? (
                  <span className="text-base text-gray-400">—</span>
                ) : (
                  `${kpiAvgHours}h`
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            {/* Employee search */}
            <div className="md:col-span-2 relative">
              <label className="form-label">Employee</label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  className="input input-md w-full pl-8"
                  placeholder="Search by name or code..."
                  value={filters.empSearch ?? ""}
                  onChange={(e) => {
                    setFilters((f) => ({
                      ...f,
                      empSearch: e.target.value,
                      employeeId: "",
                    }));
                    if (employees.length === 0) loadEmployees();
                  }}
                />
              </div>
              {filters.employeeId && (
                <div className="text-xs text-primary mt-0.5 font-medium">
                  ✓{" "}
                  {
                    employees.find((e) => e.id === filters.employeeId)
                      ?.firstName
                  }{" "}
                  {employees.find((e) => e.id === filters.employeeId)?.lastName}
                </div>
              )}
              {(filters.empSearch ?? "") && !filters.employeeId && (
                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {empLoading ? (
                    <div className="p-3 text-sm text-gray-400">Loading...</div>
                  ) : employees
                      .filter(
                        (e) =>
                          e.employeeCode
                            .toLowerCase()
                            .includes(
                              (filters.empSearch ?? "").toLowerCase(),
                            ) ||
                          `${e.firstName} ${e.lastName}`
                            .toLowerCase()
                            .includes((filters.empSearch ?? "").toLowerCase()),
                      )
                      .slice(0, 10).length === 0 ? (
                    <div className="p-3 text-sm text-gray-400">
                      No employees found
                    </div>
                  ) : (
                    employees
                      .filter(
                        (e) =>
                          e.employeeCode
                            .toLowerCase()
                            .includes(
                              (filters.empSearch ?? "").toLowerCase(),
                            ) ||
                          `${e.firstName} ${e.lastName}`
                            .toLowerCase()
                            .includes((filters.empSearch ?? "").toLowerCase()),
                      )
                      .slice(0, 10)
                      .map((e) => (
                        <button
                          key={e.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={() =>
                            setFilters((f) => ({
                              ...f,
                              employeeId: e.id,
                              empSearch: `${e.firstName} ${e.lastName}`,
                            }))
                          }
                        >
                          <span className="font-medium">
                            {e.firstName} {e.lastName}
                          </span>
                          <span className="text-gray-400 ml-2 text-xs">
                            {e.employeeCode}
                          </span>
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>

            {/* Date From */}
            <div>
              <label className="form-label">From</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                }
              />
            </div>

            {/* Date To */}
            <div>
              <label className="form-label">To</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, dateTo: e.target.value }))
                }
              />
            </div>

            {/* Status + Search btn */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="form-label">Status</label>
                <select
                  className="input input-md w-full"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, status: e.target.value }))
                  }
                >
                  <option value="">All statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="solid"
                  color="primary"
                  icon={<Search size={15} />}
                  onClick={() => load(filters)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Period Summary — shown when employee is selected */}
      {filters.employeeId &&
        items.length > 0 &&
        (() => {
          const present = items.filter((i) => i.status === "Present").length;
          const absent = items.filter((i) => i.status === "Absent").length;
          const late = items.filter((i) => i.status === "Late").length;
          const halfDay = items.filter((i) => i.status === "HalfDay").length;
          const onLeave = items.filter((i) => i.status === "OnLeave").length;
          const holiday = items.filter((i) => i.status === "Holiday").length;
          const weekOff = items.filter((i) => i.status === "WeekOff").length;
          const toReg = items.filter(
            (i) => i.status === "ToBeRegularized",
          ).length;
          const totalHours = items.reduce(
            (s, i) => s + Number(i.hoursWorked),
            0,
          );
          const totalOT = items.reduce(
            (s, i) => s + Number(i.overtimeHours),
            0,
          );
          const totalBreak = items.reduce(
            (s, i) => s + Number(i.breakMinutes),
            0,
          );
          const totalLate = items.reduce(
            (s, i) => s + Number(i.lateMinutes),
            0,
          );
          const empName = employees.find((e) => e.id === filters.employeeId);
          return (
            <div className="card mb-4">
              <div className="card-body">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h6 className="font-semibold text-sm">
                      Period Summary —{" "}
                      {empName
                        ? `${empName.firstName} ${empName.lastName}`
                        : ""}
                    </h6>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {filters.dateFrom} to {filters.dateTo} · {items.length}{" "}
                      records
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-9 gap-3 mb-4">
                  {[
                    {
                      label: "Present",
                      value: present,
                      cls: "text-emerald-600 dark:text-emerald-400",
                    },
                    { label: "Absent", value: absent, cls: "text-red-500" },
                    { label: "Late", value: late, cls: "text-orange-500" },
                    { label: "Half Day", value: halfDay, cls: "text-blue-500" },
                    { label: "On Leave", value: onLeave, cls: "text-gray-500" },
                    {
                      label: "Holiday",
                      value: holiday,
                      cls: "text-purple-500",
                    },
                    { label: "Week Off", value: weekOff, cls: "text-gray-400" },
                    { label: "To Reg.", value: toReg, cls: "text-yellow-500" },
                    {
                      label: "No Pay",
                      value: items.filter((i) => i.status === "NoPay").length,
                      cls: "text-red-600 dark:text-red-400",
                    },
                  ].map(({ label, value, cls }) => (
                    <div
                      key={label}
                      className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center"
                    >
                      <div className={`text-xl font-bold ${cls}`}>{value}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    {
                      label: "Working Hours",
                      value: `${totalHours.toFixed(1)}h`,
                      cls: "text-primary",
                    },
                    {
                      label: "Overtime Hours",
                      value: `${totalOT.toFixed(1)}h`,
                      cls: "text-orange-500",
                    },
                    {
                      label: "Break Time",
                      value: `${Math.round(totalBreak)}m`,
                      cls: "text-gray-500",
                    },
                    {
                      label: "Late Time",
                      value: `${Math.round(totalLate)}m`,
                      cls: "text-red-400",
                    },
                    {
                      label: "No Pay Hours",
                      value: `${items
                        .filter((i) => i.status === "NoPay")
                        .reduce((s, i) => s + Number(i.hoursWorked), 0)
                        .toFixed(1)}h`,
                      cls: "text-red-600",
                    },
                  ].map(({ label, value, cls }) => (
                    <div
                      key={label}
                      className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
                    >
                      <div className={`text-lg font-bold ${cls}`}>{value}</div>
                      <div className="text-xs text-gray-400">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Adjusted</th>
                    {(canEdit || canDelete) && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="text-center py-12 text-gray-400"
                      >
                        No attendance logs found for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item) => {
                      const name = item.employeeName ?? "";
                      const color = avatarColor(name);
                      const ini = initials(name);
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`flex-shrink-0 w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-semibold`}
                              >
                                {ini}
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {item.employeeName}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {item.employeeCode}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-sm tabular-nums">
                            {item.workDate}
                          </td>
                          <td className="text-sm tabular-nums">
                            {fmtTime(item.checkIn)}
                          </td>
                          <td className="text-sm tabular-nums">
                            {fmtTime(item.checkOut)}
                          </td>
                          <td>
                            <div className="text-sm font-medium tabular-nums">
                              {item.hoursWorked}h
                            </div>
                            {item.overtimeHours > 0 && (
                              <div className="text-xs text-orange-500 tabular-nums">
                                +{item.overtimeHours}h OT
                              </div>
                            )}
                            {(item.preOtMinutes > 0 ||
                              item.postOtMinutes > 0) && (
                              <div className="text-xs text-amber-500 tabular-nums">
                                {item.preOtMinutes > 0 &&
                                  `${item.preOtMinutes}m pre`}
                                {item.preOtMinutes > 0 &&
                                  item.postOtMinutes > 0 &&
                                  " / "}
                                {item.postOtMinutes > 0 &&
                                  `${item.postOtMinutes}m post`}
                              </div>
                            )}
                            {item.earlyLeaveMinutes > 0 && (
                              <div className="text-xs text-rose-500 tabular-nums">
                                {item.earlyLeaveMinutes}m early leave
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={statusBadge(item.status)}>
                              {item.status}
                            </span>
                            {item.isLate && item.lateMinutes > 0 && (
                              <div className="text-xs text-orange-500 mt-0.5 tabular-nums">
                                {item.lateMinutes}m late
                              </div>
                            )}
                          </td>
                          <td className="text-sm text-gray-500">
                            {item.source}
                          </td>
                          <td>
                            {item.isAdjusted ? (
                              <span className="xp-badge xp-badge-warning">
                                Yes
                              </span>
                            ) : (
                              <span className="xp-badge xp-badge-neutral">
                                No
                              </span>
                            )}
                          </td>
                          {(canEdit || canDelete) && (
                            <td>
                              <div className="flex gap-1">
                                {canEdit &&
                                  item.status === "ToBeRegularized" &&
                                  (isFrozen(item.workDate) ? (
                                    <button
                                      className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed"
                                      title="Record is frozen — adjustment window has passed"
                                      disabled
                                    >
                                      <Lock size={15} />
                                    </button>
                                  ) : (
                                    <button
                                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                                      onClick={() => openEdit(item)}
                                      title="Edit"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  ))}
                                {canRequestAdj &&
                                  item.status !== "ToBeRegularized" && (
                                    <button
                                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
                                      onClick={() =>
                                        openAdjustmentRequest(item)
                                      }
                                      title="Request Adjustment"
                                    >
                                      <FileEdit size={15} />
                                    </button>
                                  )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination footer */}
              {items.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                    {Math.min(currentPage * PAGE_SIZE, items.length)} of{" "}
                    {items.length} records
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {buildPages(currentPage, totalPages).map((p, i) =>
                      p === "…" ? (
                        <span
                          key={`ell-${i}`}
                          className="px-2 text-gray-400 text-sm"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === p
                              ? "bg-primary text-white"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                          }`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                    <button
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
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
        width={600}
      >
        <h5 className="mb-4 font-semibold">
          {editing ? "Edit Attendance Log" : "Add Attendance Log"}
        </h5>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="form-label">
              Employee <span className="text-red-500">*</span>
            </label>
            {editing ? (
              <Input
                value={`${editing.employeeName} (${editing.employeeCode})`}
                disabled
              />
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search by name or code..."
                  value={empSearch}
                  onChange={(e) => {
                    setEmpSearch(e.target.value);
                    if (form.employeeId)
                      setForm((f) => ({ ...f, employeeId: "" }));
                  }}
                />
                {form.employeeId && selectedEmployee && (
                  <div className="mt-1 text-sm text-primary font-medium">
                    ✓ {selectedEmployee.firstName} {selectedEmployee.lastName} (
                    {selectedEmployee.employeeCode})
                    {shiftStart && (
                      <span className="ml-2 text-gray-400 text-xs font-normal">
                        Shift: {shiftStart}
                      </span>
                    )}
                  </div>
                )}
                {empSearch && !form.employeeId && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {empLoading ? (
                      <div className="p-3 text-sm text-gray-400">
                        Loading...
                      </div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className="p-3 text-sm text-gray-400">
                        No employees found
                      </div>
                    ) : (
                      filteredEmployees.slice(0, 10).map((e) => (
                        <button
                          key={e.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                          onClick={async () => {
                            setForm((f) => ({ ...f, employeeId: e.id }));
                            setEmpSearch(`${e.firstName} ${e.lastName}`);
                            await loadEmployeeShift(e.id);
                          }}
                        >
                          <span className="font-medium">
                            {e.firstName} {e.lastName}
                          </span>
                          <span className="text-gray-400 ml-2">
                            {e.employeeCode}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="form-label">
              Work Date <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={form.workDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, workDate: e.target.value }))
              }
              disabled={!!editing}
            />
          </div>

          <div>
            <label className="form-label">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              className="input input-md w-full"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Check In</label>
            <Input
              type="time"
              value={form.checkIn}
              onChange={(e) => {
                setForm((f) => ({ ...f, checkIn: e.target.value }));
                recalculate(
                  e.target.value,
                  form.checkOut,
                  form.breakMinutes,
                  shiftStart,
                  graceMinutes,
                );
              }}
            />
          </div>

          <div>
            <label className="form-label">Check Out</label>
            <Input
              type="time"
              value={form.checkOut}
              onChange={(e) => {
                setForm((f) => ({ ...f, checkOut: e.target.value }));
                recalculate(
                  form.checkIn,
                  e.target.value,
                  form.breakMinutes,
                  shiftStart,
                  graceMinutes,
                );
              }}
            />
          </div>

          <div>
            <label className="form-label">Source</label>
            <select
              className="input input-md w-full"
              value={form.source}
              disabled
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Break Minutes</label>
            <Input
              type="number"
              min="0"
              value={form.breakMinutes}
              onChange={(e) => {
                setForm((f) => ({ ...f, breakMinutes: e.target.value }));
                recalculate(
                  form.checkIn,
                  form.checkOut,
                  e.target.value,
                  shiftStart,
                  graceMinutes,
                );
              }}
            />
          </div>

          <div>
            <label className="form-label">Hours Worked</label>
            <div className="input input-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed">
              {form.hoursWorked}h
            </div>
          </div>

          <div>
            <label className="form-label">Overtime Hours</label>
            <div className="input input-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed">
              {form.overtimeHours}h
            </div>
          </div>

          <div>
            <label className="form-label">Pre OT (minutes)</label>
            <div className="input input-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed">
              {form.preOtMinutes}m
            </div>
          </div>

          <div>
            <label className="form-label">Post OT (minutes)</label>
            <div className="input input-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed">
              {form.postOtMinutes}m
            </div>
          </div>

          <div>
            <label className="form-label">Early Leave (minutes)</label>
            <div className="input input-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed">
              {form.earlyLeaveMinutes}m
            </div>
          </div>

          <div>
            <label className="form-label">Late Minutes</label>
            <div className="input input-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed">
              {form.lateMinutes}m
            </div>
          </div>

          <div className="flex items-center gap-3 pt-5">
            <span
              className={
                form.isLate
                  ? "xp-badge xp-badge-warning"
                  : "xp-badge xp-badge-neutral"
              }
            >
              {form.isLate ? "Late" : "On Time"}
            </span>
            <label className="form-label mb-0">Late Status</label>
          </div>

          <div className="col-span-2 flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 mt-2">
            <span className="text-sm font-medium flex-1">
              Manual Override
              <span className="block text-xs text-gray-400 font-normal">
                Type exact values instead of using the calculated Pre/Post OT,
                Late, and Hours figures above. Requires a reason.
              </span>
            </span>
            <Switcher
              checked={form.manualOverride}
              onChange={(val) =>
                setForm((f) => ({ ...f, manualOverride: val }))
              }
            />
          </div>
        </div>

        {editing && (
          <div className="mt-4">
            <label className="form-label">Adjustment Reason</label>
            <Input
              value={form.adjustmentReason}
              onChange={(e) =>
                setForm((f) => ({ ...f, adjustmentReason: e.target.value }))
              }
              placeholder="Reason for adjustment"
            />
          </div>
        )}

        <div className="mt-4">
          <label className="form-label">Notes</label>
          <Input
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Optional notes"
          />
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            loading={saving}
            onClick={handleSave}
          >
            {editing ? "Update" : "Add"}
          </Button>
        </div>
      </Dialog>

      {/* Generation Dialog */}
      <Dialog
        isOpen={genDialogOpen}
        onClose={() => setGenDialogOpen(false)}
        width={800}
      >
        <h5 className="mb-1 font-semibold">Generate Daily Attendance</h5>
        <p className="text-sm text-gray-500 mb-4">
          Automatically creates attendance records for all active employees
          based on biometric data, leave records, and shift schedules.
        </p>
        <div className="flex gap-3 items-end mb-6">
          <div className="flex-1">
            <label className="form-label">Date to Generate</label>
            <Input
              type="date"
              value={genDate}
              max={today}
              onChange={(e) => setGenDate(e.target.value)}
            />
          </div>
          {canRunGen && (
            <Button
              variant="solid"
              color="primary"
              icon={<Play size={15} />}
              loading={genRunning}
              onClick={() => setConfirmGen(true)}
            >
              Run Generation
            </Button>
          )}
        </div>
        <div>
          <div className="flex justify-between items-center mb-3">
            <h6 className="font-medium text-sm">Recent Runs</h6>
            <button
              className="text-xs text-primary hover:underline"
              onClick={loadGenLogs}
            >
              Refresh
            </button>
          </div>
          {genLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : genLogs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No generation runs yet.
            </p>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-72">
              <table className="table-default w-full text-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Skipped</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {genLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.runDate}</td>
                      <td>{log.runType}</td>
                      <td>
                        <span className={genStatusBadge(log.status)}>
                          {log.status}
                        </span>
                      </td>
                      <td>{log.recordsCreated}</td>
                      <td>{log.recordsSkipped}</td>
                      <td className="text-gray-400">
                        {fmtDateTime(log.startedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <Button variant="plain" onClick={() => setGenDialogOpen(false)}>
            Close
          </Button>
        </div>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        variant="warning"
        title="Delete Attendance Log"
        message={
          confirmDelete
            ? `Are you sure you want to delete the attendance log for ${confirmDelete.employeeName} on ${confirmDelete.workDate}? This action cannot be undone.`
            : ""
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        loading={!!deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Run generation confirmation */}
      <ConfirmDialog
        open={confirmGen}
        variant="warning"
        title="Run Attendance Generation"
        message={`This will auto-generate attendance records for all active employees on ${genDate}. Records already created will be skipped. This action cannot be undone.`}
        confirmLabel="Yes, Run"
        cancelLabel="Cancel"
        loading={genRunning}
        onConfirm={() => {
          setConfirmGen(false);
          handleRunGeneration();
        }}
        onCancel={() => setConfirmGen(false)}
      />

      {/* Request Adjustment Dialog */}
      <Dialog
        isOpen={adjDialogOpen}
        onClose={() => setAdjDialogOpen(false)}
        width={560}
      >
        <h5 className="mb-1 font-semibold">Request Attendance Adjustment</h5>
        <p className="text-sm text-gray-400 mb-4">
          {adjTarget?.employeeName} · {adjTarget?.workDate}
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="form-label">New Check In</label>
            <Input
              type="time"
              value={adjForm.newCheckIn}
              onChange={(e) =>
                setAdjForm((f) => ({ ...f, newCheckIn: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="form-label">New Check Out</label>
            <Input
              type="time"
              value={adjForm.newCheckOut}
              onChange={(e) =>
                setAdjForm((f) => ({ ...f, newCheckOut: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="form-label">
              New Status <span className="text-red-500">*</span>
            </label>
            <select
              className="input input-md w-full"
              value={adjForm.newStatus}
              onChange={(e) =>
                setAdjForm((f) => ({ ...f, newStatus: e.target.value }))
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Break Minutes</label>
            <Input
              type="number"
              min="0"
              value={adjForm.newBreakMinutes}
              onChange={(e) =>
                setAdjForm((f) => ({ ...f, newBreakMinutes: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="form-label">
            Reason <span className="text-red-500">*</span>
          </label>
          <Input
            value={adjForm.reason}
            onChange={(e) =>
              setAdjForm((f) => ({ ...f, reason: e.target.value }))
            }
            placeholder="Explain why this adjustment is needed..."
          />
        </div>
        {adjError && <p className="text-red-500 text-sm mb-3">{adjError}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="plain" onClick={() => setAdjDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            loading={adjSaving}
            onClick={handleAdjustmentRequest}
          >
            Submit Request
          </Button>
        </div>
      </Dialog>
    </div>
  );
}