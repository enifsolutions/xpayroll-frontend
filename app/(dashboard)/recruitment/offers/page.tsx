"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Inbox,
  Search,
  Pencil,
  Send,
  Ban,
  Trash2,
  ClipboardCheck,
  Clock,
  Wallet,
  UserCheck,
  UserX,
  UserPlus,
} from "lucide-react";

interface OfferItem {
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
  status: string;
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
  totalCount: number;
}

interface OfferStats {
  pendingCount: number;
  approvedToday: number;
  rejectedThisWeek: number;
  totalPendingValue: number;
}

interface LookupItem {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  "Draft",
  "PendingApproval",
  "Approved",
  "Rejected",
  "Sent",
  "Accepted",
  "Declined",
  "Expired",
  "Withdrawn",
];

const STATUS_BADGE: Record<string, string> = {
  Draft: "xp-badge-neutral",
  PendingApproval: "xp-badge-warning",
  Approved: "xp-badge-info",
  Rejected: "xp-badge-danger",
  Sent: "xp-badge-info",
  Accepted: "xp-badge-success",
  Declined: "xp-badge-danger",
  Expired: "xp-badge-neutral",
  Withdrawn: "xp-badge-neutral",
};

const STATUS_LABEL: Record<string, string> = {
  PendingApproval: "Pending Approval",
};

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-pink-500",
  "bg-indigo-500",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const PAGE_SIZE = 10;

