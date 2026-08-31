"use client";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  CheckCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface SystemAlert {
  id: string;
  alertType: string;
  severity: string;
  referenceDate: string | null;
  title: string;
  message: string;
  detail: string | null;
  affectedCount: number;
  status: string;
  acknowledgedBy: string | null;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

const severityBadge = (s: string) => {
  const map: Record<string, string> = {
    Critical: "xp-badge xp-badge-danger",
    Warning: "xp-badge xp-badge-warning",
    Info: "xp-badge xp-badge-info",
  };
  return map[s] ?? "xp-badge xp-badge-neutral";
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    Open: "xp-badge xp-badge-danger",
    Acknowledged: "xp-badge xp-badge-warning",
    Resolved: "xp-badge xp-badge-success",
  };
  return map[s] ?? "xp-badge xp-badge-neutral";
};

const SeverityIcon = ({ severity }: { severity: string }) => {
  if (severity === "Critical")
    return <AlertCircle size={18} className="text-rose-500 shrink-0" />;
  if (severity === "Warning")
    return <AlertTriangle size={18} className="text-amber-500 shrink-0" />;
  return <Info size={18} className="text-blue-500 shrink-0" />;
};

export default function SystemAlertsPage() {
  useRequirePermission(Permissions.SystemAdmin.Alerts.View);
  const canAck = usePermission(Permissions.SystemAdmin.Alerts.Acknowledge);

  const initialized = useRef(false);
  const [items, setItems] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("Open");
  const [expanded, setExpanded] = useState<string | null>(null);

  const [confirmItem, setConfirmItem] = useState<SystemAlert | null>(null);
  const [confirmAction, setConfirmAction] = useState<"ACKNOWLEDGE" | "RESOLVE" | null>(null);
  const [acting, setActing] = useState(false);

  const load = async (status = statusFilter) => {
    setLoading(true);
    try {
      const res = await api.get("system-alerts", {
        params: status ? { status } : {},
      });
      setItems(res.data ?? []);
    } catch {
      showError("Error", "Failed to load system alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFilter = (s: string) => {
    setStatusFilter(s);
    load(s);
  };

  const openConfirm = (item: SystemAlert, action: "ACKNOWLEDGE" | "RESOLVE") => {
    setConfirmItem(item);
    setConfirmAction(action);
  };

  const handleAction = async () => {
    if (!confirmItem || !confirmAction) return;
    setActing(true);
    try {
      await api.post("system-alerts/action", {
        id: confirmItem.id,
        action: confirmAction,
      });
      showSuccess(
        confirmAction === "ACKNOWLEDGE" ? "Acknowledged" : "Resolved",
        "Alert updated",
      );
      setConfirmItem(null);
      setConfirmAction(null);
      load();
    } catch (e: any) {
      showError("Action failed", e?.response?.data?.error ?? "Failed to update alert");
    } finally {
      setActing(false);
    }
  };

  const parseDetail = (detail: string | null) => {
    if (!detail) return null;
    try {
      return JSON.parse(detail);
    } catch {
      return null;
    }
  };

  const openCount = items.filter((i) => i.status === "Open").length;
  const criticalCount = items.filter(
    (i) => i.severity === "Critical" && i.status === "Open",
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold">System Alerts</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Data-integrity and operational warnings that need attention
          </p>
        </div>
        <Button
          variant="plain"
          icon={<RefreshCw size={15} />}
          onClick={() => load()}
        >
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="card-body flex items-center gap-4 py-4">
            <div className="w-11 h-11 rounded-xl bg-rose-500 flex items-center justify-center">
              <AlertCircle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Critical (Open)</p>
              <p className="text-xl font-bold">{criticalCount}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4 py-4">
            <div className="w-11 h-11 rounded-xl bg-amber-400 flex items-center justify-center">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Open Alerts</p>
              <p className="text-xl font-bold">{openCount}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body flex items-center gap-4 py-4">
            <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center">
              <Info size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Showing</p>
              <p className="text-xl font-bold">{items.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {["Open", "Acknowledged", "Resolved", ""].map((s) => (
          <button
            key={s || "all"}
            onClick={() => changeFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              statusFilter === s
                ? "bg-primary text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Check size={40} className="mx-auto text-emerald-500 mb-3" />
              <p className="text-gray-500">
                No {statusFilter ? statusFilter.toLowerCase() : ""} alerts. All clear.
              </p>
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Alert</th>
                  <th>Date</th>
                  <th className="text-center">Affected</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const detail = parseDetail(item.detail);
                  const isOpen = expanded === item.id;
                  return (
                    <>
                      <tr
                        key={item.id}
                        className="cursor-pointer"
                        onClick={() => setExpanded(isOpen ? null : item.id)}
                      >
                        <td>
                          <SeverityIcon severity={item.severity} />
                        </td>
                        <td>
                          <div className="text-sm font-medium">{item.title}</div>
                          <div className="text-xs text-gray-400">{item.alertType}</div>
                        </td>
                        <td className="text-sm">
                          {item.referenceDate ?? "—"}
                        </td>
                        <td className="text-center text-sm tabular-nums">
                          {item.affectedCount}
                        </td>
                        <td>
                          <span className={severityBadge(item.severity)}>
                            {item.severity}
                          </span>
                        </td>
                        <td>
                          <span className={statusBadge(item.status)}>
                            {item.status}
                          </span>
                          {item.acknowledgedByName && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              by {item.acknowledgedByName}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpanded(isOpen ? null : item.id);
                              }}
                              title="View details"
                            >
                              <Eye size={15} />
                            </button>
                            {canAck && item.status === "Open" && (
                              <button
                                className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openConfirm(item, "ACKNOWLEDGE");
                                }}
                                title="Acknowledge"
                              >
                                <Check size={15} />
                              </button>
                            )}
                            {canAck && item.status !== "Resolved" && (
                              <button
                                className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openConfirm(item, "RESOLVE");
                                }}
                                title="Resolve"
                              >
                                <CheckCircle size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${item.id}-detail`}>
                          <td colSpan={7} className="bg-gray-50 dark:bg-gray-800/50">
                            <div className="p-4 text-sm">
                              <p className="mb-3">{item.message}</p>
                              {detail && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {Object.entries(detail).map(([k, v]) => (
                                    <div key={k}>
                                      <p className="text-xs text-gray-400">{k}</p>
                                      <p className="font-mono text-xs break-all">
                                        {typeof v === "object"
                                          ? JSON.stringify(v)
                                          : String(v)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-gray-400 mt-3">
                                Raised {new Date(item.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmItem}
        variant={confirmAction === "RESOLVE" ? "info" : "warning"}
        title={
          confirmAction === "RESOLVE" ? "Resolve Alert" : "Acknowledge Alert"
        }
        message={
          confirmAction === "RESOLVE"
            ? `Mark "${confirmItem?.title}" as resolved? Do this once the underlying problem is actually fixed — the daily check will re-open it if the problem is still present.`
            : `Acknowledge "${confirmItem?.title}"? This marks it as seen and being worked on, and stops it appearing in reminder emails.`
        }
        confirmLabel={confirmAction === "RESOLVE" ? "Yes, Resolve" : "Yes, Acknowledge"}
        loading={acting}
        onConfirm={handleAction}
        onCancel={() => {
          setConfirmItem(null);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
