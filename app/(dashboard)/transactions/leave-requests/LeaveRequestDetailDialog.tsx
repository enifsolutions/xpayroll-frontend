"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { showError } from "@/lib/toast";
import { statusBadgeClass, statusLabel } from "@/utils/leaveRequestUtils";
import type { LeaveRequest } from "@/types/leaveRequest.types";

interface LeaveBalance {
  leaveTypeId: string;
  entitled: number;
  used: number;
  carriedForward: number;
  remaining: number;
}

interface AuditEntry {
  id: string;
  action: string;
  actionByName: string | null;
  actionAt: string;
  notes: string | null;
}

interface Props {
  item: LeaveRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onActionDone: () => void;
}

const ACTION_COLORS: Record<string, string> = {
  ADD: "bg-gray-400",
  APPROVE: "bg-green-500",
  SUPERVISOR_APPROVE: "bg-blue-500",
  REJECT: "bg-red-500",
  CANCEL: "bg-gray-500",
  REVOKE: "bg-orange-500",
};

const ACTION_LABELS: Record<string, string> = {
  ADD: "Applied",
  APPROVE: "Approved",
  SUPERVISOR_APPROVE: "Supervisor Approved",
  REJECT: "Rejected",
  CANCEL: "Cancelled",
  REVOKE: "Revoked",
};

