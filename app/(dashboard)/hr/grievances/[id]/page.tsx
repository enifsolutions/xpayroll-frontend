"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Lock,
  UserCheck,
  UserPlus,
  Play,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowUpCircle,
  Gauge,
  Star,
  Trash2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";

// ── Types (mirrors GrievanceDto / GrievanceActionDto exactly) ────────────────
interface Grievance {
  id: string;
  employeeId: string | null;
  employeeName: string | null;
  categoryId: string;
  categoryName: string;
  subject: string;
  description: string;
  status: string;
  isConfidential: boolean;
  isAnonymous: boolean;
  severity: string;
  reportedBy: string | null;
  reportedByName: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  acknowledgeDueAt: string | null;
  resolveDueAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedByName: string | null;
  escalatedAt: string | null;
  escalatedTo: string | null;
  escalatedToName: string | null;
  satisfactionRating: number | null;
  reopenedCount: number;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface AuditEntry {
  id: string;
  actionType: string;
  comment: string | null;
  visibility: string;
  actionBy: string | null;
  actionByName: string | null;
  actionAt: string;
}

interface UserOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

const STATUS_BADGE: Record<string, string> = {
  Open: "bg-amber-50 text-amber-700 border-amber-200",
  InProgress: "bg-blue-50 text-blue-700 border-blue-200",
  Resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Closed: "bg-gray-100 text-gray-600 border-gray-200",
  Withdrawn: "bg-gray-100 text-gray-500 border-gray-200",
};

const SEVERITY_BADGE: Record<string, string> = {
  Critical: "bg-rose-50 text-rose-700 border-rose-200",
  High: "bg-amber-50 text-amber-700 border-amber-200",
  Medium: "bg-blue-50 text-blue-700 border-blue-200",
  Low: "bg-gray-100 text-gray-600 border-gray-200",
};

const ACTION_LABELS: Record<string, string> = {
  STATUS_CHANGE: "Status Change",
  ACKNOWLEDGE: "Acknowledged",
  ASSIGN: "Assigned",
  RESOLVE: "Resolved",
  REOPEN: "Reopened",
  ESCALATE: "Escalated",
  AUTO_ESCALATE: "Auto-Escalated",
  AUTO_CLOSE: "Auto-Closed",
  SEVERITY: "Severity Changed",
  RATE: "Rated",
  DELETE: "Deleted",
  SLA_WARNING: "SLA Warning",
  SLA_BREACH: "SLA Breached",
};

// Same palette convention as ShortLeaveRequestDetailDialog's ACTION_COLORS —
// each action type gets a distinct dot color rather than a flat gray, so
// the timeline reads at a glance instead of every entry looking identical.
const ACTION_COLORS: Record<string, string> = {
  STATUS_CHANGE: "bg-gray-400",
  ACKNOWLEDGE: "bg-blue-500",
  ASSIGN: "bg-violet-500",
  RESOLVE: "bg-green-500",
  REOPEN: "bg-amber-500",
  ESCALATE: "bg-orange-500",
  AUTO_ESCALATE: "bg-orange-500",
  AUTO_CLOSE: "bg-gray-500",
  SEVERITY: "bg-fuchsia-500",
  RATE: "bg-yellow-500",
  DELETE: "bg-red-500",
  SLA_WARNING: "bg-amber-500",
  SLA_BREACH: "bg-rose-500",
};

// Same math as the list page's SLA badge: window = due - created (the
// original SLA period at ADD time), threshold = due - window*(1-pct/100).
// Reproduces fn_get_grievance_sla_due's own calculation rather than a
// fixed lookahead.
type SlaState = "breached" | "due-soon" | "on-track" | "none";
function computeSla(
  dueAt: string | null,
  satisfied: boolean,
  createdAt: string,
  pct: number,
): SlaState {
  if (!dueAt || satisfied) return "none";
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const created = new Date(createdAt).getTime();
  if (now >= due) return "breached";
  const window = due - created;
  const warningStart = due - window * (1 - pct / 100);
  return now >= warningStart ? "due-soon" : "on-track";
}

function slaChip(label: string, state: SlaState, dueAt: string | null) {
  if (state === "none" || !dueAt) return null;
  const style =
    state === "breached"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : state === "due-soon"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
  const Icon = state === "breached" ? AlertTriangle : Clock;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${style}`}
    >
      <Icon size={13} />
      <span>
        {label}:{" "}
        {state === "breached"
          ? "Breached"
          : state === "due-soon"
            ? "Due Soon"
            : "On Track"}
        {" · "}
        {new Date(dueAt).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

// Local, small user picker — no shared UserPicker component exists in this
// codebase yet, matching the same local-duplication pattern used in the
// Grievance Settings tab and ApplyShortLeaveDialog's employee picker.
function UserPickerInline({
  users,
  value,
  onChange,
}: {
  users: UserOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = users.find((u) => u.id === value);
  const filtered = search.trim()
    ? users.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  if (selected && !search) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
        <span className="text-sm">
          {selected.firstName} {selected.lastName}{" "}
          <span className="text-gray-400">({selected.email})</span>
        </span>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={() => onChange("")}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        className="input w-full"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-gray-400">No users found</div>
          ) : (
            filtered.slice(0, 10).map((u) => (
              <button
                key={u.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => {
                  onChange(u.id);
                  setSearch("");
                }}
              >
                {u.firstName} {u.lastName}{" "}
                <span className="text-gray-400">({u.email})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

type DialogKind =
  | "assign"
  | "resolve"
  | "reopen"
  | "withdraw"
  | "escalate"
  | "severity"
  | "rate"
  | "delete"
  | null;

export default function GrievanceDetailPage() {
  useRequirePermission(Permissions.HR.Grievance.View);
  const canManage = usePermission(Permissions.HR.Grievance.Manage);
  const canDelete = usePermission(Permissions.HR.Grievance.Delete);

  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const initialized = useRef(false);

  const [item, setItem] = useState<Grievance | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [slaPct, setSlaPct] = useState(80);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [saving, setSaving] = useState(false);

  // Per-dialog form state
  const [pickUserId, setPickUserId] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [severityInput, setSeverityInput] = useState("Medium");
  const [ratingInput, setRatingInput] = useState(5);

  async function load() {
    setLoading(true);
    try {
      const [itemRes, auditRes, usersRes, policyRes] = await Promise.all([
        api.get(`/grievances/${id}`),
        api.get(`/grievances/${id}/audit`),
        api.get("/users"),
        api.get("/grievance-config/policy"),
      ]);
      const g = itemRes.data;
      setItem({
        ...g,
        id: String(g.id),
        employeeId: g.employeeId != null ? String(g.employeeId) : null,
        categoryId: String(g.categoryId),
        reportedBy: g.reportedBy != null ? String(g.reportedBy) : null,
        assignedTo: g.assignedTo != null ? String(g.assignedTo) : null,
        acknowledgedBy:
          g.acknowledgedBy != null ? String(g.acknowledgedBy) : null,
        escalatedTo: g.escalatedTo != null ? String(g.escalatedTo) : null,
      });
      setAudit(
        auditRes.data.map((a: any) => ({
          ...a,
          id: String(a.id),
          actionBy: a.actionBy != null ? String(a.actionBy) : null,
        })),
      );
      setUsers(
        usersRes.data.map((u: any) => ({
          id: String(u.id),
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
        })),
      );
      setSlaPct(policyRes.data.slaWarningThresholdPct ?? 80);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        showError(
          "Load failed",
          err?.response?.data?.error ?? "Could not load this grievance case.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!id || initialized.current) return;
    initialized.current = true;
    load();
  }, [id]);

  function openDialog(kind: DialogKind) {
    setPickUserId("");
    setNotesInput("");
    setSeverityInput(item?.severity ?? "Medium");
    setRatingInput(5);
    setDialog(kind);
  }

  async function runAction(path: string, body: any, successMsg: string) {
    setSaving(true);
    try {
      await api.post(`/grievances/${id}/${path}`, body);
      showSuccess(successMsg);
      setDialog(null);
      await load();
    } catch (err: any) {
      showError(
        "Action failed",
        err?.response?.data?.message ??
          err?.response?.data?.error ??
          "This action could not be completed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await api.delete(`/grievances/${id}`);
      showSuccess("Case deleted");
      router.push("/hr/grievances");
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.error ?? "Could not delete this case.",
      );
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div className="text-center py-24 text-gray-400">
        <p>Grievance case not found.</p>
        <button
          onClick={() => router.push("/hr/grievances")}
          className="text-primary hover:underline text-sm mt-2"
        >
          Back to grievances
        </button>
      </div>
    );
  }

  const ackSla = computeSla(
    item.acknowledgeDueAt,
    !!item.acknowledgedAt,
    item.createdAt,
    slaPct,
  );
  const resolveSla = computeSla(
    item.resolveDueAt,
    !!item.resolvedAt,
    item.createdAt,
    slaPct,
  );

  const canAcknowledge =
    ["Open", "InProgress"].includes(item.status) && !item.acknowledgedAt;
  const canAssign = ["Open", "InProgress"].includes(item.status);
  const canStart = item.status === "Open";
  const canResolve = ["Open", "InProgress"].includes(item.status);
  const canClose = item.status === "Resolved";
  const canReopen = ["Resolved", "Closed"].includes(item.status);
  const canWithdraw =
    ["Open", "InProgress"].includes(item.status) && !item.isAnonymous;
  const canEscalate = ["Open", "InProgress"].includes(item.status);
  const canSetSeverity = !["Closed", "Withdrawn"].includes(item.status);
  const canRate =
    ["Resolved", "Closed"].includes(item.status) && !item.isAnonymous;

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => router.push("/hr/grievances")}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-3"
        >
          <ArrowLeft size={15} /> All grievances
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {item.isConfidential && (
                <Lock
                  size={16}
                  className="text-amber-500"
                  aria-label="Confidential"
                />
              )}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {item.subject}
              </h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[item.status] ?? STATUS_BADGE.Open}`}
              >
                {item.status === "InProgress" ? "In Progress" : item.status}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_BADGE[item.severity] ?? SEVERITY_BADGE.Low}`}
              >
                {item.severity}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {item.categoryName} · Case #{item.id}
              {item.reopenedCount > 0 && ` · Reopened ${item.reopenedCount}×`}
            </p>
          </div>

          {canDelete && (
            <Button
              variant="default"
              size="sm"
              icon={<Trash2 size={14} />}
              className="text-red-500"
              onClick={() => openDialog("delete")}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {(slaChip("Acknowledge SLA", ackSla, item.acknowledgeDueAt) ||
        slaChip("Resolve SLA", resolveSla, item.resolveDueAt)) && (
        <div className="flex flex-wrap gap-3">
          {slaChip("Acknowledge SLA", ackSla, item.acknowledgeDueAt)}
          {slaChip("Resolve SLA", resolveSla, item.resolveDueAt)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-body">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                Description
              </h5>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {item.description}
              </p>
              {item.resolutionNotes && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Resolution Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {item.resolutionNotes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {canManage && (
            <div className="card">
              <div className="card-body">
                <h5 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Actions
                </h5>
                <div className="flex flex-wrap gap-2">
                  {canAcknowledge && (
                    <Button
                      size="sm"
                      variant="solid"
                      icon={<UserCheck size={14} />}
                      onClick={() =>
                        runAction("acknowledge", {}, "Case acknowledged")
                      }
                    >
                      Acknowledge
                    </Button>
                  )}
                  {canAssign && (
                    <Button
                      size="sm"
                      variant="default"
                      icon={<UserPlus size={14} />}
                      onClick={() => openDialog("assign")}
                    >
                      Assign
                    </Button>
                  )}
                  {canStart && (
                    <Button
                      size="sm"
                      variant="default"
                      icon={<Play size={14} />}
                      onClick={() =>
                        runAction("start", {}, "Investigation started")
                      }
                    >
                      Start
                    </Button>
                  )}
                  {canResolve && (
                    <Button
                      size="sm"
                      variant="solid"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      icon={<CheckCircle2 size={14} />}
                      onClick={() => openDialog("resolve")}
                    >
                      Resolve
                    </Button>
                  )}
                  {canClose && (
                    <Button
                      size="sm"
                      variant="solid"
                      icon={<CheckCircle2 size={14} />}
                      onClick={() => runAction("close", {}, "Case closed")}
                    >
                      Close
                    </Button>
                  )}
                  {canReopen && (
                    <Button
                      size="sm"
                      variant="default"
                      icon={<RotateCcw size={14} />}
                      onClick={() => openDialog("reopen")}
                    >
                      Reopen
                    </Button>
                  )}
                  {canWithdraw && (
                    <Button
                      size="sm"
                      variant="default"
                      className="text-gray-500"
                      icon={<XCircle size={14} />}
                      onClick={() => openDialog("withdraw")}
                    >
                      Withdraw
                    </Button>
                  )}
                  {canEscalate && (
                    <Button
                      size="sm"
                      variant="default"
                      icon={<ArrowUpCircle size={14} />}
                      onClick={() => openDialog("escalate")}
                    >
                      Escalate
                    </Button>
                  )}
                  {canSetSeverity && (
                    <Button
                      size="sm"
                      variant="default"
                      icon={<Gauge size={14} />}
                      onClick={() => openDialog("severity")}
                    >
                      Severity
                    </Button>
                  )}
                  {canRate && (
                    <Button
                      size="sm"
                      variant="default"
                      icon={<Star size={14} />}
                      onClick={() => openDialog("rate")}
                    >
                      Rate
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-body">
              <h5 className="font-semibold text-gray-900 dark:text-white mb-4">
                Activity Log
              </h5>
              {audit.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No activity recorded.
                </p>
              ) : (
                <div className="relative max-h-96 overflow-y-auto pr-1">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-4">
                    {audit.map((entry) => (
                      <div key={entry.id} className="flex gap-4 relative">
                        <div
                          className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center z-10 ${ACTION_COLORS[entry.actionType] ?? "bg-gray-400"}`}
                        >
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="text-sm font-semibold">
                              {ACTION_LABELS[entry.actionType] ??
                                entry.actionType}
                              {entry.visibility === "InternalOnly" && (
                                <span className="ml-1.5 text-[10px] font-normal text-gray-400">
                                  (Internal)
                                </span>
                              )}
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
                          {!entry.actionByName && !entry.actionBy && (
                            <p className="text-xs text-gray-400 mt-0.5 italic">
                              System
                            </p>
                          )}
                          {entry.comment && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {entry.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-body space-y-4">
              <h5 className="font-semibold text-gray-900 dark:text-white">
                Case Details
              </h5>

              <div>
                <p className="text-xs text-gray-400 mb-0.5">Complainant</p>
                <p className="text-sm font-medium">
                  {item.isAnonymous ? "Anonymous" : (item.employeeName ?? "—")}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-0.5">Assigned To</p>
                <p className="text-sm font-medium">
                  {item.assignedToName ?? "Unassigned"}
                </p>
              </div>

              {item.reportedByName && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Recorded By</p>
                  <p className="text-sm font-medium">{item.reportedByName}</p>
                </div>
              )}

              {item.acknowledgedAt && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Acknowledged</p>
                  <p className="text-sm font-medium">
                    {new Date(item.acknowledgedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                    {item.acknowledgedByName && ` · ${item.acknowledgedByName}`}
                  </p>
                </div>
              )}

              {item.escalatedAt && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Escalated To</p>
                  <p className="text-sm font-medium">
                    {item.escalatedToName ?? "—"}
                    <span className="text-gray-400 font-normal">
                      {" · "}
                      {new Date(item.escalatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </p>
                </div>
              )}

              {item.resolvedAt && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Resolved</p>
                  <p className="text-sm font-medium">
                    {new Date(item.resolvedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}

              {item.closedAt && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Closed</p>
                  <p className="text-sm font-medium">
                    {new Date(item.closedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}

              {item.satisfactionRating != null && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Satisfaction</p>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={14}
                        className={
                          n <= item.satisfactionRating!
                            ? "text-amber-400 fill-amber-400"
                            : "text-gray-200"
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-0.5">Reported On</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(item.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Assign ── */}
      <Dialog
        isOpen={dialog === "assign"}
        onClose={() => setDialog(null)}
        onRequestClose={() => setDialog(null)}
      >
        <h5 className="mb-4">Assign Case</h5>
        <UserPickerInline
          users={users}
          value={pickUserId}
          onChange={setPickUserId}
        />
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="plain" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            loading={saving}
            disabled={!pickUserId}
            onClick={() =>
              runAction("assign", { assignedTo: pickUserId }, "Case assigned")
            }
          >
            Assign
          </Button>
        </div>
      </Dialog>

      {/* ── Resolve ── */}
      <Dialog
        isOpen={dialog === "resolve"}
        onClose={() => setDialog(null)}
        onRequestClose={() => setDialog(null)}
      >
        <h5 className="mb-4">Resolve Case</h5>
        <label className="form-label">Resolution Notes</label>
        <textarea
          className="input w-full resize-none"
          rows={4}
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          placeholder="Describe how this case was resolved…"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="plain" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            className="bg-emerald-600 hover:bg-emerald-700"
            loading={saving}
            onClick={() =>
              runAction(
                "resolve",
                { resolutionNotes: notesInput },
                "Case resolved",
              )
            }
          >
            Resolve
          </Button>
        </div>
      </Dialog>

      {/* ── Reopen ── */}
      <Dialog
        isOpen={dialog === "reopen"}
        onClose={() => setDialog(null)}
        onRequestClose={() => setDialog(null)}
      >
        <h5 className="mb-4">Reopen Case</h5>
        <p className="text-xs text-gray-400 mb-3">
          This restarts the resolution SLA clock from now.
        </p>
        <label className="form-label">Notes (optional)</label>
        <textarea
          className="input w-full resize-none"
          rows={3}
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          placeholder="Why is this being reopened…"
        />
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="plain" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            loading={saving}
            onClick={() =>
              runAction(
                "reopen",
                { notes: notesInput || null },
                "Case reopened",
              )
            }
          >
            Reopen
          </Button>
        </div>
      </Dialog>

      {/* ── Withdraw ── */}
      <Dialog
        isOpen={dialog === "withdraw"}
        onClose={() => setDialog(null)}
        onRequestClose={() => setDialog(null)}
      >
        <h5 className="mb-3">Withdraw Case</h5>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Withdraw this case on behalf of <strong>{item.employeeName}</strong>?
          This is intended for a walk-in complainant who has verbally asked HR
          to retract their case.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="plain" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            className="bg-gray-500 hover:bg-gray-600"
            loading={saving}
            onClick={() =>
              runAction(
                "withdraw",
                { employeeId: item.employeeId },
                "Case withdrawn",
              )
            }
          >
            Withdraw
          </Button>
        </div>
      </Dialog>

      {/* ── Escalate ── */}
      <Dialog
        isOpen={dialog === "escalate"}
        onClose={() => setDialog(null)}
        onRequestClose={() => setDialog(null)}
      >
        <h5 className="mb-4">Escalate Case</h5>
        <label className="form-label">Escalate To</label>
        <UserPickerInline
          users={users}
          value={pickUserId}
          onChange={setPickUserId}
        />
        <label className="form-label mt-3">Notes (optional)</label>
        <textarea
          className="input w-full resize-none"
          rows={3}
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          placeholder="Reason for escalation…"
        />
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="plain" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            loading={saving}
            disabled={!pickUserId}
            onClick={() =>
              runAction(
                "escalate",
                { escalateTo: pickUserId, notes: notesInput || null },
                "Case escalated",
              )
            }
          >
            Escalate
          </Button>
        </div>
      </Dialog>

      {/* ── Severity ── */}
      <Dialog
        isOpen={dialog === "severity"}
        onClose={() => setDialog(null)}
        onRequestClose={() => setDialog(null)}
      >
        <h5 className="mb-4">Update Severity</h5>
        <select
          className="select w-full"
          value={severityInput}
          onChange={(e) => setSeverityInput(e.target.value)}
        >
          {["Low", "Medium", "High", "Critical"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="plain" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            loading={saving}
            onClick={() =>
              runAction(
                "severity",
                { severity: severityInput },
                "Severity updated",
              )
            }
          >
            Save
          </Button>
        </div>
      </Dialog>

      {/* ── Rate ── */}
      <Dialog
        isOpen={dialog === "rate"}
        onClose={() => setDialog(null)}
        onRequestClose={() => setDialog(null)}
      >
        <h5 className="mb-4">Record Satisfaction Rating</h5>
        <p className="text-xs text-gray-400 mb-3">
          For recording a verbal response from the complainant during walk-in
          follow-up.
        </p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRatingInput(n)}>
              <Star
                size={28}
                className={
                  n <= ratingInput
                    ? "text-amber-400 fill-amber-400"
                    : "text-gray-200"
                }
              />
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="plain" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            loading={saving}
            onClick={() =>
              runAction("rate", { rating: ratingInput }, "Rating recorded")
            }
          >
            Save
          </Button>
        </div>
      </Dialog>

      {/* ── Delete confirm ── */}
      <Dialog
        isOpen={dialog === "delete"}
        onClose={() => setDialog(null)}
        onRequestClose={() => setDialog(null)}
      >
        <h5 className="mb-3">Delete Case</h5>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Delete <strong>{item.subject}</strong>? This is a soft delete — the
          case is retained for compliance but removed from all lists.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="plain" onClick={() => setDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            className="bg-red-500 hover:bg-red-600"
            loading={saving}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
