"use client";
import { useState } from "react";
import ReportPage from "@/components/reports/ReportPage";
import { usePermission } from "@/hooks/usePermission";

const today = new Date().toISOString().split("T")[0];
const fom   = today.slice(0, 8) + "01";

const COLS = [
  { header: "Emp Code",   field: "employeeCode" },
  { header: "Name",       field: "fullName" },
  { header: "Branch",     field: "branch" },
  { header: "Department", field: "department" },
  { header: "OT Days",    field: "otDays",       align: "right" as const, format: "number" as const },
  { header: "OT Hours",   field: "totalOtHours", align: "right" as const, format: "number" as const },
];

export default function OvertimePage() {
  usePermission("Reports.Overtime.View");
  const [from, setFrom] = useState(fom);
  const [to,   setTo]   = useState(today);

  return (
    <ReportPage
      title="Overtime Report"
      description="Employees with overtime hours in the selected date range"
      permissionKey="Reports.Overtime.View"
      endpoint="reports/overtime"
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