export default function LeaveRequestDetailDialog({
  item,
  isOpen,
  onClose,
  onActionDone,
}: Props) {
  const actionBy = useAuthStore((s) => s.user?.userId);

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loadingBal, setLoadingBal] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [actionMode, setActionMode] = useState<
    "APPROVE" | "SUPERVISOR_APPROVE" | "REJECT" | "REVOKE" | null
  >(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item || !isOpen) return;
    setActionMode(null);
    setReason("");

    // Load balance
    setLoadingBal(true);
    const year = new Date(item.createdAt).getFullYear();
    api
      .get("/employee-leave-balances", {
        params: { employeeId: item.employeeId, year },
      })
      .then((res) =>
        setBalances(
          res.data.map((b: any) => ({
            leaveTypeId: String(b.leaveTypeId),
            entitled: b.entitled,
            used: b.used,
            carriedForward: b.carriedForward,
            remaining: b.remaining,
          })),
        ),
      )
      .catch(() => {})
      .finally(() => setLoadingBal(false));

    // Load audit log
    setLoadingAudit(true);
    api
      .get(`/leave-requests/${item.id}/audit`)
      .then((res) =>
        setAudit(
          res.data.map((a: any) => ({
            id: String(a.id),
            action: a.action,
            actionByName: a.actionByName,
            actionAt: a.actionAt,
            notes: a.notes,
          })),
        ),
      )
      .catch(() => {})
      .finally(() => setLoadingAudit(false));
  }, [item, isOpen]);

  async function handleAction() {
    if (!item || !actionMode) return;
    if ((actionMode === "REJECT" || actionMode === "REVOKE") && !reason.trim())
      return;
    if (!actionBy) {
      showError("Session Error", "Please refresh and try again.");
      return;
    }
    setSaving(true);
    try {
      if (actionMode === "REVOKE") {
        await api.post("/leave-requests/revoke", {
          id: item.id,
          reason,
          actionBy,
        });
      } else {
        await api.post("/leave-requests/approve", {
          id: item.id,
          action: actionMode,
          rejectionReason: reason || null,
          actionBy,
        });
      }
      onClose();
      onActionDone();
    } catch (e: any) {
      showError(
        "Action Failed",
        e?.response?.data?.message ?? e?.response?.data?.error ?? "Could not process this request. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!item) return null;

  const thisBalance = balances.find(
    (b) => b.leaveTypeId === String(item.leaveTypeId),
  );
  const canApprove =
    item.status === "Pending" || item.status === "SupervisorApproved";
  const canReject =
    item.status === "Pending" || item.status === "SupervisorApproved";
  const canRevoke = item.status === "Approved";

  function DonutChart({
    used,
    remaining,
    entitled,
  }: {
    used: number;
    remaining: number;
    entitled: number;
  }) {
    const total = entitled || 1;
    const r = 36;
    const circ = 2 * Math.PI * r;
    const usedDash = Math.min(used / total, 1) * circ;
    const remDash = Math.min(remaining / total, 1) * circ;
    return (
      <div className="flex items-center gap-4">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="12"
          />
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke="var(--color-primary,#6366f1)"
            strokeWidth="12"
            strokeDasharray={`${remDash} ${circ}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform="rotate(-90 48 48)"
          />
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke="#fbbf24"
            strokeWidth="12"
            strokeDasharray={`${usedDash} ${circ}`}
            strokeDashoffset={-remDash}
            strokeLinecap="round"
            transform="rotate(-90 48 48)"
          />
          <text
            x="48"
            y="44"
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill="currentColor"
          >
            {remaining}
          </text>
          <text x="48" y="57" textAnchor="middle" fontSize="9" fill="gray">
            left
          </text>
        </svg>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
            <span className="text-gray-500">Remaining</span>
            <span className="font-semibold ml-2">{remaining}d</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span className="text-gray-500">Used</span>
            <span className="font-semibold ml-2">{used}d</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />
            <span className="text-gray-500">Entitled</span>
            <span className="font-semibold ml-2">{entitled}d</span>
          </div>
        </div>
      </div>
    );
  }

  const requestedDate = new Date(item.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Dialog isOpen={isOpen} onClose={onClose} onRequestClose={onClose}>
      <h5 className="mb-5">Leave Request Details</h5>

      <div className="space-y-5">
        {/* Employee & Request Info */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Employee</p>
            <p className="font-semibold">{item.employeeName}</p>
            <p className="text-gray-400 text-xs">
              {item.employeeCode} · {item.department}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Employee ID</p>
            <p className="font-mono text-xs">{item.employeeId}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Leave Type</p>
            <p className="font-medium">{item.leaveTypeName}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Status</p>
            <span className={statusBadgeClass(item.status)}>
              {statusLabel(item.status)}
            </span>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">From</p>
            <p className="font-medium">{item.fromDate}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">To</p>
            <p className="font-medium">{item.toDate}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Days Requested</p>
            <p className="font-medium">
              {item.days} day{item.days !== 1 ? "s" : ""}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Requested On</p>
            <p className="font-medium">{requestedDate}</p>
          </div>
          {item.reason && (
            <div className="col-span-2">
              <p className="text-gray-400 text-xs mb-0.5">Reason</p>
              <p>{item.reason}</p>
            </div>
          )}
        </div>

        {/* Covering Employee */}
        {(item as any).coveringEmployeeName && (
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm">
            <p className="text-gray-400 text-xs mb-0.5">Covering Employee</p>
            <p className="font-semibold text-blue-700 dark:text-blue-300">
              {(item as any).coveringEmployeeName}
            </p>
          </div>
        )}

        {/* Leave Balance */}
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
            Leave Balance — {new Date(item.createdAt).getFullYear()}
          </p>
          {loadingBal ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : thisBalance ? (
            <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4">
              <DonutChart
                used={thisBalance.used}
                remaining={thisBalance.remaining}
                entitled={thisBalance.entitled + thisBalance.carriedForward}
              />
              {thisBalance.carriedForward > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Includes {thisBalance.carriedForward}d carried forward
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">
              No leave balance record found.
            </p>
          )}
        </div>

        {/* Audit Timeline */}
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
            Activity Log
          </p>
          {loadingAudit ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : audit.length === 0 ? (
            <p className="text-sm text-gray-400 italic">
              No activity recorded.
            </p>
          ) : (
            <div className="relative max-h-48 overflow-y-auto pr-1">
              {/* Vertical line */}
              <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-4">
                {audit.map((entry) => (
                  <div key={entry.id} className="flex gap-4 relative">
                    {/* Dot */}
                    <div
                      className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center z-10 ${ACTION_COLORS[entry.action] ?? "bg-gray-400"}`}
                    >
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(entry.actionAt).toLocaleString()}
                        </span>
                      </div>
                      {entry.actionByName && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          by {entry.actionByName}
                        </p>
                      )}
                      {entry.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                          "{entry.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reason input for reject/revoke */}
        {(actionMode === "REJECT" || actionMode === "REVOKE") && (
          <div>
            <label className="form-label">
              {actionMode === "REVOKE" ? "Revoke Reason" : "Rejection Reason"}
              <span className="text-error"> *</span>
            </label>
            <textarea
              className="input w-full"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                actionMode === "REVOKE"
                  ? "Enter reason for revoking approval..."
                  : "Enter reason for rejection..."
              }
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-5">
        <div className="flex gap-2">
          {!actionMode && (
            <>
              {canApprove && (
                <Button
                  size="sm"
                  variant="solid"
                  onClick={() => setActionMode("APPROVE")}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
              )}
              {canReject && (
                <Button
                  size="sm"
                  variant="solid"
                  onClick={() => setActionMode("REJECT")}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Reject
                </Button>
              )}
              {canRevoke && (
                <Button
                  size="sm"
                  variant="solid"
                  onClick={() => setActionMode("REVOKE")}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Revoke
                </Button>
              )}
            </>
          )}
          {actionMode && (
            <>
              <Button
                size="sm"
                variant="solid"
                loading={saving}
                onClick={handleAction}
                disabled={
                  (actionMode === "REJECT" || actionMode === "REVOKE") &&
                  !reason.trim()
                }
                className={
                  actionMode === "REJECT"
                    ? "bg-red-500 hover:bg-red-600"
                    : actionMode === "REVOKE"
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-green-600 hover:bg-green-700"
                }
              >
                {actionMode === "REJECT"
                  ? "Confirm Reject"
                  : actionMode === "REVOKE"
                    ? "Confirm Revoke"
                    : "Confirm Approve"}
              </Button>
              <Button
                size="sm"
                variant="plain"
                onClick={() => {
                  setActionMode(null);
                  setReason("");
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </div>
        <Button variant="plain" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}