export default function OffersPage() {
  useRequirePermission(Permissions.Recruitment.Offer.View);

  const router = useRouter();
  const canApprove = usePermission(Permissions.Recruitment.Offer.Approve);
  const canEdit = usePermission(Permissions.Recruitment.Offer.Edit);
  const canSend = usePermission(Permissions.Recruitment.Offer.Send);
  const canWithdraw = usePermission(Permissions.Recruitment.Offer.Withdraw);
  const canConvert = usePermission(
    Permissions.Recruitment.Onboarding.ConvertToEmployee,
  );

  const initialized = useRef(false);
  const [items, setItems] = useState<OfferItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<OfferStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<LookupItem[]>([]);
  const [designations, setDesignations] = useState<LookupItem[]>([]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [page, setPage] = useState(1);

  const [approveTarget, setApproveTarget] = useState<OfferItem | null>(null);
  const [approving, setApproving] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<OfferItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [editTarget, setEditTarget] = useState<OfferItem | null>(null);
  const [editForm, setEditForm] = useState({
    salaryOffered: "",
    benefits: "",
    startDate: "",
  });
  const [saving, setSaving] = useState(false);

  const [sendTarget, setSendTarget] = useState<OfferItem | null>(null);
  const [expiryDate, setExpiryDate] = useState("");
  const [sending, setSending] = useState(false);

  const [withdrawTarget, setWithdrawTarget] = useState<OfferItem | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const [acceptTarget, setAcceptTarget] = useState<OfferItem | null>(null);
  const [accepting, setAccepting] = useState(false);

  const [declineTarget, setDeclineTarget] = useState<OfferItem | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declining, setDeclining] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<OfferItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [convertTarget, setConvertTarget] = useState<OfferItem | null>(null);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadLookups = async () => {
    try {
      const [branchRes, designationRes] = await Promise.all([
        api.get("/branches"),
        api.get("/designations"),
      ]);
      setBranches(
        (branchRes.data ?? []).map((b: any) => ({
          id: String(b.id),
          name: b.name,
        })),
      );
      setDesignations(
        (designationRes.data ?? []).map((d: any) => ({
          id: String(d.id),
          name: d.title ?? d.name,
        })),
      );
    } catch {
      // Non-critical — filters just won't populate if this fails.
    }
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, statsRes] = await Promise.all([
        api.get<OfferItem[]>("/offers", {
          params: {
            status: statusFilter || undefined,
            branchId: branchFilter || undefined,
            designationId: designationFilter || undefined,
            search: search || undefined,
            page,
            pageSize: PAGE_SIZE,
          },
        }),
        api.get<OfferStats>("/offers/approval-stats"),
      ]);
      const data = listRes.data ?? [];
      setItems(data);
      setTotalCount(data[0]?.totalCount ?? 0);
      setStats(statsRes.data ?? null);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load offers.",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, branchFilter, designationFilter, search, page]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadLookups();
    load();
  }, [load]);

  useEffect(() => {
    if (!initialized.current) return;
    load();
  }, [statusFilter, branchFilter, designationFilter, search, page, load]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("");
    setBranchFilter("");
    setDesignationFilter("");
    setPage(1);
  }

  async function handleApprove() {
    if (!approveTarget) return;
    try {
      setApproving(true);
      await api.post("/offers/save", {
        id: approveTarget.id,
        action: "APPROVE",
      });
      setApproveTarget(null);
      await load();
      showSuccess(
        "Approved",
        `Offer for ${approveTarget.candidateName} approved.`,
      );
    } catch (err: any) {
      showError(
        "Approve failed",
        err?.response?.data?.error ?? "Could not approve the offer.",
      );
    } finally {
      setApproving(false);
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
        err?.response?.data?.error ?? "Could not reject the offer.",
      );
    } finally {
      setRejecting(false);
    }
  }

  async function handleSubmitForApproval(item: OfferItem) {
    try {
      setActionLoadingId(item.id);
      await api.post("/offers/save", { id: item.id, action: "SUBMIT" });
      await load();
      showSuccess(
        "Submitted",
        `Offer for ${item.candidateName} submitted for approval.`,
      );
    } catch (err: any) {
      showError(
        "Submit failed",
        err?.response?.data?.error ?? "Could not submit the offer.",
      );
    } finally {
      setActionLoadingId(null);
    }
  }

  function openEdit(item: OfferItem) {
    setEditTarget(item);
    setEditForm({
      salaryOffered: String(item.salaryOffered ?? ""),
      benefits: item.benefits ?? "",
      startDate: item.startDate ? item.startDate.slice(0, 10) : "",
    });
  }

  async function handleSaveEdit() {
    if (!editTarget) return;
    try {
      setSaving(true);
      await api.post("/offers/save", {
        id: editTarget.id,
        action: "UPDATE",
        designationId: editTarget.designationId,
        branchId: editTarget.branchId,
        salaryOffered: Number(editForm.salaryOffered),
        benefits: editForm.benefits || null,
        startDate: editForm.startDate,
      });
      setEditTarget(null);
      await load();
      showSuccess("Saved", `Offer for ${editTarget.candidateName} updated.`);
    } catch (err: any) {
      showError(
        "Save failed",
        err?.response?.data?.error ?? "Could not save the offer.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!sendTarget) return;
    try {
      setSending(true);
      await api.post("/offers/save", {
        id: sendTarget.id,
        action: "SEND",
        expiryDate: expiryDate || null,
      });
      setSendTarget(null);
      setExpiryDate("");
      await load();
      showSuccess("Sent", `Offer sent to ${sendTarget.candidateName}.`);
    } catch (err: any) {
      showError(
        "Send failed",
        err?.response?.data?.error ?? "Could not send the offer.",
      );
    } finally {
      setSending(false);
    }
  }

  async function handleWithdraw() {
    if (!withdrawTarget) return;
    try {
      setWithdrawing(true);
      await api.post("/offers/save", {
        id: withdrawTarget.id,
        action: "WITHDRAW",
      });
      setWithdrawTarget(null);
      await load();
      showSuccess(
        "Withdrawn",
        `Offer for ${withdrawTarget.candidateName} withdrawn.`,
      );
    } catch (err: any) {
      showError(
        "Withdraw failed",
        err?.response?.data?.error ?? "Could not withdraw the offer.",
      );
    } finally {
      setWithdrawing(false);
    }
  }

  async function handleAccept() {
    if (!acceptTarget) return;
    try {
      setAccepting(true);
      await api.post("/offers/save", { id: acceptTarget.id, action: "ACCEPT" });
      setAcceptTarget(null);
      await load();
      showSuccess(
        "Accepted",
        `Offer for ${acceptTarget.candidateName} marked as accepted.`,
      );
    } catch (err: any) {
      showError(
        "Update failed",
        err?.response?.data?.error ?? "Could not record acceptance.",
      );
    } finally {
      setAccepting(false);
    }
  }

  async function handleDecline() {
    if (!declineTarget) return;
    try {
      setDeclining(true);
      await api.post("/offers/save", {
        id: declineTarget.id,
        action: "DECLINE",
        rejectionReason: declineReason || null,
      });
      setDeclineTarget(null);
      setDeclineReason("");
      await load();
      showSuccess(
        "Declined",
        `Offer for ${declineTarget.candidateName} marked as declined.`,
      );
    } catch (err: any) {
      showError(
        "Update failed",
        err?.response?.data?.error ?? "Could not record decline.",
      );
    } finally {
      setDeclining(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.post("/offers/save", { id: deleteTarget.id, action: "DELETE" });
      setDeleteTarget(null);
      await load();
      showSuccess(
        "Deleted",
        `Offer for ${deleteTarget.candidateName} deleted.`,
      );
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.error ?? "Could not delete the offer.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  const pageNumbers = (() => {
    const pages: (number | "...")[] = [];
    const span = 1;
    for (let p = 1; p <= totalPages; p++) {
      if (
        p === 1 ||
        p === totalPages ||
        (p >= page - span && p <= page + span)
      ) {
        pages.push(p);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Offers
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Every offer across every candidate — create, approve, send, and
            track in one place.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-400 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pending Approval
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.pendingCount ?? "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Approved Today
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.approvedToday ?? "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-rose-500 flex items-center justify-center shrink-0">
              <XCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Rejected This Week
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.rejectedThisWeek ?? "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
              <Wallet size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total Pending Value
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats ? stats.totalPendingValue.toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="form-label">Search</label>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <Input
                  className="pl-9"
                  placeholder="Candidate or requisition..."
                  value={search}
                  onChange={(e: any) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                />
              </div>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                className="input w-full"
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value);
                }}
              >
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s] ?? s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Branch</label>
              <select
                className="input w-full"
                value={branchFilter}
                onChange={(e) => {
                  setPage(1);
                  setBranchFilter(e.target.value);
                }}
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Designation</label>
              <select
                className="input w-full"
                value={designationFilter}
                onChange={(e) => {
                  setPage(1);
                  setDesignationFilter(e.target.value);
                }}
              >
                <option value="">All Designations</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(search || statusFilter || branchFilter || designationFilter) && (
            <div className="mt-2">
              <button
                onClick={clearFilters}
                className="text-xs text-violet-500 hover:text-violet-600"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Inbox size={40} className="mb-3 opacity-30" />
              <p className="text-sm">
                {search || statusFilter || branchFilter || designationFilter
                  ? "No offers match your filters."
                  : "No offers yet."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table-default table-hover w-full">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Position</th>
                      <th>Branch</th>
                      <th>Salary</th>
                      <th>Start Date</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 ${avatarColor(item.candidateName)}`}
                            >
                              {initials(item.candidateName)}
                            </div>
                            <div>
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
                            </div>
                          </div>
                        </td>
                        <td className="text-sm">{item.designationTitle}</td>
                        <td className="text-sm text-gray-500 dark:text-gray-400">
                          {item.branchName ?? "—"}
                        </td>
                        <td className="text-sm">
                          {item.salaryOffered.toLocaleString()}
                        </td>
                        <td className="text-sm">
                          {item.startDate
                            ? new Date(item.startDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td>
                          <span
                            className={`xp-badge ${STATUS_BADGE[item.status] ?? "xp-badge-neutral"}`}
                          >
                            {STATUS_LABEL[item.status] ?? item.status}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            {item.status === "Draft" && canEdit && (
                              <button
                                onClick={() => openEdit(item)}
                                className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500 transition-colors"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                            )}
                            {item.status === "Draft" &&
                              item.requiresApproval &&
                              canEdit && (
                                <button
                                  onClick={() => handleSubmitForApproval(item)}
                                  disabled={actionLoadingId === item.id}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors disabled:opacity-50"
                                  title="Submit for Approval"
                                >
                                  <ClipboardCheck size={16} />
                                </button>
                              )}
                            {item.status === "PendingApproval" &&
                              canApprove && (
                                <>
                                  <button
                                    onClick={() => setApproveTarget(item)}
                                    className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors"
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
                                </>
                              )}
                            {((item.status === "Draft" &&
                              !item.requiresApproval) ||
                              item.status === "Approved") &&
                              canSend && (
                                <button
                                  onClick={() => setSendTarget(item)}
                                  className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
                                  title="Send Offer"
                                >
                                  <Send size={16} />
                                </button>
                              )}
                            {item.status === "Sent" && canEdit && (
                              <>
                                <button
                                  onClick={() => setAcceptTarget(item)}
                                  className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors"
                                  title="Mark as Accepted"
                                >
                                  <UserCheck size={16} />
                                </button>
                                <button
                                  onClick={() => setDeclineTarget(item)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                  title="Mark as Declined"
                                >
                                  <UserX size={16} />
                                </button>
                              </>
                            )}
                            {item.status === "Accepted" &&
                              !item.convertedEmployeeId &&
                              canConvert && (
                                <button
                                  onClick={() => setConvertTarget(item)}
                                  className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500 transition-colors"
                                  title="Convert to Employee"
                                >
                                  <UserPlus size={16} />
                                </button>
                              )}
                            {item.status === "Accepted" &&
                              item.convertedEmployeeId && (
                                <span className="text-xs text-gray-400 px-1">
                                  Converted
                                </span>
                              )}
                            {[
                              "Draft",
                              "PendingApproval",
                              "Approved",
                              "Sent",
                            ].includes(item.status) &&
                              canWithdraw && (
                                <button
                                  onClick={() => setWithdrawTarget(item)}
                                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                                  title="Withdraw"
                                >
                                  <Ban size={16} />
                                </button>
                              )}
                            {item.status === "Draft" && canEdit && (
                              <button
                                onClick={() => setDeleteTarget(item)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing {rangeStart}–{rangeEnd} of {totalCount}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Prev
                  </button>
                  {pageNumbers.map((p, idx) =>
                    p === "..." ? (
                      <span
                        key={`ellipsis-${idx}`}
                        className="px-2 text-xs text-gray-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-2.5 py-1 text-xs rounded-lg border ${
                          p === page
                            ? "bg-violet-500 border-violet-500 text-white"
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
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

      {/* Edit Dialog */}
      <Dialog
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onRequestClose={() => setEditTarget(null)}
        width={480}
      >
        <h5>Edit Offer</h5>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
          {editTarget?.candidateName} — {editTarget?.designationTitle}
        </p>
        <div className="space-y-4">
          <div>
            <label className="form-label">Salary Offered</label>
            <Input
              type="number"
              value={editForm.salaryOffered}
              onChange={(e: any) =>
                setEditForm((f) => ({ ...f, salaryOffered: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="form-label">Benefits</label>
            <textarea
              className="input w-full resize-none"
              rows={2}
              value={editForm.benefits}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, benefits: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="form-label">Start Date</label>
            <Input
              type="date"
              value={editForm.startDate}
              onChange={(e: any) =>
                setEditForm((f) => ({ ...f, startDate: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="default" onClick={() => setEditTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            loading={saving}
            onClick={handleSaveEdit}
          >
            Save
          </Button>
        </div>
      </Dialog>

      {/* Send Dialog */}
      <Dialog
        isOpen={!!sendTarget}
        onClose={() => setSendTarget(null)}
        onRequestClose={() => setSendTarget(null)}
        width={420}
      >
        <h5>Send Offer</h5>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
          {sendTarget?.candidateName} — {sendTarget?.designationTitle}
        </p>
        <label className="form-label">Expiry Date (optional)</label>
        <Input
          type="date"
          value={expiryDate}
          onChange={(e: any) => setExpiryDate(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="default" onClick={() => setSendTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            loading={sending}
            onClick={handleSend}
          >
            Send
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!approveTarget}
        onCancel={() => setApproveTarget(null)}
        variant="info"
        title="Approve Offer"
        message={`Approve the offer for ${approveTarget?.candidateName ?? ""} — ${approveTarget?.designationTitle ?? ""}?`}
        confirmLabel="Approve"
        cancelLabel="Cancel"
        loading={approving}
        onConfirm={handleApprove}
      />

      <ConfirmDialog
        open={!!acceptTarget}
        onCancel={() => setAcceptTarget(null)}
        variant="info"
        title="Mark Offer as Accepted"
        message={`Record that ${acceptTarget?.candidateName ?? ""} has accepted this offer?`}
        confirmLabel="Mark Accepted"
        cancelLabel="Cancel"
        loading={accepting}
        onConfirm={handleAccept}
      />

      <Dialog
        isOpen={!!declineTarget}
        onClose={() => setDeclineTarget(null)}
        onRequestClose={() => setDeclineTarget(null)}
        width={420}
      >
        <h5>Mark Offer as Declined</h5>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
          {declineTarget?.candidateName} — {declineTarget?.designationTitle}
        </p>
        <label className="form-label">Reason (optional)</label>
        <textarea
          className="input w-full resize-none"
          rows={3}
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="default" onClick={() => setDeclineTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            loading={declining}
            className="bg-red-500 hover:bg-red-600 text-white border-red-500"
            onClick={handleDecline}
          >
            Mark Declined
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!withdrawTarget}
        onCancel={() => setWithdrawTarget(null)}
        variant="warning"
        title="Withdraw Offer"
        message={`Withdraw the offer for ${withdrawTarget?.candidateName ?? ""}? This cannot be undone.`}
        confirmLabel="Withdraw"
        cancelLabel="Cancel"
        loading={withdrawing}
        onConfirm={handleWithdraw}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
        title="Delete Offer"
        message={`Delete the draft offer for ${deleteTarget?.candidateName ?? ""}?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={handleDelete}
      />

      {convertTarget && (
        <ConvertToEmployeeDialog
          offer={convertTarget}
          onClose={() => setConvertTarget(null)}
          onConverted={load}
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
  offer: OfferItem;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [employeeCode, setEmployeeCode] = useState("");
  const [leaveTemplateId, setLeaveTemplateId] = useState("");
  const [status, setStatus] = useState<"Active" | "Probation">("Probation");
  const [leaveTemplates, setLeaveTemplates] = useState<LookupItem[]>([]);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    // Endpoint per the existing Offer Management module — same one the
    // in-application ApplicationOffer conversion flow already uses.
    api
      .get("/LeaveTemplate")
      .then((res) =>
        setLeaveTemplates(
          (res.data ?? []).map((x: any) => ({
            id: String(x.id),
            name: x.name,
          })),
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
      showSuccess(
        "Converted",
        `${offer.candidateName} is now an employee record.`,
      );
      onConverted();
      onClose();
    } catch (err: any) {
      showError(
        "Conversion failed",
        err?.response?.data?.error ??
          err?.response?.data?.message ??
          "Could not convert to employee.",
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
            onChange={(e: any) => setEmployeeCode(e.target.value)}
            placeholder="e.g. EMP0245"
          />
        </div>
        <div>
          <label className="form-label">Leave Template</label>
          <select
            className="input w-full"
            value={leaveTemplateId}
            onChange={(e) => setLeaveTemplateId(e.target.value)}
          >
            <option value="">Select a leave template</option>
            {leaveTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label">Starting Status</label>
          <select
            className="input w-full"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "Active" | "Probation")
            }
          >
            <option value="Probation">Probation</option>
            <option value="Active">Active</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="solid"
          color="primary"
          loading={converting}
          onClick={handleConvert}
        >
          Convert
        </Button>
      </div>
    </Dialog>
  );
}
