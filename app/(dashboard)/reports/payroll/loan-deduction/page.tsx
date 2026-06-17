"use client";
import { useState } from "react";
import ReportPage from "@/components/reports/ReportPage";
import { usePayrollRuns } from "@/hooks/usePayrollRuns";
import { usePermission } from "@/hooks/usePermission";

const COLS = [
  { header: "Emp Code",    field: "employeeCode" },
  { header: "Name",        field: "fullName" },
  { header: "Department",  field: "department" },
  { header: "Principal",   field: "principalAmount",    align: "right" as const, format: "money" as const },
  { header: "Installment", field: "monthlyInstallment", align: "right" as const, format: "money" as const },
  { header: "Paid",        field: "paidInstallments",   align: "right" as const, format: "number" as const },
  { header: "Total",       field: "totalInstallments",  align: "right" as const, format: "number" as const },
  { header: "Outstanding", field: "outstandingBalance", align: "right" as const, format: "money" as const },
  { header: "This Run",    field: "deductedThisRun",    align: "right" as const, format: "money" as const },
  { header: "Progress",    field: "progressPct",        align: "right" as const, format: "pct" as const },
];

export default function LoanDeductionReportPage() {
  usePermission("Reports.LoanDeduction.View");
  const runs = usePayrollRuns();
  const [runId, setRunId] = useState("");

  return (
    <ReportPage
      title="Loan Deduction Report"
      description="Active employee loans and deductions for a payroll run"
      permissionKey="Reports.LoanDeduction.View"
      endpoint={`reports/loan-deduction/${runId || "0"}`}
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
