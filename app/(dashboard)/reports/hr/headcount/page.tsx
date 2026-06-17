"use client";
import { useState } from "react";
import ReportPage from "@/components/reports/ReportPage";
import { usePermission } from "@/hooks/usePermission";

const today = new Date().toISOString().split("T")[0];
const fom   = today.slice(0, 8) + "01";

const COLS = [
  { header: "Branch",      field: "branch" },
  { header: "Department",  field: "department" },
  { header: "Active",      field: "active",     align: "right" as const, format: "number" as const },
  { header: "Probation",   field: "probation",  align: "right" as const, format: "number" as const },
  { header: "On Leave",    field: "onLeave",    align: "right" as const, format: "number" as const },
  { header: "New Joiners", field: "newJoiners", align: "right" as const, format: "number" as const },
  { header: "Leavers",     field: "leavers",    align: "right" as const, format: "number" as const },
  { header: "Total",       field: "total",      align: "right" as const, format: "number" as const },
];

export default function HeadcountPage() {
  usePermission("Reports.Headcount.View");
  const [from, setFrom] = useState(fom);
  const [to,   setTo]   = useState(today);

  return (
    <ReportPage
      title="Headcount Report"
      description="Employee headcount by branch and department"
      permissionKey="Reports.Headcount.View"
      endpoint="reports/headcount"
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
