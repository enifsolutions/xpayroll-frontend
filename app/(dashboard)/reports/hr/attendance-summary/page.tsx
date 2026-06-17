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
  { header: "Present",    field: "presentDays",   align: "right" as const, format: "number" as const },
  { header: "Absent",     field: "absentDays",    align: "right" as const, format: "number" as const },
  { header: "Late Days",  field: "lateDays",      align: "right" as const, format: "number" as const },
  { header: "No-Pay",     field: "noPayDays",     align: "right" as const, format: "number" as const },
  { header: "Hours",      field: "totalHours",    align: "right" as const, format: "number" as const },
  { header: "OT Hours",   field: "overtimeHours", align: "right" as const, format: "number" as const },
  { header: "Late Mins",  field: "lateMinutes",   align: "right" as const, format: "number" as const },
];

export default function AttendanceSummaryPage() {
  usePermission("Reports.Attendance.View");
  const [from, setFrom] = useState(fom);
  const [to,   setTo]   = useState(today);

  return (
    <ReportPage
      title="Attendance Summary Report"
      description="Present, absent, late and overtime summary per employee"
      permissionKey="Reports.Attendance.View"
      endpoint="reports/attendance-summary"
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
