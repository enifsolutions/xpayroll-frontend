"use client";

import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import api from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { showError } from "@/lib/toast";
import { statusBadgeClass, statusLabel } from "@/utils/leaveRequestUtils";
import type { LeaveRequest } from "@/types/leaveRequest.types";
import LeaveRequestDetailDialog from "./LeaveRequestDetailDialog";

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "" },
  { label: "Pending", value: "Pending" },
  { label: "Sup. Approved", value: "SupervisorApproved" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
  { label: "Cancelled", value: "Cancelled" },
];

export default function LeaveRequestsPage() {
  useRequirePermission("Leave.Request.View");

  const initialized = useRef(false);

  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(
    new Date().getFullYear().toString(),
  );

  const [detailDialog, setDetailDialog] = useState(false);
  const [detailItem, setDetailItem] = useState<LeaveRequest | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { year: yearFilter };
      if (statusFilter) params.status = statusFilter;
      const res = await api.get("/leave-requests", { params });
      setItems(
        res.data.map((r: LeaveRequest) => ({
          ...r,
          id: String(r.id),
          employeeId: String(r.employeeId),
        })),
      );
    } catch {
      showError("Load Failed", "Could not load leave requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      load();
    }
  }, []);

  useEffect(() => {
    load();
  }, [statusFilter, yearFilter]);

  function openDetail(item: LeaveRequest) {
    setDetailItem(item);
    setDetailDialog(true);
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 4 }, (_, i) =>
    (currentYear - i).toString(),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="mb-1">Leave Requests</h3>
          <p className="text-sm text-gray-500">
            Review and approve employee leave applications.
          </p>
        </div>
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
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-white border-primary"
                  : "border-gray-200 hover:border-primary hover:text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
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
                  <th>Status</th>
                  <th>Applied On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400">
                      No leave requests found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="heading-text font-medium">
                          {item.employeeName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {item.employeeCode} · {item.department}
                        </div>
                      </td>
                      <td>{item.leaveTypeName}</td>
                      <td>{item.fromDate}</td>
                      <td>{item.toDate}</td>
                      <td>{item.days}</td>
                      <td>
                        <span className={statusBadgeClass(item.status)}>
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => openDetail(item)}
                          className="p-1.5 rounded-lg hover:bg-gray-100"
                          title="View details"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <LeaveRequestDetailDialog
        item={detailItem}
        isOpen={detailDialog}
        onClose={() => setDetailDialog(false)}
        onActionDone={() => {
          setDetailDialog(false);
          load();
        }}
      />
    </div>
  );
}
