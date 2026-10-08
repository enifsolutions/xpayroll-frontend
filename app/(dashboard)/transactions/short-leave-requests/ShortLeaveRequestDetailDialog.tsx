"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { showError } from "@/lib/toast";
import { statusBadgeClass, statusLabel, formatTimeRange } from "@/utils/shortLeaveRequestUtils";
import type { ShortLeaveRequest } from "@/types/shortLeaveRequest.types";

interface AuditEntry {
  id: string;
  action: string;
  actionByName: string | null;
  actionAt: string;
  notes: string | null;
}

interface Props {
  item: ShortLeaveRequest | null;
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
  CONVERSION_APPROVED: "bg-violet-500",
  CONVERSION_REJECTED: "bg-violet-500",
  CONVERSION_REVOKED: "bg-violet-500",
};

const ACTION_LABELS: Record<string, string> = {
  ADD: "Applied",
  APPROVE: "Approved",
  SUPERVISOR_APPROVE: "Supervisor Approved",
  REJECT: "Rejected",
  CANCEL: "Cancelled",
  CONVERSION_APPROVED: "Linked Leave Approved",
  CONVERSION_REJECTED: "Linked Leave Rejected",
  CONVERSION_REVOKED: "Linked Leave Revoked",
};

export default function ShortLeaveRequestDetailDialog({ item, isOpen, onClose, onActionDone }: Props) {
  const actionBy = useAuthStore((s) => s.user?.userId);

  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [actionMode, setActionMode] = useState<"APPROVE" | "REJECT" | "CANCEL" | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item || !isOpen) return;
    setActionMode(null);
    setReason("");

    setLoadingAudit(true);
    api
      .get(`/short-leave-requests/${item.id}/audit`)
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
    if (actionMode === "REJECT" && !reason.trim()) return;
    if (!actionBy) {
      showError("Session Error", "Please refresh and try again.");
      return;
    }
    setSaving(true);
    try {
      if (actionMode === "APPROVE") {
        await api.post("/short-leave-requests/approve", { id: item.id });
      } else if (actionMode === "REJECT") {
        await api.post("/short-leave-requests/reject", { id: item.id, rejectionReason: reason });
      } else if (actionMode === "CANCEL") {
        await api.post("/short-leave-requests/cancel", { id: item.id, cancellationReason: reason || null });
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

  const canApprove = item.status === "Pending" || item.status === "SupervisorApproved";
  const canReject = item.status === "Pending" || item.status === "SupervisorApproved";
  const canCancel = item.status === "Pending" || item.status === "SupervisorApproved";

  const requestedDate = new Date(item.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <Dialog isOpen={isOpen} onClose={onClose} onRequestClose={onClose}>
      <h5 className="mb-5">Short Leave Request Details</h5>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Employee</p>
            <p className="font-semibold">{item.employeeName}</p>
            <p className="text-gray-400 text-xs">
              {item.employeeCode}{item.department ? ` · ${item.department}` : ""}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Employee ID</p>
            <p className="font-mono text-xs">{item.employeeId}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Status</p>
            <span className={statusBadgeClass(item.status)}>{statusLabel(item.status)}</span>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Duration</p>
            <p className="font-medium">{item.minutes} min</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Date</p>
            <p className="font-medium">{item.leaveDate}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Time Window</p>
            <p className="font-medium">{formatTimeRange(item.fromTime, item.toTime)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Applied By</p>
            <p className="font-medium">{item.appliedByName ?? "—"}</p>
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
          {item.rejectionReason && (
            <div className="col-span-2">
              <p className="text-gray-400 text-xs mb-0.5">Rejection Reason</p>
              <p>{item.rejectionReason}</p>
            </div>
          )}
          {item.cancellationReason && (
            <div className="col-span-2">
              <p className="text-gray-400 text-xs mb-0.5">Cancellation Reason</p>
              <p>{item.cancellationReason}</p>
            </div>
          )}
        </div>

        {item.convertedLeaveRequestId && (
          <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 px-4 py-3 text-sm">
            <p className="text-gray-400 text-xs mb-0.5">Converted to Half-Day Leave</p>
            <p className="font-semibold text-violet-700 dark:text-violet-300">
              This request exceeded quota or duration limits and was auto-converted to a half-day leave
              (Request #{item.convertedLeaveRequestId}). This short leave stays in its current status until
              the linked leave request completes its own approval chain.
            </p>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Activity Log</p>
          {loadingAudit ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : audit.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No activity recorded.</p>
          ) : (
            <div className="relative max-h-48 overflow-y-auto pr-1">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-4">
                {audit.map((entry) => (
                  <div key={entry.id} className="flex gap-4 relative">
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center z-10 ${ACTION_COLORS[entry.action] ?? "bg-gray-400"}`}>
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                        <span className="text-xs text-gray-400">{new Date(entry.actionAt).toLocaleString()}</span>
                      </div>
                      {entry.actionByName && <p className="text-xs text-gray-500 mt-0.5">by {entry.actionByName}</p>}
                      {entry.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">"{entry.notes}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {(actionMode === "REJECT" || actionMode === "CANCEL") && (
          <div>
            <label className="form-label">
              {actionMode === "CANCEL" ? "Cancellation Reason" : "Rejection Reason"}
              {actionMode === "REJECT" && <span className="text-error"> *</span>}
            </label>
            <textarea
              className="input w-full"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={actionMode === "CANCEL" ? "Optional — why is this being cancelled…" : "Enter reason for rejection..."}
              autoFocus
            />
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-5">
        <div className="flex gap-2">
          {!actionMode && (
            <>
              {canApprove && (
                <Button size="sm" variant="solid" onClick={() => setActionMode("APPROVE")} className="bg-green-600 hover:bg-green-700">
                  Approve
                </Button>
              )}
              {canReject && (
                <Button size="sm" variant="solid" onClick={() => setActionMode("REJECT")} className="bg-red-500 hover:bg-red-600">
                  Reject
                </Button>
              )}
              {canCancel && (
                <Button size="sm" variant="solid" onClick={() => setActionMode("CANCEL")} className="bg-gray-500 hover:bg-gray-600">
                  Cancel Request
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
                disabled={actionMode === "REJECT" && !reason.trim()}
                className={
                  actionMode === "REJECT" ? "bg-red-500 hover:bg-red-600"
                  : actionMode === "CANCEL" ? "bg-gray-500 hover:bg-gray-600"
                  : "bg-green-600 hover:bg-green-700"
                }
              >
                {actionMode === "REJECT" ? "Confirm Reject" : actionMode === "CANCEL" ? "Confirm Cancel" : "Confirm Approve"}
              </Button>
              <Button size="sm" variant="plain" onClick={() => { setActionMode(null); setReason(""); }}>
                Cancel
              </Button>
            </>
          )}
        </div>
        <Button variant="plain" onClick={onClose}>Close</Button>
      </div>
    </Dialog>
  );
}
