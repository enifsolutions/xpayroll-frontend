"use client";
import { useState } from "react";
import ReportPage from "@/components/reports/ReportPage";
import { usePermission } from "@/hooks/usePermission";

const today = new Date().toISOString().split("T")[0];
const foy   = today.slice(0, 4) + "-01-01";

const COLS = [
  { header: "Leave Type",  field: "leaveType" },
  { header: "Branch",      field: "branch" },
  { header: "Department",  field: "department" },
  { header: "Requests",    field: "requestCount",  align: "right" as const, format: "number" as const },
  { header: "Days Taken",  field: "totalDays",     align: "right" as const, format: "number" as const },
  { header: "Employees",   field: "employeeCount", align: "right" as const, format: "number" as const },
];

export default function LeaveUtilisationPage() {
  usePermission("Reports.LeaveUtil.View");
  const [from, setFrom] = useState(foy);
  const [to,   setTo]   = useState(today);

  return (
    <ReportPage
      title="Leave Utilisation Report"
      description="Approved leave grouped by type and department"
      permissionKey="Reports.LeaveUtil.View"
      endpoint="reports/leave-utilisation"
      columns={COLS}
      params={{ fromDate: from, toDate: to }}
      filters={
        <>
          <div className="flex flex-col gap-1">
            <label className="form-label">From</label>
            <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="form-label">To</label>
            <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
          </div>
        </>
      }
    />
  );
}
