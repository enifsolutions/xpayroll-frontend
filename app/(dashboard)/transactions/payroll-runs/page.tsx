"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, CheckCircle, XCircle, Eye, Plus } from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore } from "@/store/authStore";
import { payrollService } from "@/components/payroll/payrollService";
import { PayrollRun } from "@/types/payroll.types";
import { showSuccess, showError } from "@/lib/toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Dialog from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function fmt(n: number) {
  return n.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Draft: "xp-badge xp-badge-neutral",
    Processing: "xp-badge xp-badge-warning",
    Completed: "xp-badge xp-badge-info",
    Approved: "xp-badge xp-badge-success",
    Cancelled: "xp-badge xp-badge-danger",
  };
  return map[status] ?? "xp-badge xp-badge-neutral";
};

type ConfirmType = "PROCESS" | "APPROVE" | "CANCEL" | "VOID" | null;

export default function PayrollRunsPage() {
  useRequirePermission("Payroll.PayrollRun.View");
  const canCreate = usePermission("Payroll.PayrollRun.Create");
  const canProcess = usePermission("Payroll.PayrollRun.Process");
  const canApprove = usePermission("Payroll.PayrollRun.Approve");
  const canVoid = usePermission("Payroll.PayrollRun.Void");

  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.userId ?? "");
  const initialized = useRef(false);

  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Confirm dialog
  const [confirmType, setConfirmType] = useState<ConfirmType>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRuns(await payrollService.getAll());
    } catch {
      showError("Error", "Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  const handleCreate = async () => {
    if (!periodLabel || !periodStart || !periodEnd) return;
    setSaving(true);
    try {
      await payrollService.create({
        periodLabel,
        periodStart,
        periodEnd,
        notes: notes || undefined,
        actionBy: userId,
      });
      showSuccess("Created", "Payroll run created successfully");
      setCreateOpen(false);
      setPeriodLabel("");
      setPeriodStart("");
      setPeriodEnd("");
      setNotes("");
      load();
    } catch (e: any) {
      showError(
        "Error",
        e?.response?.data?.message ?? "Failed to create payroll run",
      );
    } finally {
      setSaving(false);
    }
  };

  const openConfirm = (run: PayrollRun, type: ConfirmType) => {
    setSelectedRun(run);
    setConfirmType(type);
  };

  const handleConfirm = async () => {
    if (!selectedRun || !confirmType) return;
    setConfirming(true);
    try {
      if (confirmType === "PROCESS") {
        await payrollService.process(selectedRun.id, userId);
        showSuccess("Processed", "Payroll processed successfully");
      } else {
        await payrollService.action(selectedRun.id, confirmType, userId);
        const labels: Record<string, string> = {
          APPROVE: "Approved",
          CANCEL: "Cancelled",
          VOID: "Voided",
        };
        showSuccess(
          labels[confirmType],
          `Payroll run ${labels[confirmType].toLowerCase()}`,
        );
      }
      setConfirmType(null);
      setSelectedRun(null);
      load();
    } catch (e: any) {
      showError("Error", e?.response?.data?.message ?? "Action failed");
    } finally {
      setConfirming(false);
    }
  };

  const confirmMeta: Record<
    string,
    {
      variant: "info" | "warning" | "danger";
      title: string;
      message: string;
      label: string;
    }
  > = {
    PROCESS: {
      variant: "info",
      title: "Process Payroll Run",
      message: `Process payroll for "${selectedRun?.periodLabel}"? This will calculate payslips for all active employees. Any existing payslips for this run will be regenerated.`,
      label: "Yes, Process",
    },
    APPROVE: {
      variant: "info",
      title: "Approve Payroll Run",
      message: `Approve "${selectedRun?.periodLabel}"? This will finalise the payroll. Net payable: LKR ${fmt(selectedRun?.totalNet ?? 0)}.`,
      label: "Yes, Approve",
    },
    CANCEL: {
      variant: "danger",
      title: "Cancel Payroll Run",
      message: `Cancel "${selectedRun?.periodLabel}"? This will discard the draft run.`,
      label: "Yes, Cancel",
    },
    VOID: {
      variant: "danger",
      title: "Void Payroll Run",
      message: `Void "${selectedRun?.periodLabel}"? This will reverse the approved payroll run.`,
      label: "Yes, Void",
    },
  };

  const meta = confirmType ? confirmMeta[confirmType] : null;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold">Payroll Runs</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage monthly payroll processing
          </p>
        </div>
        {canCreate && (
          <Button
            variant="solid"
            color="primary"
            icon={<Plus size={16} />}
            onClick={() => setCreateOpen(true)}
          >
            New Payroll Run
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Status</th>
                  <th className="text-right">Total Gross</th>
                  <th className="text-right">Deductions</th>
                  <th className="text-right">Net Pay</th>
                  <th>Processed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-gray-400">
                      No payroll runs yet.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <div className="font-medium">{run.periodLabel}</div>
                        <div className="text-xs text-gray-400">
                          {run.periodStart} → {run.periodEnd}
                        </div>
                      </td>
                      <td>
                        <span className={statusBadge(run.status)}>
                          {run.status}
                        </span>
                      </td>
                      <td className="text-right font-mono text-sm">
                        {fmt(run.totalGross)}
                      </td>
                      <td className="text-right font-mono text-sm text-red-500">
                        {fmt(run.totalDeductions)}
                      </td>
                      <td className="text-right font-mono text-sm font-semibold text-green-600">
                        {fmt(run.totalNet)}
                      </td>
                      <td className="text-sm text-gray-400">
                        {run.processedAt
                          ? new Date(run.processedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          {(run.status === "Completed" ||
                            run.status === "Approved") && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                              title="View Payslips"
                              onClick={() =>
                                router.push(
                                  `/transactions/payroll-runs/${run.id}`,
                                )
                              }
                            >
                              <Eye size={15} />
                            </button>
                          )}
                          {canProcess && run.status === "Draft" && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
                              title="Process"
                              onClick={() => openConfirm(run, "PROCESS")}
                            >
                              <Play size={15} />
                            </button>
                          )}
                          {canApprove && run.status === "Completed" && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500"
                              title="Approve"
                              onClick={() => openConfirm(run, "APPROVE")}
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                          {run.status === "Draft" && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                              title="Cancel"
                              onClick={() => openConfirm(run, "CANCEL")}
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                          {canVoid && run.status === "Approved" && (
                            <button
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400"
                              title="Void"
                              onClick={() => openConfirm(run, "VOID")}
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        width={560}
      >
        <h5 className="mb-1 font-semibold">New Payroll Run</h5>
        <p className="text-sm text-gray-400 mb-5">
          Create a new payroll run for a pay period
        </p>
        <div className="space-y-4">
          <div>
            <label className="form-label">
              Period Label <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. June 2026"
              value={periodLabel}
              onChange={(e) => setPeriodLabel(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Period Start <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">
                Period End <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <Input
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            loading={saving}
            onClick={handleCreate}
          >
            Create Run
          </Button>
        </div>
      </Dialog>

      {/* Confirm Dialog */}
      {meta && (
        <ConfirmDialog
          open={!!confirmType}
          variant={meta.variant}
          title={meta.title}
          message={meta.message}
          confirmLabel={meta.label}
          cancelLabel="Cancel"
          loading={confirming}
          onConfirm={handleConfirm}
          onCancel={() => {
            setConfirmType(null);
            setSelectedRun(null);
          }}
        />
      )}
    </div>
  );
}
