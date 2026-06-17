"use client";
import { useState } from "react";
import ReportPage from "@/components/reports/ReportPage";
import { usePayrollRuns } from "@/hooks/usePayrollRuns";
import { usePermission } from "@/hooks/usePermission";

const COLS = [
  { header: "Branch",        field: "branch" },
  { header: "Department",    field: "department" },
  { header: "Employees",     field: "employeeCount",    align: "right" as const, format: "number" as const },
  { header: "Basic",         field: "totalBasic",       align: "right" as const, format: "money" as const },
  { header: "Allowances",    field: "totalAllowances",  align: "right" as const, format: "money" as const },
  { header: "Gross",         field: "totalGross",       align: "right" as const, format: "money" as const },
  { header: "EPF (EE)",      field: "totalEpfEmployee", align: "right" as const, format: "money" as const },
  { header: "EPF (ER)",      field: "totalEpfEmployer", align: "right" as const, format: "money" as const },
  { header: "ETF",           field: "totalEtf",         align: "right" as const, format: "money" as const },
  { header: "Net",           field: "totalNet",         align: "right" as const, format: "money" as const },
  { header: "Employer Cost", field: "totalEmployerCost",align: "right" as const, format: "money" as const },
];

export default function CostCentreReportPage() {
  usePermission("Reports.CostCentre.View");
  const runs = usePayrollRuns();
  const [runId, setRunId] = useState("");

  return (
    <ReportPage
      title="Cost Centre Report"
      description="Payroll cost grouped by branch and department"
      permissionKey="Reports.CostCentre.View"
      endpoint={`reports/cost-centre/${runId || "0"}`}
      columns={COLS}
      params={{}}
      filters={
        <div className="flex flex-col gap-1">
          <label className="form-label">Payroll Run</label>
          <select className="input w-56" value={runId} onChange={e => setRunId(e.target.value)}>
            <option value="">Select run…</option>
            {runs.map(r => <option key={r.id} value={r.id}>{r.periodLabel}</option>)}
          </select>
        </div>
      }
    />
  );
}
