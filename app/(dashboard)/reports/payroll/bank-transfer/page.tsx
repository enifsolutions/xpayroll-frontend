"use client";
import { useState } from "react";
import ReportPage from "@/components/reports/ReportPage";
import { usePayrollRuns } from "@/hooks/usePayrollRuns";
import { usePermission } from "@/hooks/usePermission";

const COLS = [
  { header: "Emp Code",    field: "employeeCode" },
  { header: "Name",        field: "fullName" },
  { header: "Branch",      field: "branch" },
  { header: "Department",  field: "department" },
  { header: "Bank",        field: "bankName" },
  { header: "Bank Branch", field: "bankBranch" },
  { header: "Account No.", field: "accountNumber" },
  { header: "Acc. Type",   field: "accountType" },
  { header: "Net Salary",  field: "netSalary", align: "right" as const, format: "money" as const },
];

export default function BankTransferReportPage() {
  usePermission("Reports.BankTransfer.View");
  const runs = usePayrollRuns();
  const [runId, setRunId] = useState("");

  return (
    <ReportPage
      title="Bank Transfer Report"
      description="Employee bank accounts and net salaries for a payroll run"
      permissionKey="Reports.BankTransfer.View"
      endpoint={`reports/bank-transfer/${runId || "0"}`}
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
