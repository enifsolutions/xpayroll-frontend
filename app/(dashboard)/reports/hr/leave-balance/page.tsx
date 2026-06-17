"use client";
import { useState } from "react";
import ReportPage from "@/components/reports/ReportPage";
import { usePermission } from "@/hooks/usePermission";

const COLS = [
  { header: "Emp Code",    field: "employeeCode" },
  { header: "Name",        field: "fullName" },
  { header: "Branch",      field: "branch" },
  { header: "Department",  field: "department" },
  { header: "Leave Type",  field: "leaveType" },
  { header: "Entitled",    field: "entitled",      align: "right" as const, format: "number" as const },
  { header: "Carried Fwd", field: "carriedForward",align: "right" as const, format: "number" as const },
  { header: "Used",        field: "used",          align: "right" as const, format: "number" as const },
  { header: "Remaining",   field: "remaining",     align: "right" as const, format: "number" as const },
];

export default function LeaveBalancePage() {
  usePermission("Reports.LeaveBalance.View");
  const [year, setYear] = useState(2026);

  return (
    <ReportPage
      title="Leave Balance Report"
      description="Leave entitlement, usage and remaining balances per employee"
      permissionKey="Reports.LeaveBalance.View"
      endpoint="reports/leave-balance"
      columns={COLS}
      params={{ year }}
      filters={
        <div className="flex flex-col gap-1">
          <label className="form-label">Year</label>
          <input type="number" className="input w-28" value={year} min={2020} max={2035}
            onChange={e => setYear(Number(e.target.value))} />
        </div>
      }
    />
  );
}
