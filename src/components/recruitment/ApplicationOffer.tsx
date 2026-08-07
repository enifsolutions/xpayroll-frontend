"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import { showSuccess, showError } from "@/lib/toast";
import api from "@/lib/axios";
import { Permissions } from "@/lib/permissions";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import {
  FileText,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
  UserPlus,
  Download,
  History,
} from "lucide-react";
import OfferIntelligencePanel from "./OfferIntelligencePanel";

// ============================================================================
// Types
// ============================================================================

type OfferStatus =
  | "Draft"
  | "PendingApproval"
  | "Approved"
  | "Rejected"
  | "Sent"
  | "Accepted"
  | "Declined"
  | "Expired"
  | "Withdrawn";

interface Offer {
  id: string;
  applicationId: string;
  candidateId: string;
  candidateName: string;
  requisitionTitle: string;
  designationId: string;
  designationTitle: string;
  branchId: string | null;
  branchName: string | null;
  salaryOffered: number;
  benefits: string | null;
  startDate: string;
  status: OfferStatus;
  requiresApproval: boolean;
  approvedByName: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  expiryDate: string | null;
  sentAt: string | null;
  pdfFilePath: string | null;
  negotiationNotes: string | null;
  respondedAt: string | null;
  convertedEmployeeId: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface Lookup {
  id: string;
  name: string;
}

interface OfferFormState {
  id: string | null;
  designationId: string;
  branchId: string;
  salaryOffered: string;
  benefits: string;
  startDate: string;
}

const emptyForm: OfferFormState = {
  id: null,
  designationId: "",
  branchId: "",
  salaryOffered: "",
  benefits: "",
  startDate: "",
};

const statusBadgeClass: Record<OfferStatus, string> = {
  Draft: "xp-badge xp-badge-neutral",
  PendingApproval: "xp-badge xp-badge-warning",
  Approved: "xp-badge xp-badge-info",
  Rejected: "xp-badge xp-badge-danger",
  Sent: "xp-badge xp-badge-info",
  Accepted: "xp-badge xp-badge-success",
  Declined: "xp-badge xp-badge-danger",
  Expired: "xp-badge xp-badge-neutral",
  Withdrawn: "xp-badge xp-badge-neutral",
};

// ============================================================================
// Component
// ============================================================================

export default function ApplicationOffer({
  applicationId,
}: {
  applicationId: string;
}) {
  useRequirePermission(Permissions.Recruitment.Offer.View);

  const canCreate = usePermission(Permissions.Recruitment.Offer.Create);
  const canEdit = usePermission(Permissions.Recruitment.Offer.Edit);
  const canDelete = usePermission(Permissions.Recruitment.Offer.Delete);
  const canSubmit = usePermission(Permissions.Recruitment.Offer.Submit);
  const canApprove = usePermission(Permissions.Recruitment.Offer.Approve);
  const canSend = usePermission(Permissions.Recruitment.Offer.Send);
  const canRecordResponse = usePermission(
    Permissions.Recruitment.Offer.RecordResponse,
  );
  const canWithdraw = usePermission(Permissions.Recruitment.Offer.Withdraw);
  const canConvert = usePermission(
    Permissions.Recruitment.Onboarding.ConvertToEmployee,
  );

  const initialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<OfferFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [designations, setDesignations] = useState<Lookup[]>([]);
  const [branches, setBranches] = useState<Lookup[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [sendTarget, setSendTarget] = useState<Offer | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [sending, setSending] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<Offer | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [responseTarget, setResponseTarget] = useState<{
    offer: Offer;
    type: "ACCEPT" | "DECLINE";
  } | null>(null);
  const [negotiationNotes, setNegotiationNotes] = useState("");
  const [responding, setResponding] = useState(false);

  const [convertTarget, setConvertTarget] = useState<Offer | null>(null);

  const [historyTarget, setHistoryTarget] = useState<Offer | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
    loadLookups();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const res = await api.get(`/offers/application/${applicationId}`);
      setOffers(res.data);
    } catch {
      showError(
        "Failed to load",
        "Could not load offers for this application.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadLookups() {
    try {
      const [d, b] = await Promise.all([
        api.get("/designations"),
        api.get("/branches"),
      ]);
      setDesignations(
        (d.data ?? []).map((x: any) => ({ id: x.id, name: x.title ?? x.name })),
      );
      setBranches((b.data ?? []).map((x: any) => ({ id: x.id, name: x.name })));
    } catch {
      // non-fatal — pickers just stay empty
    }
  }

  function openAdd() {
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(offer: Offer) {
    setForm({
      id: offer.id,
      designationId: offer.designationId,
      branchId: offer.branchId ?? "",
      salaryOffered: String(offer.salaryOffered),
      benefits: offer.benefits ?? "",
      startDate: offer.startDate.slice(0, 10),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.designationId) {
      showError("Missing designation", "Select a designation.");
      return;
    }
    const salary = parseFloat(form.salaryOffered);
    if (!salary || salary <= 0) {
      showError("Invalid salary", "Enter a salary greater than 0.");
      return;
    }
    if (!form.startDate) {
      showError("Missing start date", "Select a start date.");
      return;
    }

    try {
      setSaving(true);
      await api.post("/offers/save", {
        id: form.id,
        action: form.id ? "UPDATE" : "ADD",
        applicationId: form.id ? null : applicationId,
        designationId: form.designationId,
        branchId: form.branchId || null,
        salaryOffered: salary,
        benefits: form.benefits || null,
        startDate: form.startDate,
        expiryDate: null,
        rejectionReason: null,
        negotiationNotes: null,
      });
      setDialogOpen(false);
      await load();
      showSuccess("Saved", form.id ? "Offer updated." : "Offer created.");
    } catch (err: any) {
      showError(
        "Save failed",
        err?.response?.data?.message ?? "Could not save the offer.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function runSimpleAction(
    offer: Offer,
    action: string,
    successMsg: string,
  ) {
    try {
      await api.post("/offers/save", { id: offer.id, action });
      await load();
      showSuccess("Done", successMsg);
    } catch (err: any) {
      showError(
        "Action failed",
        err?.response?.data?.message ?? "Could not complete the action.",
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.post("/offers/save", { id: deleteTarget.id, action: "DELETE" });
      setDeleteTarget(null);
      await load();
      showSuccess("Deleted", "Offer removed.");
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.message ?? "Could not delete the offer.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleSend() {
    if (!sendTarget || !expiryDate) {
      showError("Missing expiry date", "Select an expiry date for this offer.");
      return;
    }
    try {
      setSending(true);
      await api.post("/offers/save", {
        id: sendTarget.id,
        action: "SEND",
        expiryDate,
      });
      setSendTarget(null);
      setExpiryDate("");
      await load();
      showSuccess("Sent", "Offer letter generated and sent.");
    } catch (err: any) {
      showError(
        "Send failed",
        err?.response?.data?.message ?? "Could not send the offer.",
      );
    } finally {
      setSending(false);
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
      showSuccess("Rejected", "Offer rejected.");
    } catch (err: any) {
      showError(
        "Failed",
        err?.response?.data?.message ?? "Could not reject the offer.",
      );
    } finally {
      setRejecting(false);
    }
  }

  async function handleRecordResponse() {
    if (!responseTarget) return;
    try {
      setResponding(true);
      await api.post("/offers/save", {
        id: responseTarget.offer.id,
        action: responseTarget.type,
        negotiationNotes: negotiationNotes || null,
      });
      setResponseTarget(null);
      setNegotiationNotes("");
      await load();
      showSuccess(
        "Recorded",
        `Candidate response recorded: ${responseTarget.type === "ACCEPT" ? "Accepted" : "Declined"}.`,
      );
    } catch (err: any) {
      showError(
        "Failed",
        err?.response?.data?.message ?? "Could not record the response.",
      );
    } finally {
      setResponding(false);
    }
  }

  async function downloadOfferPdf(offer: Offer) {
    try {
      const res = await api.get(`/offers/${offer.id}/download`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `Offer_${offer.candidateName.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError("Download failed", "Could not download the offer letter.");
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-semibold">Offer</h5>
          {canCreate &&
            offers.every((o) =>
              ["Declined", "Expired", "Withdrawn"].includes(o.status),
            ) && (
              <Button
                size="sm"
                variant="solid"
                icon={<FileText size={15} />}
                onClick={openAdd}
              >
                Create Offer
              </Button>
            )}
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            Loading...
          </div>
        ) : offers.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            No offer created yet.
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="border border-gray-100 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={statusBadgeClass[offer.status]}>
                      {offer.status}
                    </span>
                    {offer.requiresApproval && (
                      <span className="text-xs text-amber-600">
                        Requires Approval
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHistoryTarget(offer)}
                      title="History"
                    >
                      <History
                        size={15}
                        className="text-gray-400 hover:text-blue-600"
                      />
                    </button>
                    {offer.pdfFilePath && (
                      <button
                        onClick={() => downloadOfferPdf(offer)}
                        title="Download PDF"
                      >
                        <Download
                          size={15}
                          className="text-gray-400 hover:text-blue-600"
                        />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-400">Designation:</span>{" "}
                    {offer.designationTitle}
                  </div>
                  {offer.branchName && (
                    <div>
                      <span className="text-gray-400">Branch:</span>{" "}
                      {offer.branchName}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Salary:</span>{" "}
                    {offer.salaryOffered.toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-400">Start:</span>{" "}
                    {new Date(offer.startDate).toLocaleDateString()}
                  </div>
                  {offer.expiryDate && (
                    <div>
                      <span className="text-gray-400">Expires:</span>{" "}
                      {new Date(offer.expiryDate).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {["Draft", "PendingApproval", "Approved"].includes(
                  offer.status,
                ) && (
                  <div className="mb-3">
                    <OfferIntelligencePanel offerId={offer.id} />
                  </div>
                )}

                {offer.rejectionReason && (
                  <div className="text-sm bg-red-50 dark:bg-red-900/20 text-red-600 rounded px-3 py-2 mb-3">
                    Rejected: {offer.rejectionReason}
                  </div>
                )}
                {offer.negotiationNotes && (
                  <div className="text-sm bg-gray-50 dark:bg-gray-800 rounded px-3 py-2 mb-3">
                    Notes: {offer.negotiationNotes}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {offer.status === "Draft" && canEdit && (
                    <Button
                      size="xs"
                      variant="plain"
                      icon={<Pencil size={13} />}
                      onClick={() => openEdit(offer)}
                    >
                      Edit
                    </Button>
                  )}
                  {offer.status === "Draft" && canDelete && (
                    <Button
                      size="xs"
                      variant="plain"
                      icon={<Trash2 size={13} />}
                      onClick={() => setDeleteTarget(offer)}
                    >
                      Delete
                    </Button>
                  )}
                  {offer.status === "Draft" &&
                    offer.requiresApproval &&
                    canSubmit && (
                      <Button
                        size="xs"
                        variant="solid"
                        onClick={() =>
                          runSimpleAction(
                            offer,
                            "SUBMIT",
                            "Submitted for approval.",
                          )
                        }
                      >
                        Submit for Approval
                      </Button>
                    )}
                  {offer.status === "Draft" &&
                    !offer.requiresApproval &&
                    canSend && (
                      <Button
                        size="xs"
                        variant="solid"
                        icon={<Send size={13} />}
                        onClick={() => setSendTarget(offer)}
                      >
                        Send
                      </Button>
                    )}
                  {offer.status === "PendingApproval" && canApprove && (
                    <>
                      <Button
                        size="xs"
                        variant="solid"
                        icon={<CheckCircle2 size={13} />}
                        onClick={() =>
                          runSimpleAction(offer, "APPROVE", "Offer approved.")
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="xs"
                        variant="plain"
                        icon={<XCircle size={13} />}
                        onClick={() => setRejectTarget(offer)}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  {offer.status === "Approved" && canSend && (
                    <Button
                      size="xs"
                      variant="solid"
                      icon={<Send size={13} />}
                      onClick={() => setSendTarget(offer)}
                    >
                      Send
                    </Button>
                  )}
                  {offer.status === "Rejected" && canEdit && (
                    <Button
                      size="xs"
                      variant="plain"
                      icon={<Pencil size={13} />}
                      onClick={() => openEdit(offer)}
                    >
                      Edit &amp; Resubmit
                    </Button>
                  )}
                  {offer.status === "Sent" && canRecordResponse && (
                    <>
                      <Button
                        size="xs"
                        variant="solid"
                        icon={<CheckCircle2 size={13} />}
                        onClick={() =>
                          setResponseTarget({ offer, type: "ACCEPT" })
                        }
                      >
                        Record Accept
                      </Button>
                      <Button
                        size="xs"
                        variant="plain"
                        icon={<XCircle size={13} />}
                        onClick={() =>
                          setResponseTarget({ offer, type: "DECLINE" })
                        }
                      >
                        Record Decline
                      </Button>
                    </>
                  )}
                  {["Draft", "PendingApproval", "Approved", "Sent"].includes(
                    offer.status,
                  ) &&
                    canWithdraw && (
                      <Button
                        size="xs"
                        variant="plain"
                        icon={<Ban size={13} />}
                        onClick={() =>
                          runSimpleAction(offer, "WITHDRAW", "Offer withdrawn.")
                        }
                      >
                        Withdraw
                      </Button>
                    )}
                  {offer.status === "Accepted" &&
                    !offer.convertedEmployeeId &&
                    canConvert && (
                      <Button
                        size="xs"
                        variant="solid"
                        icon={<UserPlus size={13} />}
                        onClick={() => setConvertTarget(offer)}
                      >
                        Convert to Employee
                      </Button>
                    )}
                  {offer.convertedEmployeeId && (
                    <span className="xp-badge xp-badge-success text-xs">
                      Converted to Employee
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
        width={520}
      >
        <h5>{form.id ? "Edit Offer" : "Create Offer"}</h5>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="form-label">Designation</label>
            <select
              className="input w-full"
              value={form.designationId}
              onChange={(e) =>
                setForm({ ...form, designationId: e.target.value })
              }
            >
              <option value="">— Select —</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Branch</label>
            <select
              className="input w-full"
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            >
              <option value="">— Select —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Salary Offered</label>
            <Input
              type="number"
              min="0"
              value={form.salaryOffered}
              onChange={(e) =>
                setForm({ ...form, salaryOffered: e.target.value })
              }
            />
          </div>

          <div>
            <label className="form-label">Start Date</label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <label className="form-label">Benefits</label>
            <textarea
              className="input w-full"
              rows={2}
              value={form.benefits}
              onChange={(e) => setForm({ ...form, benefits: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {form.id ? "Save Changes" : "Create Offer"}
          </Button>
        </div>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onRequestClose={() => setDeleteTarget(null)}
        width={420}
      >
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-red-100 dark:bg-red-900/30">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <div>
            <h5 className="font-semibold">Delete Offer</h5>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              This draft offer will be deleted. This cannot be undone.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-1">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              loading={deleting}
              className="bg-red-500 hover:bg-red-600 text-white border-red-500"
              onClick={handleDelete}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Send */}
      <Dialog
        isOpen={!!sendTarget}
        onClose={() => setSendTarget(null)}
        onRequestClose={() => setSendTarget(null)}
        width={420}
      >
        <h5>Send Offer</h5>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
          The offer letter PDF will be generated and the offer marked as sent.
        </p>
        <label className="form-label">Expiry Date</label>
        <Input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setSendTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            loading={sending}
            icon={<Send size={14} />}
            onClick={handleSend}
          >
            Send
          </Button>
        </div>
      </Dialog>

      {/* Reject */}
      <Dialog
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onRequestClose={() => setRejectTarget(null)}
        width={420}
      >
        <h5>Reject Offer</h5>
        <label className="form-label mt-4">Rejection Reason</label>
        <textarea
          className="input w-full"
          rows={3}
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setRejectTarget(null)}>
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

      {/* Accept / Decline */}
      <Dialog
        isOpen={!!responseTarget}
        onClose={() => setResponseTarget(null)}
        onRequestClose={() => setResponseTarget(null)}
        width={420}
      >
        <h5>
          {responseTarget?.type === "ACCEPT"
            ? "Record Acceptance"
            : "Record Decline"}
        </h5>
        <label className="form-label mt-4">Notes (optional)</label>
        <textarea
          className="input w-full"
          rows={3}
          value={negotiationNotes}
          onChange={(e) => setNegotiationNotes(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setResponseTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            loading={responding}
            onClick={handleRecordResponse}
          >
            Confirm
          </Button>
        </div>
      </Dialog>

      {/* Convert to Employee */}
      {convertTarget && (
        <ConvertToEmployeeDialog
          offer={convertTarget}
          onClose={() => setConvertTarget(null)}
          onConverted={load}
        />
      )}

      {/* History */}
      {historyTarget && (
        <OfferHistoryDialog
          offer={historyTarget}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Convert to Employee dialog
// ============================================================================

function ConvertToEmployeeDialog({
  offer,
  onClose,
  onConverted,
}: {
  offer: Offer;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [employeeCode, setEmployeeCode] = useState("");
  const [leaveTemplateId, setLeaveTemplateId] = useState("");
  const [status, setStatus] = useState<"Active" | "Probation">("Probation");
  const [leaveTemplates, setLeaveTemplates] = useState<Lookup[]>([]);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    // TODO CONFIRM: real leave templates list endpoint
    api
      .get("/leave-templates")
      .then((res) =>
        setLeaveTemplates(
          (res.data ?? []).map((x: any) => ({ id: x.id, name: x.name })),
        ),
      )
      .catch(() => setLeaveTemplates([]));
  }, []);

  async function handleConvert() {
    if (!employeeCode.trim()) {
      showError("Missing employee code", "Enter an employee code.");
      return;
    }
    if (!leaveTemplateId) {
      showError("Missing leave template", "Select a leave template.");
      return;
    }

    try {
      setConverting(true);
      await api.post("/offers/convert-to-employee", {
        offerId: offer.id,
        employeeCode: employeeCode.trim(),
        leaveTemplateId,
        status,
      });
      showSuccess("Converted", "Employee record created.");
      onConverted();
      onClose();
    } catch (err: any) {
      showError(
        "Conversion failed",
        err?.response?.data?.message ?? "Could not convert to employee.",
      );
    } finally {
      setConverting(false);
    }
  }

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      onRequestClose={onClose}
      width={460}
    >
      <h5>Convert to Employee</h5>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
        Creates a new employee record for {offer.candidateName} from this
        accepted offer.
      </p>

      <div className="space-y-4">
        <div>
          <label className="form-label">Employee Code</label>
          <Input
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
            placeholder="e.g. EMP-2026-0042"
          />
        </div>
        <div>
          <label className="form-label">Leave Template</label>
          <select
            className="input w-full"
            value={leaveTemplateId}
            onChange={(e) => setLeaveTemplateId(e.target.value)}
          >
            <option value="">— Select —</option>
            {leaveTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Starting Status</label>
          <div className="flex gap-2">
            {(["Probation", "Active"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${
                  status === s
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="plain" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="solid"
          loading={converting}
          icon={<UserPlus size={14} />}
          onClick={handleConvert}
        >
          Create Employee
        </Button>
      </div>
    </Dialog>
  );
}

// ============================================================================
// History dialog
// ============================================================================

function OfferHistoryDialog({
  offer,
  onClose,
}: {
  offer: Offer;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/offers/${offer.id}/audit-log`)
      .then((res) => setEntries(res.data))
      .catch(() => showError("Failed to load", "Could not load offer history."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      onRequestClose={onClose}
      width={480}
    >
      <h5>Offer History</h5>
      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
          Loading...
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {entries.map((e) => (
            <div
              key={e.id}
              className="border-b border-gray-100 dark:border-gray-700 pb-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  {e.action.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(e.changedAt).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {e.changedByName}
              </div>
              {e.notes && <div className="text-xs mt-1">{e.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}
