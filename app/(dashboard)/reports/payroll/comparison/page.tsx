"use client";
import { useState } from "react";
import ReportPage from "@/components/reports/ReportPage";
import { usePayrollRuns } from "@/hooks/usePayrollRuns";
import { usePermission } from "@/hooks/usePermission";

const COLS = [
  { header: "Emp Code",   field: "employeeCode" },
  { header: "Name",       field: "fullName" },
  { header: "Department", field: "department" },
  { header: "Gross A",    field: "grossA",        align: "right" as const, format: "money" as const },
  { header: "Gross B",    field: "grossB",        align: "right" as const, format: "money" as const },
  { header: "Gross Var",  field: "grossVariance", align: "right" as const, format: "money" as const },
  { header: "Net A",      field: "netA",          align: "right" as const, format: "money" as const },
  { header: "Net B",      field: "netB",          align: "right" as const, format: "money" as const },
  { header: "Net Var",    field: "netVariance",   align: "right" as const, format: "money" as const },
];

export default function ComparisonReportPage() {
  usePermission("Reports.Comparison.View");
  const runs = usePayrollRuns();
  const [runIdA, setA] = useState("");
  const [runIdB, setB] = useState("");

  return (
    <ReportPage
      title="Payroll Comparison Report"
      description="Side-by-side comparison of two payroll runs"
      permissionKey="Reports.Comparison.View"
      endpoint="reports/comparison"
      columns={COLS}
      params={{ runIdA, runIdB }}
      filters={
        <>
          <div className="flex flex-col gap-1">
            <label className="form-label">Period A</label>
            <select className="input w-48" value={runIdA} onChange={e => setA(e.target.value)}>
              <option value="">Select run…</option>
              {runs.map(r => <option key={r.id} value={r.id}>{r.periodLabel}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="form-label">Period B</label>
            <select className="input w-48" value={runIdB} onChange={e => setB(e.target.value)}>
              <option value="">Select run…</option>
              {runs.map(r => <option key={r.id} value={r.id}>{r.periodLabel}</option>)}
            </select>
          </div>
        </>
      }
    />
  );
}
