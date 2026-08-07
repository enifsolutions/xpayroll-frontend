"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { Permissions } from "@/lib/permissions";
import { CheckCircle2, XCircle, RefreshCw, Inbox } from "lucide-react";

interface PendingApproval {
  id: string;
  applicationId: string;
  candidateName: string;
  requisitionTitle: string;
  designationTitle: string;
  branchName: string | null;
  salaryOffered: number;
  startDate: string;
  createdAt: string;
  createdByName: string | null;
}

export default function OfferApprovalsPage() {
  useRequirePermission(Permissions.Recruitment.Offer.Approve);

  const router = useRouter();
  const initialized = useRef(false);
  const [items, setItems] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);

  const [rejectTarget, setRejectTarget] = useState<PendingApproval | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<PendingApproval[]>("/offers/pending-approvals");
      setItems(res.data ?? []);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.message ?? "Could not load pending approvals.",
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

  async function handleApprove(item: PendingApproval) {
    try {
      setApprovingId(item.id);
      await api.post("/offers/save", { id: item.id, action: "APPROVE" });
      await load();
      showSuccess("Approved", `Offer for ${item.candidateName} approved.`);
    } catch (err: any) {
      showError(
        "Approve failed",
        err?.response?.data?.message ?? "Could not approve the offer.",
      );
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget || !rejectionReason.trim()) {
      showError("Missing reason", "A rejection reason is required.");
      return;
    }
    try {
      setRejecting(true);
      await api.post("/offers/save", {
        id: rejectTarget.id,
        action: "REJECT",
        rejectionReason,
      });
      setRejectTarget(null);
      setRejectionReason("");
      await load();
      showSuccess(
        "Rejected",
        `Offer for ${rejectTarget.candidateName} rejected.`,
      );
    } catch (err: any) {
      showError(
        "Reject failed",
        err?.response?.data?.message ?? "Could not reject the offer.",
      );
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Offer Approvals
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Offers awaiting your sign-off before they can be sent.
          </p>
        </div>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500"
          title="Refresh"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Inbox size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No offers waiting on your approval.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Position</th>
                    <th>Branch</th>
                    <th>Salary</th>
                    <th>Start Date</th>
                    <th>Submitted By</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          onClick={() =>
                            router.push(
                              `/recruitment/pipeline?applicationId=${item.applicationId}`,
                            )
                          }
                          className="font-semibold text-gray-900 dark:text-white text-sm text-left hover:text-violet-500"
                        >
                          {item.candidateName}
                        </button>
                        <p className="text-xs text-gray-400">
                          {item.requisitionTitle}
                        </p>
                      </td>
                      <td className="text-sm">{item.designationTitle}</td>
                      <td className="text-sm text-gray-500 dark:text-gray-400">
                        {item.branchName ?? "—"}
                      </td>
                      <td className="text-sm">
                        {item.salaryOffered.toLocaleString()}
                      </td>
                      <td className="text-sm">
                        {new Date(item.startDate).toLocaleDateString()}
                      </td>
                      <td className="text-sm text-gray-500 dark:text-gray-400">
                        {item.createdByName ?? "—"}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleApprove(item)}
                            disabled={approvingId === item.id}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                          <button
                            onClick={() => setRejectTarget(item)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
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
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onRequestClose={() => setRejectTarget(null)}
        width={420}
      >
        <h5>Reject Offer</h5>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
          {rejectTarget?.candidateName} — {rejectTarget?.designationTitle}
        </p>
        <label className="form-label">Rejection Reason</label>
        <textarea
          className="input w-full resize-none"
          rows={3}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="default" onClick={() => setRejectTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            loading={rejecting}
            className="bg-red-500 hover:bg-red-600 text-white border-red-500"
            onClick={handleReject}
          >
            Reject
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
